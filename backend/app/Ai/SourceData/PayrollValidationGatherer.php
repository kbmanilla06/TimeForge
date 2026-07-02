<?php

namespace App\Ai\SourceData;

use App\Enums\TimesheetStatus;
use App\Enums\UserStatus;
use App\Models\TimeEntry;
use App\Models\User;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollFigures;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Organization-wide, facts-only payroll checks for one payroll period
 * (per the approved Sprint 12 decisions): missing hourly rates, period
 * totals, hours not yet payroll-ready, unsubmitted days, open timers, and
 * the largest approved day. No thresholds, scores, or judgments — those
 * would be invented business rules.
 */
final class PayrollValidationGatherer
{
    /**
     * @return array<string, mixed>
     */
    public function gather(Carbon $periodStart, Carbon $periodEnd): array
    {
        $employees = User::where('status', UserStatus::Active)->with('department')->get();
        $summaries = HoursSummaryCalculator::summarizeForUsers($employees, $periodStart, $periodEnd);
        $overtimeMultiplier = (float) config('payroll.overtime_multiplier');
        $employeesById = $employees->keyBy('id');

        $rows = $summaries->map(
            fn (array $summary) => PayrollFigures::withPayrollFigures($summary, $employeesById->get($summary['user_id']), $overtimeMultiplier)
        );

        $entries = TimeEntry::with(['timesheet', 'user:id,name'])
            ->whereIn('user_id', $employees->pluck('id'))
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        $unsubmitted = $entries->filter(fn (TimeEntry $entry) => $entry->timesheet_id === null);
        $openTimers = $entries->filter(fn (TimeEntry $entry) => $entry->end_time === null);

        $largestApprovedDay = $entries
            ->filter(fn (TimeEntry $entry) => $entry->timesheet?->status === TimesheetStatus::Approved)
            ->groupBy(fn (TimeEntry $entry) => $entry->user_id.'|'.$entry->date->toDateString())
            ->map(fn (Collection $dayEntries) => [
                'name' => $dayEntries->first()->user->name,
                'date' => $dayEntries->first()->date->toDateString(),
                'minutes' => (int) $dayEntries->sum('duration_minutes'),
            ])
            ->sortByDesc('minutes')
            ->first();

        return [
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'active_employee_count' => $employees->count(),
            'total_regular_minutes' => (int) $rows->sum('regular_minutes'),
            'total_overtime_minutes' => (int) $rows->sum('overtime_minutes'),
            'total_estimated_payroll' => round((float) $rows->sum(fn (array $row) => $row['estimated_payroll'] ?? 0), 2),
            'employees_missing_rate' => $rows
                ->filter(fn (array $row) => $row['hourly_rate'] === null && $row['approved_minutes'] > 0)
                ->pluck('name')
                ->values()
                ->all(),
            'pending_minutes' => (int) $rows->sum('pending_minutes'),
            'rejected_minutes' => (int) $rows->sum('rejected_minutes'),
            'unsubmitted_day_count' => $unsubmitted
                ->groupBy(fn (TimeEntry $entry) => $entry->user_id.'|'.$entry->date->toDateString())
                ->count(),
            'employees_with_unsubmitted_days' => $unsubmitted->pluck('user.name')->unique()->values()->all(),
            'open_timer_count' => $openTimers->count(),
            'employees_with_open_timers' => $openTimers->pluck('user.name')->unique()->values()->all(),
            'largest_approved_day' => $largestApprovedDay,
        ];
    }
}
