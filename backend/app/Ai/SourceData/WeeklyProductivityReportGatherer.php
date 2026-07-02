<?php

namespace App\Ai\SourceData;

use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use App\Support\HoursSummaryCalculator;
use Illuminate\Support\Carbon;

/**
 * Collects one user's week: approved/pending/rejected/overtime buckets via
 * the existing HoursSummaryCalculator (Sprint 8/9), a per-day logged-minutes
 * breakdown covering all seven days, timesheet status counts, and the KPI
 * progress reported on the week's entries.
 */
final class WeeklyProductivityReportGatherer
{
    /**
     * @return array<string, mixed>
     */
    public function gather(User $user, Carbon $weekStart, Carbon $weekEnd): array
    {
        $user->loadMissing('department');

        $summary = HoursSummaryCalculator::summarizeForUsers(collect([$user]), $weekStart, $weekEnd)->first();

        $entries = TimeEntry::where('user_id', $user->id)
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get();

        $minutesByDate = $entries
            ->groupBy(fn (TimeEntry $entry) => $entry->date->toDateString())
            ->map(fn ($dateEntries) => (int) $dateEntries->sum('duration_minutes'));

        $dailyBreakdown = [];
        $cursor = $weekStart->copy();

        while ($cursor->lte($weekEnd)) {
            $dateString = $cursor->toDateString();
            $dailyBreakdown[] = ['date' => $dateString, 'logged_minutes' => $minutesByDate->get($dateString, 0)];
            $cursor->addDay();
        }

        $timesheetStatusCounts = Timesheet::where('user_id', $user->id)
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get()
            ->countBy(fn (Timesheet $timesheet) => $timesheet->status->value)
            ->all();

        $kpiEntries = $entries->filter(fn (TimeEntry $entry) => $entry->kpi_progress_value !== null);

        return [
            'user_name' => $user->name,
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'total_logged_minutes' => (int) $entries->sum('duration_minutes'),
            'approved_minutes' => $summary['approved_minutes'],
            'regular_minutes' => $summary['regular_minutes'],
            'overtime_minutes' => $summary['overtime_minutes'],
            'pending_minutes' => $summary['pending_minutes'],
            'rejected_minutes' => $summary['rejected_minutes'],
            'attendance_days' => $summary['attendance_days'],
            'daily_breakdown' => $dailyBreakdown,
            'timesheet_status_counts' => $timesheetStatusCounts,
            'kpi_progress_total' => (float) $kpiEntries->sum(fn (TimeEntry $entry) => (float) $entry->kpi_progress_value),
            'kpi_progress_entry_count' => $kpiEntries->count(),
        ];
    }
}
