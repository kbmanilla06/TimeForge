<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Models\User;
use App\Support\ExcelExporter;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollPeriod;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeamHoursReportController extends Controller
{
    public function exportPdf(Request $request): Response
    {
        [$periodStart, $periodEnd] = $this->resolvePeriod($request);
        $rows = $this->buildSummary($request, $periodStart, $periodEnd);

        return Pdf::loadView('reports.team-hours', [
            'rows' => $rows,
            'periodStart' => $periodStart->toDateString(),
            'periodEnd' => $periodEnd->toDateString(),
            'generatedAt' => now()->toDateTimeString(),
        ])->download('team-hours-report.pdf');
    }

    public function exportExcel(Request $request): StreamedResponse
    {
        [$periodStart, $periodEnd] = $this->resolvePeriod($request);

        $rows = $this->buildSummary($request, $periodStart, $periodEnd)
            ->map(fn (array $row) => [
                $row['name'],
                $row['department'] ?? '',
                round($row['approved_minutes'] / 60, 2),
                round($row['overtime_minutes'] / 60, 2),
                round($row['pending_minutes'] / 60, 2),
                round($row['rejected_minutes'] / 60, 2),
                $row['attendance_days'],
            ])
            ->all();

        return ExcelExporter::download(
            'Team Hours Report',
            ['Employee', 'Department', 'Approved Hrs', 'Overtime Hrs', 'Pending Hrs', 'Rejected Hrs', 'Attendance'],
            $rows,
            'team-hours-report.xlsx',
        );
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
     * @return Collection<int, array<string, mixed>>
     */
    private function buildSummary(Request $request, Carbon $periodStart, Carbon $periodEnd): Collection
    {
        $requester = $request->user();

        if ($requester->isAdmin() || $requester->isHrFinance()) {
            $employees = User::where('status', UserStatus::Active)->get();
        } elseif ($requester->isSupervisor() && $requester->department_id) {
            $employees = User::where('status', UserStatus::Active)
                ->where('department_id', $requester->department_id)
                ->get();
        } else {
            abort(403, 'You do not have a team to report on.');
        }

        return HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);
    }
}
