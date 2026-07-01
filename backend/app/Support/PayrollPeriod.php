<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Resolves the fixed, semi-monthly payroll period (1st-15th, 16th-end of
 * month) containing a given reference date. Extracted from
 * TimeEntryController (Sprint 4) so TimeEntryController::summary() and
 * PayrollController (Sprint 8) share one implementation.
 */
final class PayrollPeriod
{
    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    public static function resolve(Carbon $date): array
    {
        if ($date->day <= 15) {
            return [$date->copy()->startOfMonth(), $date->copy()->setDay(15)];
        }

        return [$date->copy()->setDay(16), $date->copy()->endOfMonth()];
    }
}
