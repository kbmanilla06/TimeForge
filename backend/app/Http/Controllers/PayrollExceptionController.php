<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\ExcelExporter;
use App\Support\PayrollExceptionReport;
use App\Support\PayrollPeriod;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Read-only payroll problem detection before export (Sprint 50) — never
 * changes the payroll formula, never auto-corrects data, never notifies
 * anyone automatically. Mirrors PayrollController's structure exactly
 * (same access rule, same period resolution).
 */
class PayrollExceptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorizeView($request);

        $rows = $this->buildExceptionReport($this->resolvePeriod($request));

        return response()->json($rows->values());
    }

    public function exportPdf(Request $request): Response
    {
        $this->authorizeView($request);

        [$periodStart, $periodEnd] = $this->resolvePeriod($request);
        $rows = $this->buildExceptionReport([$periodStart, $periodEnd]);

        AuditLog::record('payroll_exceptions.exported', metadata: [
            'format' => 'pdf',
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ]);

        return Pdf::loadView('reports.payroll-exceptions', [
            'rows' => $rows,
            'periodStart' => $periodStart->toDateString(),
            'periodEnd' => $periodEnd->toDateString(),
            'generatedAt' => now()->toDateTimeString(),
        ])->download('payroll-exceptions-report.pdf');
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        $this->authorizeView($request);

        [$periodStart, $periodEnd] = $this->resolvePeriod($request);

        AuditLog::record('payroll_exceptions.exported', metadata: [
            'format' => 'excel',
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ]);

        $rows = $this->buildExceptionReport([$periodStart, $periodEnd])
            ->map(fn (array $row) => [
                $row['name'],
                $row['department'] ?? '',
                $row['missing_hourly_rate'] ? 'Yes' : '',
                $row['unapproved_submitted_count'],
                $row['rejected_or_revision_count'],
                $row['attendance_without_entries_days'],
                $row['entries_without_submission_days'],
                $row['overtime_over_threshold'] ? $row['overtime_hours'] : '',
            ])
            ->all();

        return ExcelExporter::download(
            'Payroll Exceptions',
            ['Employee', 'Department', 'Missing Rate', 'Unapproved Submitted', 'Rejected/Revision', 'Attendance w/o Entries', 'Entries w/o Submission', 'Overtime Over Threshold (Hrs)'],
            $rows,
            'payroll-exceptions-report.xlsx',
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
    private function buildExceptionReport(array $period): Collection
    {
        [$periodStart, $periodEnd] = $period;

        $employees = User::where('status', UserStatus::Active)->with('department')->get();

        return PayrollExceptionReport::build($employees, $periodStart, $periodEnd);
    }
}
