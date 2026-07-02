<?php

namespace App\Ai\SourceData;

use App\Models\User;
use App\Support\HoursSummaryCalculator;
use App\Support\PayrollPeriod;
use Illuminate\Support\Carbon;

/**
 * One user's approved/overtime/pending minutes and attendance days for
 * each semi-monthly period in the resolved window (six periods, per the
 * approved Sprint 12 trend-window decision), with consecutive-period
 * deltas and the net first-to-last change — arithmetic only, never
 * judgments.
 */
final class ProductivityTrendAnalysisGatherer
{
    /**
     * @return array<string, mixed>
     */
    public function gather(User $user, Carbon $windowStart, Carbon $windowEnd): array
    {
        $user->loadMissing('department');

        $periods = [];
        $previousApproved = null;
        $cursor = $windowStart->copy();

        while ($cursor->lte($windowEnd)) {
            [$periodStart, $periodEnd] = PayrollPeriod::resolve($cursor);
            $summary = HoursSummaryCalculator::summarizeForUsers(collect([$user]), $periodStart, $periodEnd)->first();

            $periods[] = [
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
                'approved_minutes' => $summary['approved_minutes'],
                'overtime_minutes' => $summary['overtime_minutes'],
                'pending_minutes' => $summary['pending_minutes'],
                'attendance_days' => $summary['attendance_days'],
                'change_from_previous_minutes' => $previousApproved === null
                    ? null
                    : $summary['approved_minutes'] - $previousApproved,
            ];

            $previousApproved = $summary['approved_minutes'];
            $cursor = $periodEnd->copy()->addDay();
        }

        $first = $periods[0];
        $last = $periods[count($periods) - 1];

        return [
            'user_name' => $user->name,
            'window_start' => $windowStart->toDateString(),
            'window_end' => $windowEnd->toDateString(),
            'periods' => $periods,
            'net_change_minutes' => $last['approved_minutes'] - $first['approved_minutes'],
            'first_period_approved_minutes' => $first['approved_minutes'],
            'last_period_approved_minutes' => $last['approved_minutes'],
        ];
    }
}
