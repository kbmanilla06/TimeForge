<?php

namespace App\Http\Controllers;

use App\Enums\TimesheetStatus;
use App\Models\Timesheet;
use App\Models\TimeEntry;
use App\Models\User;
use App\Support\DashboardMetrics;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollFigures;
use App\Support\PayrollPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $requester = $request->user();
        $isOrgWide = $requester->isAdmin() || $requester->isHrFinance();

        $employees = DashboardMetrics::scopedEmployees($requester, $isOrgWide);
        [$periodStart, $periodEnd] = $this->resolvePeriod($request);

        $hoursSummaries = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);
        $departmentIds = DashboardMetrics::relevantDepartmentIds($employees, $requester, $isOrgWide);
        $billable = $this->billableSplit($employees, $periodStart, $periodEnd);

        $payload = [
            'scope' => $isOrgWide ? 'organization' : 'department',
            'department_name' => $isOrgWide ? null : $requester->department?->name,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'total_hours_minutes' => (int) $hoursSummaries->sum('approved_minutes'),
            'employee_productivity' => $hoursSummaries->map(fn (array $s) => [
                'user_id' => $s['user_id'],
                'name' => $s['name'],
                'department' => $s['department'],
                'approved_minutes' => $s['approved_minutes'],
            ])->values(),
            'department_performance' => DashboardMetrics::departmentPerformance($departmentIds, $employees, $hoursSummaries),
            'pending_approvals' => Timesheet::whereIn('user_id', $employees->pluck('id'))
                ->where('status', TimesheetStatus::Submitted)
                ->count(),
            'kpi_completion_rates' => DashboardMetrics::kpiCompletionRates($departmentIds),
            'attendance_trends' => DashboardMetrics::attendanceTrends($employees, $periodStart, $periodEnd),
            'billable_minutes' => $billable['billable'],
            'non_billable_minutes' => $billable['non_billable'],
            'project_allocation' => $this->projectAllocation($employees, $periodStart, $periodEnd),
        ];

        if ($isOrgWide) {
            $payload['payroll_summary'] = $this->payrollSummary($employees, $hoursSummaries);
        }

        return response()->json($payload);
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
     * @param  Collection<int, User>  $employees
     * @return array{billable: int, non_billable: int}
     */
    private function billableSplit(Collection $employees, Carbon $periodStart, Carbon $periodEnd): array
    {
        $approvedEntries = $this->approvedEntries($employees, $periodStart, $periodEnd);

        $billableMinutes = (int) $approvedEntries
            ->filter(fn (TimeEntry $entry) => $entry->project_id !== null || $entry->client_id !== null)
            ->sum('duration_minutes');

        $nonBillableMinutes = (int) $approvedEntries
            ->filter(fn (TimeEntry $entry) => $entry->project_id === null && $entry->client_id === null)
            ->sum('duration_minutes');

        return ['billable' => $billableMinutes, 'non_billable' => $nonBillableMinutes];
    }

    /**
     * @param  Collection<int, User>  $employees
     * @return Collection<int, array<string, mixed>>
     */
    private function projectAllocation(Collection $employees, Carbon $periodStart, Carbon $periodEnd): Collection
    {
        return $this->approvedEntries($employees, $periodStart, $periodEnd)
            ->filter(fn (TimeEntry $entry) => $entry->project_id !== null)
            ->groupBy('project_id')
            ->map(fn (Collection $entries, $projectId) => [
                'project_id' => (int) $projectId,
                'project_name' => $entries->first()->project?->name ?? 'Unknown',
                'approved_minutes' => (int) $entries->sum('duration_minutes'),
            ])
            ->values();
    }

    /**
     * @param  Collection<int, User>  $employees
     * @return Collection<int, TimeEntry>
     */
    private function approvedEntries(Collection $employees, Carbon $periodStart, Carbon $periodEnd): Collection
    {
        return TimeEntry::with(['project', 'timesheet'])
            ->whereIn('user_id', $employees->pluck('id'))
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()
            ->filter(fn (TimeEntry $entry) => $entry->timesheet !== null && $entry->timesheet->status === TimesheetStatus::Approved);
    }

    /**
     * @param  Collection<int, User>  $employees
     * @param  Collection<int, array<string, mixed>>  $hoursSummaries
     * @return array<string, mixed>
     */
    private function payrollSummary(Collection $employees, Collection $hoursSummaries): array
    {
        $overtimeMultiplier = (float) config('payroll.overtime_multiplier');
        $employeesById = $employees->keyBy('id');

        $rows = $hoursSummaries->map(
            fn (array $summary) => PayrollFigures::withPayrollFigures($summary, $employeesById->get($summary['user_id']), $overtimeMultiplier)
        );

        return [
            'total_estimated_payroll' => round((float) $rows->sum(fn (array $r) => $r['estimated_payroll'] ?? 0), 2),
            'total_regular_minutes' => (int) $rows->sum('regular_minutes'),
            'total_overtime_minutes' => (int) $rows->sum('overtime_minutes'),
            'employees_with_rate_count' => $rows->filter(fn (array $r) => $r['hourly_rate'] !== null)->count(),
            'employees_without_rate_count' => $rows->filter(fn (array $r) => $r['hourly_rate'] === null)->count(),
        ];
    }
}
