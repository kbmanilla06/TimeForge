<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Models\User;
use App\Support\ExcelExporter;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollPeriod;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
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
     * Team-wide approved-minutes trend across the six consecutive
     * semi-monthly payroll periods ending with the period containing the
     * reference date — the same window/period rule already approved and
     * used by the Sprint 12 productivity-trend AI gatherer, applied here to
     * the reviewer's whole scoped team instead of one user.
     */
    public function trend(Request $request): JsonResponse
    {
        $employees = $this->scopedEmployees($request);
        $referenceDate = $request->filled('date') ? Carbon::parse($request->query('date')) : Carbon::today();

        [$windowStart] = $this->trailingPeriodStart($referenceDate, 6);

        $periods = [];
        $cursor = $windowStart->copy();

        while ($cursor->lte($referenceDate)) {
            [$periodStart, $periodEnd] = PayrollPeriod::resolve($cursor);
            $summary = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);

            $periods[] = [
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'approved_minutes' => (int) $summary->sum('approved_minutes'),
            ];

            $cursor = $periodEnd->copy()->addDay();
        }

        return response()->json($periods);
    }

    /**
     * @return array{0: Carbon}
     */
    private function trailingPeriodStart(Carbon $referenceDate, int $periodCount): array
    {
        $cursor = $referenceDate->copy();

        for ($i = 1; $i < $periodCount; $i++) {
            [$periodStart] = PayrollPeriod::resolve($cursor);
            $cursor = $periodStart->copy()->subDay();
        }

        [$windowStart] = PayrollPeriod::resolve($cursor);

        return [$windowStart];
    }

    /**
     * @return Collection<int, User>
     */
    private function scopedEmployees(Request $request): Collection
    {
        $requester = $request->user();

        if ($requester->isAdmin() || $requester->isHrFinance()) {
            return User::where('status', UserStatus::Active)->get();
        }

        if ($requester->isSupervisor() && $requester->department_id) {
            return User::where('status', UserStatus::Active)
                ->where('department_id', $requester->department_id)
                ->get();
        }

        abort(403, 'You do not have a team to report on.');
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
        return HoursSummaryCalculator::summarizeForUsers($this->scopedEmployees($request), $periodStart, $periodEnd);
    }
}
