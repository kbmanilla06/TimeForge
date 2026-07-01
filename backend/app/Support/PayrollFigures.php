<?php

namespace App\Support;

use App\Models\User;

/**
 * Layers hourly-rate/estimated-payroll math on top of an
 * HoursSummaryCalculator summary row. Extracted from PayrollController
 * (Sprint 8/9) so PayrollController and DashboardController's payroll
 * summary metric share one implementation instead of duplicating it.
 */
final class PayrollFigures
{
    /**
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    public static function withPayrollFigures(array $summary, User $employee, float $overtimeMultiplier): array
    {
        $hourlyRate = $employee->hourly_rate !== null ? (float) $employee->hourly_rate : null;
        $regularHours = $summary['regular_minutes'] / 60;
        $overtimeHours = $summary['overtime_minutes'] / 60;

        $estimatedPayroll = $hourlyRate !== null
            ? round(($regularHours * $hourlyRate) + ($overtimeHours * $hourlyRate * $overtimeMultiplier), 2)
            : null;

        return [
            'user_id' => $summary['user_id'],
            'name' => $summary['name'],
            'department' => $summary['department'],
            'hourly_rate' => $hourlyRate,
            'approved_minutes' => $summary['approved_minutes'],
            'regular_minutes' => $summary['regular_minutes'],
            'overtime_minutes' => $summary['overtime_minutes'],
            'pending_minutes' => $summary['pending_minutes'],
            'rejected_minutes' => $summary['rejected_minutes'],
            'attendance_days' => $summary['attendance_days'],
            'estimated_payroll' => $estimatedPayroll,
            'period_start' => $summary['period_start'],
            'period_end' => $summary['period_end'],
        ];
    }
}
