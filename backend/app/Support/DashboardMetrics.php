<?php

namespace App\Support;

use App\Enums\UserStatus;
use App\Models\Department;
use App\Models\KpiAssignment;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Scoped employee resolution, department performance, KPI completion
 * rates, and attendance trends — extracted from DashboardController
 * (Sprint 10) so DashboardController and AiAssistantController (Sprint 28)
 * share one implementation instead of duplicating these queries.
 */
final class DashboardMetrics
{
    /**
     * @return Collection<int, User>
     */
    public static function scopedEmployees(User $requester, bool $isOrgWide): Collection
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
    public static function relevantDepartmentIds(Collection $employees, User $requester, bool $isOrgWide): array
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
    public static function departmentPerformance(array $departmentIds, Collection $employees, Collection $hoursSummaries): Collection
    {
        $departmentNames = Department::whereIn('id', $departmentIds)->pluck('name', 'id');
        $employeesById = $employees->keyBy('id');
        $kpiRates = self::kpiCompletionRates($departmentIds);

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
    public static function kpiCompletionRates(array $departmentIds): Collection
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
    public static function attendanceTrends(Collection $employees, Carbon $periodStart, Carbon $periodEnd): Collection
    {
        $userIds = $employees->pluck('id');

        $countsByDate = TimeEntry::whereIn('user_id', $userIds)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()
            ->groupBy(fn ($entry) => $entry->date->toDateString())
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
}
