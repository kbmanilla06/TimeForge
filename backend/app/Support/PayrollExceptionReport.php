<?php

namespace App\Support;

use App\Enums\TimesheetStatus;
use App\Models\AttendanceSession;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Detects payroll problems before export (Sprint 50) — read-only. Never
 * changes the payroll formula, never auto-corrects data, never notifies
 * anyone. Reuses HoursSummaryCalculator's existing overtime computation
 * rather than reimplementing it; adds two new targeted queries for the
 * two gaps HoursSummaryCalculator silently skips (attendance with no
 * time entries, time entries never submitted).
 *
 * Only employees with at least one triggered exception are returned —
 * this is a problems list, not a full roster.
 */
final class PayrollExceptionReport
{
    /**
     * @param  Collection<int, User>  $employees
     * @return Collection<int, array<string, mixed>>
     */
    public static function build(Collection $employees, Carbon $periodStart, Carbon $periodEnd): Collection
    {
        $periodStartDate = $periodStart->toDateString();
        $periodEndDate = $periodEnd->toDateString();
        $overtimeThresholdMinutes = (float) config('payroll.overtime_exception_threshold_hours') * 60;

        $overtimeMinutesByUser = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd)
            ->keyBy('user_id')
            ->map(fn (array $summary) => (int) $summary['overtime_minutes']);

        $timesheetsByUser = Timesheet::whereBetween('date', [$periodStartDate, $periodEndDate])
            ->whereIn('status', [TimesheetStatus::Submitted, TimesheetStatus::Rejected, TimesheetStatus::RevisionRequested])
            ->get()
            ->groupBy('user_id');

        $attendanceDatesByUser = AttendanceSession::whereBetween('date', [$periodStartDate, $periodEndDate])
            ->get()
            ->groupBy('user_id')
            ->map(fn (Collection $sessions) => $sessions->pluck('date')->map->toDateString());

        $timeEntriesByUser = TimeEntry::whereBetween('date', [$periodStartDate, $periodEndDate])
            ->get()
            ->groupBy('user_id');

        return $employees
            ->map(function (User $employee) use (
                $overtimeMinutesByUser,
                $timesheetsByUser,
                $attendanceDatesByUser,
                $timeEntriesByUser,
                $overtimeThresholdMinutes,
            ) {
                $timesheets = $timesheetsByUser->get($employee->id, collect());
                $attendanceDates = $attendanceDatesByUser->get($employee->id, collect());
                $entries = $timeEntriesByUser->get($employee->id, collect());
                $entryDates = $entries->pluck('date')->map->toDateString()->unique();
                $overtimeMinutes = $overtimeMinutesByUser->get($employee->id, 0);

                $exceptions = [
                    'missing_hourly_rate' => $employee->hourly_rate === null,
                    'unapproved_submitted_count' => $timesheets
                        ->where('status', TimesheetStatus::Submitted)
                        ->count(),
                    'rejected_or_revision_count' => $timesheets
                        ->whereIn('status', [TimesheetStatus::Rejected, TimesheetStatus::RevisionRequested])
                        ->count(),
                    'attendance_without_entries_days' => $attendanceDates
                        ->reject(fn (string $date) => $entryDates->contains($date))
                        ->count(),
                    'entries_without_submission_days' => $entries
                        ->whereNull('timesheet_id')
                        ->pluck('date')
                        ->map->toDateString()
                        ->unique()
                        ->count(),
                    'overtime_over_threshold' => $overtimeMinutes > $overtimeThresholdMinutes,
                    'overtime_hours' => round($overtimeMinutes / 60, 2),
                ];

                $hasAnyException = $exceptions['missing_hourly_rate']
                    || $exceptions['unapproved_submitted_count'] > 0
                    || $exceptions['rejected_or_revision_count'] > 0
                    || $exceptions['attendance_without_entries_days'] > 0
                    || $exceptions['entries_without_submission_days'] > 0
                    || $exceptions['overtime_over_threshold'];

                return [
                    'user_id' => $employee->id,
                    'name' => $employee->name,
                    'department' => $employee->department?->name,
                    ...$exceptions,
                    'has_any_exception' => $hasAnyException,
                ];
            })
            ->filter(fn (array $row) => $row['has_any_exception'])
            ->values();
    }
}
