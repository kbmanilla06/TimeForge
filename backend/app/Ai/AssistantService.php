<?php

namespace App\Ai;

use App\Enums\AssistantCategory;
use App\Models\DailyScrum;
use App\Models\TimeEntry;
use App\Models\User;
use App\Support\DashboardMetrics;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollPeriod;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Builds the AI Assistant's structured answer for one matched category
 * (Sprint 28). Fully local and deterministic — every sentence, chart
 * point, and table row is mechanically derived from already-scoped,
 * already-computed records (DashboardMetrics, HoursSummaryCalculator),
 * exactly like StubAiProvider's report templates. No external calls.
 */
final class AssistantService
{
    /**
     * @return array<string, mixed>
     */
    public function answer(AssistantCategory $category, User $requester, bool $isOrgWide): array
    {
        $employees = DashboardMetrics::scopedEmployees($requester, $isOrgWide);
        [$periodStart, $periodEnd] = PayrollPeriod::resolve(Carbon::today());
        $departmentIds = DashboardMetrics::relevantDepartmentIds($employees, $requester, $isOrgWide);

        return match ($category) {
            AssistantCategory::TeamProgress => $this->teamProgress($employees, $departmentIds, $periodStart, $periodEnd),
            AssistantCategory::DepartmentProductivity => $this->departmentProductivity($employees, $departmentIds, $periodStart, $periodEnd, $isOrgWide),
            AssistantCategory::AttendanceTrend => $this->attendanceTrend($employees, $periodStart, $periodEnd),
            AssistantCategory::ScrumSummary => $this->scrumSummary($employees),
            AssistantCategory::BehindSchedule => $this->behindSchedule($employees, $periodStart, $periodEnd),
            AssistantCategory::KpiFurthestBelowTarget => $this->kpiFurthestBelowTarget($departmentIds),
            AssistantCategory::Unsupported => $this->unsupported(),
        };
    }

    /**
     * @param  Collection<int, User>  $employees
     * @param  array<int, int>  $departmentIds
     * @return array<string, mixed>
     */
    private function teamProgress(Collection $employees, array $departmentIds, Carbon $periodStart, Carbon $periodEnd): array
    {
        $summaries = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);
        $totalMinutes = (int) $summaries->sum('approved_minutes');
        $kpiRates = DashboardMetrics::kpiCompletionRates($departmentIds);
        $zeroHours = $summaries->filter(fn (array $s) => $s['approved_minutes'] === 0);

        return [
            'executive_summary' => sprintf(
                '%s logged %s of approved work between %s and %s, across %s.',
                $this->pluralize($summaries->count(), 'employee', 'employees'),
                $this->minutes($totalMinutes),
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
                $kpiRates->isEmpty() ? 'no KPI assignments with a target' : $this->pluralize($kpiRates->count(), 'KPI assignment', 'KPI assignments'),
            ),
            'detail' => $kpiRates->isEmpty()
                ? 'No KPI assignments with a numeric target are in scope for this period.'
                : sprintf('Average KPI completion across scope: %s%%.', $this->number((float) $kpiRates->avg('completion_rate'))),
            'chart' => $this->barChart('Approved Hours', $summaries->map(fn (array $s) => [
                'label' => $s['name'],
                'value' => round($s['approved_minutes'] / 60, 2),
            ])->all()),
            'table' => [
                'columns' => ['Employee', 'Approved Hours'],
                'rows' => $summaries->map(fn (array $s) => [$s['name'], round($s['approved_minutes'] / 60, 2)])->all(),
            ],
            'recommendations' => $zeroHours->isEmpty()
                ? []
                : ['Follow up with '.$zeroHours->pluck('name')->implode(', ').' — no approved hours this period.'],
        ];
    }

    /**
     * @param  Collection<int, User>  $employees
     * @param  array<int, int>  $departmentIds
     * @return array<string, mixed>
     */
    private function departmentProductivity(Collection $employees, array $departmentIds, Carbon $periodStart, Carbon $periodEnd, bool $isOrgWide): array
    {
        $summaries = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);
        $rows = DashboardMetrics::departmentPerformance($departmentIds, $employees, $summaries)
            ->sortByDesc('approved_minutes')
            ->values();

        $top = $rows->first();

        return [
            'executive_summary' => match (true) {
                $rows->isEmpty() => 'No departments are in scope.',
                ! $isOrgWide => sprintf(
                    'You can only compare within your own department. %s logged %s this period.',
                    $top['department_name'] ?? 'Your department',
                    $this->minutes($top['approved_minutes']),
                ),
                default => sprintf(
                    '%s has the highest productivity this period, with %s approved.',
                    $top['department_name'] ?? 'Unassigned',
                    $this->minutes($top['approved_minutes']),
                ),
            },
            'detail' => $rows->isEmpty() ? 'No approved hours are recorded for any department this period.' : sprintf(
                'Ranked by approved hours across %s.',
                $this->pluralize($rows->count(), 'department', 'departments'),
            ),
            'chart' => $this->barChart('Approved Hours', $rows->map(fn (array $r) => [
                'label' => $r['department_name'] ?? 'Unassigned',
                'value' => round($r['approved_minutes'] / 60, 2),
            ])->all()),
            'table' => [
                'columns' => ['Department', 'Approved Hours', 'Avg KPI Completion %'],
                'rows' => $rows->map(fn (array $r) => [
                    $r['department_name'] ?? 'Unassigned',
                    round($r['approved_minutes'] / 60, 2),
                    $r['average_kpi_completion_rate'] ?? '—',
                ])->all(),
            ],
            'recommendations' => [],
        ];
    }

    /**
     * @param  Collection<int, User>  $employees
     * @return array<string, mixed>
     */
    private function attendanceTrend(Collection $employees, Carbon $periodStart, Carbon $periodEnd): array
    {
        $trend = DashboardMetrics::attendanceTrends($employees, $periodStart, $periodEnd);
        $zeroDays = $trend->filter(fn (array $point) => $point['employee_count'] === 0);

        return [
            'executive_summary' => sprintf(
                'Attendance trend for %s to %s across %s.',
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
                $this->pluralize($employees->count(), 'employee', 'employees'),
            ),
            'detail' => $zeroDays->isEmpty()
                ? 'Every day in this period had at least one employee logging time.'
                : sprintf('%s had no employees logging time.', $this->pluralize($zeroDays->count(), 'day', 'days')),
            'chart' => $this->lineChart('Employees Logging Time', $trend->map(fn (array $p) => [
                'label' => $p['date'],
                'value' => $p['employee_count'],
            ])->all()),
            'table' => [
                'columns' => ['Date', 'Employees Logging Time'],
                'rows' => $trend->map(fn (array $p) => [$p['date'], $p['employee_count']])->all(),
            ],
            'recommendations' => [],
        ];
    }

    /**
     * @param  Collection<int, User>  $employees
     * @return array<string, mixed>
     */
    private function scrumSummary(Collection $employees): array
    {
        $today = Carbon::today()->toDateString();
        $memberIds = $employees->pluck('id');

        $scrums = DailyScrum::with('user:id,name')
            ->whereIn('user_id', $memberIds)
            ->whereDate('date', $today)
            ->orderBy('user_id')
            ->get();

        $submittedIds = $scrums->pluck('user_id')->unique();
        $missing = $employees->reject(fn (User $employee) => $submittedIds->contains($employee->id));
        $withBlockers = $scrums->filter(fn (DailyScrum $scrum) => filled($scrum->blockers));

        return [
            'executive_summary' => sprintf(
                '%s of %s submitted today\'s scrum (%s); %s reported.',
                $scrums->count(),
                $employees->count(),
                $today,
                $this->pluralize($withBlockers->count(), 'blocker', 'blockers'),
            ),
            'detail' => $missing->isEmpty()
                ? 'Every team member has submitted today\'s scrum.'
                : 'Not yet submitted: '.$missing->pluck('name')->implode(', ').'.',
            'chart' => null,
            'table' => [
                'columns' => ['Employee', 'Yesterday', 'Today', 'Blockers'],
                'rows' => $scrums->map(fn (DailyScrum $scrum) => [
                    $scrum->user?->name ?? "User #{$scrum->user_id}",
                    $scrum->previous_work,
                    $scrum->planned_work,
                    $scrum->blockers ?? 'None reported',
                ])->all(),
            ],
            'recommendations' => $withBlockers->isEmpty() ? [] : $withBlockers->map(
                fn (DailyScrum $scrum) => sprintf('Address blocker from %s: %s', $scrum->user?->name ?? "User #{$scrum->user_id}", $scrum->blockers)
            )->all(),
        ];
    }

    /**
     * Reuses the exact "unsubmitted day" concept SupervisorRecommendationsGatherer
     * already computes per department, applied to whichever employee set
     * (department or organization) is already scoped for this requester.
     *
     * @param  Collection<int, User>  $employees
     * @return array<string, mixed>
     */
    private function behindSchedule(Collection $employees, Carbon $periodStart, Carbon $periodEnd): array
    {
        $entries = TimeEntry::with('user:id,name')
            ->whereIn('user_id', $employees->pluck('id'))
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get();

        $unsubmitted = $entries->filter(fn (TimeEntry $entry) => $entry->timesheet_id === null);

        $byEmployee = $unsubmitted
            ->groupBy('user_id')
            ->map(fn (Collection $entriesForUser) => [
                'name' => $entriesForUser->first()->user?->name ?? "User #{$entriesForUser->first()->user_id}",
                'unsubmitted_days' => $entriesForUser->pluck('date')->map(fn ($date) => $date->toDateString())->unique()->count(),
            ])
            ->sortByDesc('unsubmitted_days')
            ->values();

        return [
            'executive_summary' => $byEmployee->isEmpty()
                ? 'No employees have unsubmitted logged days this period — nobody is behind schedule.'
                : sprintf('%s have at least one unsubmitted logged day this period.', $this->pluralize($byEmployee->count(), 'employee', 'employees')),
            'detail' => '"Behind schedule" is defined here as having logged time with no submitted timesheet for one or more days this period.',
            'chart' => $byEmployee->isEmpty() ? null : $this->barChart('Unsubmitted Days', $byEmployee->map(fn (array $row) => [
                'label' => $row['name'],
                'value' => $row['unsubmitted_days'],
            ])->all()),
            'table' => [
                'columns' => ['Employee', 'Unsubmitted Days'],
                'rows' => $byEmployee->map(fn (array $row) => [$row['name'], $row['unsubmitted_days']])->all(),
            ],
            'recommendations' => $byEmployee->isEmpty() ? [] : $byEmployee->map(
                fn (array $row) => sprintf('Follow up with %s — %s.', $row['name'], $this->pluralize($row['unsubmitted_days'], 'unsubmitted day', 'unsubmitted days'))
            )->all(),
        ];
    }

    /**
     * "Which KPIs declined this week?" can't be answered honestly — KPI
     * progress is an all-time running total with no automatic reversal and
     * no history (Sprint 6/25 decisions), so nothing can "decline." This
     * substitutes the nearest real, existing metric: KPIs furthest below
     * their target, ascending by completion_rate.
     *
     * @param  array<int, int>  $departmentIds
     * @return array<string, mixed>
     */
    private function kpiFurthestBelowTarget(array $departmentIds): array
    {
        $rates = DashboardMetrics::kpiCompletionRates($departmentIds)->sortBy('completion_rate')->values();

        return [
            'executive_summary' => "TimeForge doesn't track KPI progress history, so \"decline\" can't be measured — showing the KPIs furthest below their target instead.",
            'detail' => $rates->isEmpty()
                ? 'No KPI assignments with a numeric target are in scope.'
                : sprintf('Lowest completion rate in scope: %s%%.', $this->number((float) $rates->first()['completion_rate'])),
            'chart' => $rates->isEmpty() ? null : $this->barChart('Completion %', $rates->map(fn (array $r) => [
                'label' => $r['kpi_name'].' — '.$r['assignee'],
                'value' => $r['completion_rate'],
            ])->all()),
            'table' => [
                'columns' => ['KPI', 'Assignee', 'Progress', 'Target', 'Completion %'],
                'rows' => $rates->map(fn (array $r) => [$r['kpi_name'], $r['assignee'], $r['progress'], $r['target'], $r['completion_rate']])->all(),
            ],
            'recommendations' => $rates->where('completion_rate', '<', 50)->isEmpty() ? [] : [
                'Follow up on KPIs below 50% completion: '.$rates->where('completion_rate', '<', 50)
                    ->map(fn (array $r) => $r['kpi_name'].' — '.$r['assignee'])->implode('; ').'.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function unsupported(): array
    {
        return [
            'executive_summary' => "I can't answer that yet.",
            'detail' => 'Try one of the supported questions below.',
            'chart' => null,
            'table' => null,
            'recommendations' => [],
            'supported_examples' => AssistantCategory::supportedExamples(),
        ];
    }

    /**
     * @param  array<int, array{label: string, value: float|int}>  $points
     * @return array<string, mixed>
     */
    private function barChart(string $seriesLabel, array $points): array
    {
        return ['type' => 'bar', 'series_label' => $seriesLabel, 'points' => $points];
    }

    /**
     * @param  array<int, array{label: string, value: float|int}>  $points
     * @return array<string, mixed>
     */
    private function lineChart(string $seriesLabel, array $points): array
    {
        return ['type' => 'line', 'series_label' => $seriesLabel, 'points' => $points];
    }

    private function minutes(int $minutes): string
    {
        return sprintf('%dh %02dm', intdiv($minutes, 60), $minutes % 60);
    }

    private function number(float|int $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');
    }

    private function pluralize(int $count, string $singular, string $plural): string
    {
        return $count.' '.($count === 1 ? $singular : $plural);
    }
}
