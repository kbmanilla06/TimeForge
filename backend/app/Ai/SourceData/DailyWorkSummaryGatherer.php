<?php

namespace App\Ai\SourceData;

use App\Models\DailyScrum;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Collects everything stored about one user's single workday: time entries
 * (with project/client/KPI context), the day's timesheet status, and the
 * day's scrum entry. The returned array is both what the provider renders
 * and what is persisted as the output's audit snapshot.
 */
final class DailyWorkSummaryGatherer
{
    /**
     * @return array<string, mixed>
     */
    public function gather(User $user, Carbon $date): array
    {
        $entries = TimeEntry::with(['project', 'client', 'kpiAssignment.kpi'])
            ->where('user_id', $user->id)
            ->where('date', $date->toDateString())
            ->orderBy('start_time')
            ->orderBy('id')
            ->get();

        $timesheet = Timesheet::where('user_id', $user->id)
            ->where('date', $date->toDateString())
            ->first();

        $scrum = DailyScrum::where('user_id', $user->id)
            ->where('date', $date->toDateString())
            ->first();

        return [
            'user_name' => $user->name,
            'date' => $date->toDateString(),
            'total_minutes' => (int) $entries->sum('duration_minutes'),
            'entries' => $entries->map(fn (TimeEntry $entry) => [
                'task' => $entry->task,
                'work_category' => $entry->work_category,
                'task_status' => $entry->task_status,
                'duration_minutes' => (int) $entry->duration_minutes,
                'project' => $entry->project?->name,
                'client' => $entry->client?->name,
                'description' => $entry->description,
                'kpi_name' => $entry->kpiAssignment?->kpi?->name,
                'kpi_unit' => $entry->kpiAssignment?->kpi?->unit,
                'kpi_progress_value' => $entry->kpi_progress_value !== null ? (float) $entry->kpi_progress_value : null,
            ])->values()->all(),
            'timesheet_status' => $timesheet?->status->value,
            'scrum' => $scrum === null ? null : [
                'previous_work' => $scrum->previous_work,
                'planned_work' => $scrum->planned_work,
                'blockers' => $scrum->blockers,
                'notes' => $scrum->notes,
            ],
        ];
    }
}
