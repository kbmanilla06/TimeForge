<?php

namespace App\Ai\SourceData;

use App\Enums\TimesheetStatus;
use App\Enums\UserStatus;
use App\Models\Department;
use App\Models\KpiAssignment;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * The facts a supervisor can act on for one department and period —
 * pending reviews, stalled revisions, recurring blockers (reusing the
 * Sprint 11 gatherer's normalization), members with no logged time,
 * unsubmitted days, and KPI assignments lacking a target or any
 * progress. Each fact becomes one deterministic recommendation in the
 * template; nothing here is a judgment or score.
 */
final class SupervisorRecommendationsGatherer
{
    /**
     * @return array<string, mixed>
     */
    public function gather(Department $department, Carbon $periodStart, Carbon $periodEnd): array
    {
        $members = User::where('status', UserStatus::Active)
            ->where('department_id', $department->id)
            ->orderBy('id')
            ->get();
        $memberIds = $members->pluck('id');

        $timesheets = Timesheet::whereIn('user_id', $memberIds)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get();

        $pending = $timesheets->filter(fn (Timesheet $timesheet) => $timesheet->status === TimesheetStatus::Submitted);

        $entries = TimeEntry::with('user:id,name')
            ->whereIn('user_id', $memberIds)
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        $unsubmitted = $entries->filter(fn (TimeEntry $entry) => $entry->timesheet_id === null);
        $loggedUserIds = $entries->pluck('user_id')->unique();

        $blockers = (new RecurringBlockersGatherer)->gather($department, $periodStart, $periodEnd);

        $assignments = KpiAssignment::with(['kpi', 'user', 'department'])
            ->get()
            ->filter(fn (KpiAssignment $assignment) => $assignment->scopedDepartmentId() === $department->id)
            ->values();

        $label = fn (KpiAssignment $assignment) => $assignment->kpi->name.' — '
            .($assignment->user?->name ?? ($assignment->department?->name.' (department)'));

        return [
            'department_name' => $department->name,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'pending_review_count' => $pending->count(),
            'oldest_pending_date' => $pending->min(fn (Timesheet $timesheet) => $timesheet->date->toDateString()),
            'revision_requested_count' => $timesheets
                ->filter(fn (Timesheet $timesheet) => $timesheet->status === TimesheetStatus::RevisionRequested)
                ->count(),
            'recurring_blockers' => collect($blockers['recurring_blockers'])
                ->map(fn (array $blocker) => ['text' => $blocker['text'], 'occurrences' => $blocker['occurrences']])
                ->all(),
            'members_with_no_logged_time' => $members
                ->reject(fn (User $member) => $loggedUserIds->contains($member->id))
                ->pluck('name')
                ->values()
                ->all(),
            'unsubmitted_day_count' => $unsubmitted
                ->groupBy(fn (TimeEntry $entry) => $entry->user_id.'|'.$entry->date->toDateString())
                ->count(),
            'members_with_unsubmitted_days' => $unsubmitted->pluck('user.name')->unique()->values()->all(),
            'kpis_without_target' => $assignments
                ->filter(fn (KpiAssignment $assignment) => $assignment->kpi->target_value === null)
                ->map($label)
                ->values()
                ->all(),
            'kpis_with_zero_progress' => $assignments
                ->filter(fn (KpiAssignment $assignment) => (float) $assignment->progress_value === 0.0)
                ->map($label)
                ->values()
                ->all(),
        ];
    }
}
