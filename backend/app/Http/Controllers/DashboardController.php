<?php

namespace App\Http\Controllers;

use App\Enums\TimesheetStatus;
use App\Enums\UserStatus;
use App\Models\Department;
use App\Models\KpiAssignment;
use App\Models\Timesheet;
use App\Models\TimeEntry;
use App\Models\User;
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

        $employees = $this->scopedEmployees($requester, $isOrgWide);
        [$periodStart, $periodEnd] = $this->resolvePeriod($request);

        $hoursSummaries = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);
        $departmentIds = $this->relevantDepartmentIds($employees, $requester, $isOrgWide);
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
            'department_performance' => $this->departmentPerformance($departmentIds, $employees, $hoursSummaries),
            'pending_approvals' => Timesheet::whereIn('user_id', $employees->pluck('id'))
                ->where('status', TimesheetStatus::Submitted)
                ->count(),
            'kpi_completion_rates' => $this->kpiCompletionRates($departmentIds),
            'attendance_trends' => $this->attendanceTrends($employees, $periodStart, $periodEnd),
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
     * @return Collection<int, User>
     */
    private function scopedEmployees(User $requester, bool $isOrgWide): Collection
    {
        if ($isOrgWide) {
            return User::where('status', UserStatus::Active)->with('department')->get();
        }

        if ($requester->isSupervisor() && $requester->department_id) {
            return User::where('status', UserStatus::Active)
                ->where('department_id', $requester->department_id)
                ->with('department')
                ->get();
        }

        abort(403, 'You do not have a dashboard to view.');
    }

    /**
     * @param  Collection<int, User>  $employees
     * @return array<int, int>
     */
    private function relevantDepartmentIds(Collection $employees, User $requester, bool $isOrgWide): array
    {
        if ($isOrgWide) {
            return $employees->pluck('department_id')->filter()->unique()->values()->all();
        }

        return $requester->department_id ? [$requester->department_id] : [];
    }

    /**
     * @param  array<int, int>  $departmentIds
     * @param  Collection<int, User>  $employees
     * @param  Collection<int, array<string, mixed>>  $hoursSummaries
     * @return Collection<int, array<string, mixed>>
     */
    private function departmentPerformance(array $departmentIds, Collection $employees, Collection $hoursSummaries): Collection
    {
        $departmentNames = Department::whereIn('id', $departmentIds)->pluck('name', 'id');
        $employeesById = $employees->keyBy('id');
        $kpiRates = $this->kpiCompletionRates($departmentIds);

        return collect($departmentIds)->map(function (int $departmentId) use ($departmentNames, $employeesById, $hoursSummaries, $kpiRates) {
            $deptUserIds = $employeesById->where('department_id', $departmentId)->pluck('id');
            $deptSummaries = $hoursSummaries->whereIn('user_id', $deptUserIds);
            $deptKpiRates = $kpiRates->where('department_id', $departmentId);

            return [
                'department_id' => $departmentId,
                'department_name' => $departmentNames->get($departmentId),
                'approved_minutes' => (int) $deptSummaries->sum('approved_minutes'),
                'average_kpi_completion_rate' => $deptKpiRates->isEmpty()
                    ? null
                    : round((float) $deptKpiRates->avg('completion_rate'), 2),
            ];
        })->values();
    }

    /**
     * @param  array<int, int>  $departmentIds
     * @return Collection<int, array<string, mixed>>
     */
    private function kpiCompletionRates(array $departmentIds): Collection
    {
        return KpiAssignment::with(['kpi', 'user', 'department'])
            ->whereHas('kpi', fn ($q) => $q->whereNotNull('target_value'))
            ->get()
            ->filter(fn (KpiAssignment $assignment) => in_array($assignment->scopedDepartmentId(), $departmentIds, true))
            ->map(fn (KpiAssignment $assignment) => [
                'kpi_assignment_id' => $assignment->id,
                'department_id' => $assignment->scopedDepartmentId(),
                'kpi_name' => $assignment->kpi->name,
                'target' => (float) $assignment->kpi->target_value,
                'progress' => (float) $assignment->progress_value,
                'completion_rate' => round(((float) $assignment->progress_value / (float) $assignment->kpi->target_value) * 100, 2),
                'assignee' => $assignment->user?->name ?? ($assignment->department?->name.' (department)'),
            ])
            ->values();
    }

    /**
     * @param  Collection<int, User>  $employees
     * @return Collection<int, array<string, mixed>>
     */
    private function attendanceTrends(Collection $employees, Carbon $periodStart, Carbon $periodEnd): Collection
    {
        $userIds = $employees->pluck('id');

        $countsByDate = TimeEntry::whereIn('user_id', $userIds)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()
            ->groupBy(fn (TimeEntry $entry) => $entry->date->toDateString())
            ->map(fn (Collection $entries) => $entries->pluck('user_id')->unique()->count());

        $trend = collect();
        $cursor = $periodStart->copy();

        while ($cursor->lte($periodEnd)) {
            $dateString = $cursor->toDateString();
            $trend->push(['date' => $dateString, 'employee_count' => $countsByDate->get($dateString, 0)]);
            $cursor->addDay();
        }

        return $trend;
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
