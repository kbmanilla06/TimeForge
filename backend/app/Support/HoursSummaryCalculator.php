<?php

namespace App\Support;

use App\Enums\TimesheetStatus;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Computes per-employee approved/overtime/pending/rejected minutes and
 * attendance days for a resolved period. Extracted from
 * PayrollController (Sprint 8) so PayrollController (which layers
 * hourly-rate/estimated-payroll math on top) and TeamHoursReportController
 * (which never includes rate/payroll figures) share one implementation
 * instead of duplicating this bucketing logic.
 */
final class HoursSummaryCalculator
{
    /**
     * @param  Collection<int, User>  $users
     * @return Collection<int, array<string, mixed>>
     */
    public static function summarizeForUsers(Collection $users, Carbon $periodStart, Carbon $periodEnd): Collection
    {
        $entriesByUser = TimeEntry::with('timesheet')
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()
            ->groupBy('user_id');

        return $users->map(fn (User $user) => self::summarizeForEmployee(
            $user,
            $entriesByUser->get($user->id, collect()),
            $periodStart,
            $periodEnd,
        ))->values();
    }

    /**
     * @param  Collection<int, TimeEntry>  $entries
     * @return array<string, mixed>
     */
    public static function summarizeForEmployee(
        User $employee,
        Collection $entries,
        Carbon $periodStart,
        Carbon $periodEnd
    ): array {
        $byDate = $entries->groupBy(fn (TimeEntry $entry) => $entry->date->toDateString());

        $regularMinutes = 0;
        $overtimeMinutes = 0;
        $pendingMinutes = 0;
        $rejectedMinutes = 0;

        foreach ($byDate as $dateEntries) {
            $dailyMinutes = (int) $dateEntries->sum('duration_minutes');
            $timesheet = $dateEntries->first()->timesheet;

            if ($timesheet === null) {
                continue;
            }

            if ($timesheet->status === TimesheetStatus::Approved) {
                $regularMinutes += min($dailyMinutes, 480);
                $overtimeMinutes += max(0, $dailyMinutes - 480);
            } elseif (in_array($timesheet->status, [TimesheetStatus::Submitted, TimesheetStatus::RevisionRequested], true)) {
                $pendingMinutes += $dailyMinutes;
            } elseif ($timesheet->status === TimesheetStatus::Rejected) {
                $rejectedMinutes += $dailyMinutes;
            }
        }

        return [
            'user_id' => $employee->id,
            'name' => $employee->name,
            'department' => $employee->department?->name,
            'approved_minutes' => $regularMinutes + $overtimeMinutes,
            'regular_minutes' => $regularMinutes,
            'overtime_minutes' => $overtimeMinutes,
            'pending_minutes' => $pendingMinutes,
            'rejected_minutes' => $rejectedMinutes,
            'attendance_days' => $byDate->count(),
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ];
    }
}
