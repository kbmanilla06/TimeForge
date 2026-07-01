<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Models\User;
use App\Support\ExcelExporter;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollFigures;
use App\Support\PayrollPeriod;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);

        $summaries = $this->buildPayrollSummary($this->resolvePeriod($request));

        return response()->json($summaries->values());
    }

    public function exportPdf(Request $request): Response
    {
        $this->authorizeView($request);

        [$periodStart, $periodEnd] = $this->resolvePeriod($request);
        $rows = $this->buildPayrollSummary([$periodStart, $periodEnd]);

        return Pdf::loadView('reports.payroll', [
            'rows' => $rows,
            'periodStart' => $periodStart->toDateString(),
            'periodEnd' => $periodEnd->toDateString(),
            'generatedAt' => now()->toDateTimeString(),
        ])->download('payroll-report.pdf');
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $this->authorizeView($request);

        $rows = $this->buildPayrollSummary($this->resolvePeriod($request))
            ->map(fn (array $row) => [
                $row['name'],
                $row['department'] ?? '',
                $row['hourly_rate'],
                round($row['approved_minutes'] / 60, 2),
                round($row['overtime_minutes'] / 60, 2),
                round($row['pending_minutes'] / 60, 2),
                round($row['rejected_minutes'] / 60, 2),
                $row['attendance_days'],
                $row['estimated_payroll'],
            ])
            ->all();

        return ExcelExporter::download(
            'Payroll Report',
            ['Employee', 'Department', 'Hourly Rate', 'Approved Hrs', 'Overtime Hrs', 'Pending Hrs', 'Rejected Hrs', 'Attendance', 'Estimated Payroll'],
            $rows,
            'payroll-report.xlsx',
        );
    }

    private function authorizeView(Request $request): void
    {
        $user = $request->user();

        if (! ($user->isAdmin() || $user->isHrFinance())) {
            abort(403, 'You are not authorized to view payroll data.');
        }
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function resolvePeriod(Request $request): array
    {
        $referenceDate = $request->filled('date') ? Carbon::parse($request->query('date')) : Carbon::today();

        return PayrollPeriod::resolve($referenceDate);
    }

    /**
     * @param  array{0: Carbon, 1: Carbon}  $period
     * @return Collection<int, array<string, mixed>>
     */
    private function buildPayrollSummary(array $period): Collection
    {
        [$periodStart, $periodEnd] = $period;
        $overtimeMultiplier = (float) config('payroll.overtime_multiplier');

        $employees = User::where('status', UserStatus::Active)->with('department')->get();

        return HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd)
            ->map(function (array $summary) use ($employees, $overtimeMultiplier) {
                $employee = $employees->firstWhere('id', $summary['user_id']);

                return PayrollFigures::withPayrollFigures($summary, $employee, $overtimeMultiplier);
            });
    }
}
