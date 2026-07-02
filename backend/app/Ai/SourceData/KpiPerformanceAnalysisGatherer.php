<?php

namespace App\Ai\SourceData;

use App\Models\Department;
use App\Models\KpiAssignment;
use App\Models\TimeEntry;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * One department's KPI picture: every assignment in department scope
 * (department-targeted plus its members' individual assignments, via the
 * same scopedDepartmentId() attribution the dashboard uses) with all-time
 * progress vs. target, plus the progress actually credited within the
 * period (applied entries only — kpi_progress_applied_at set). Facts
 * only; no "on track" judgments.
 */
final class KpiPerformanceAnalysisGatherer
{
    /**
     * @return array<string, mixed>
     */
    public function gather(Department $department, Carbon $periodStart, Carbon $periodEnd): array
    {
        $assignments = KpiAssignment::with(['kpi', 'user', 'department'])
            ->get()
            ->filter(fn (KpiAssignment $assignment) => $assignment->scopedDepartmentId() === $department->id)
            ->values();

        $creditedByAssignment = TimeEntry::whereIn('kpi_assignment_id', $assignments->pluck('id'))
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->whereNotNull('kpi_progress_applied_at')
            ->get()
            ->groupBy('kpi_assignment_id')
            ->map(fn (Collection $entries) => (float) $entries->sum(fn (TimeEntry $entry) => (float) $entry->kpi_progress_value));

        $mapped = $assignments->map(function (KpiAssignment $assignment) use ($creditedByAssignment) {
            $target = $assignment->kpi->target_value !== null ? (float) $assignment->kpi->target_value : null;
            $progress = (float) $assignment->progress_value;

            return [
                'kpi_name' => $assignment->kpi->name,
                'unit' => $assignment->kpi->unit,
                'assignee' => $assignment->user?->name ?? ($assignment->department?->name.' (department)'),
                'target' => $target,
                'progress' => $progress,
                'completion_rate' => $target !== null && $target > 0.0
                    ? round(($progress / $target) * 100, 2)
                    : null,
                'period_credited' => (float) ($creditedByAssignment->get($assignment->id) ?? 0.0),
            ];
        });

        return [
            'department_name' => $department->name,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'rated' => $mapped
                ->filter(fn (array $row) => $row['completion_rate'] !== null)
                ->sortByDesc('completion_rate')
                ->values()
                ->all(),
            'untargeted' => $mapped->filter(fn (array $row) => $row['completion_rate'] === null)->values()->all(),
            'zero_progress' => $mapped
                ->filter(fn (array $row) => $row['progress'] === 0.0)
                ->map(fn (array $row) => $row['kpi_name'].' — '.$row['assignee'])
                ->values()
                ->all(),
        ];
    }
}
