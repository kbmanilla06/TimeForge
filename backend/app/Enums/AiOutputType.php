<?php

namespace App\Enums;

use App\Support\PayrollPeriod;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

enum AiOutputType: string
{
    case DailyWorkSummary = 'daily_work_summary';
    case WeeklyProductivityReport = 'weekly_productivity_report';
    case RecurringBlockers = 'recurring_blockers';

    /**
     * Whether this output is about a single user (vs. a department).
     */
    public function subjectIsUser(): bool
    {
        return $this !== self::RecurringBlockers;
    }

    /**
     * The stored period for a given reference date: the day itself, the ISO
     * Monday-Sunday week containing it, or the existing semi-monthly payroll
     * period (per the approved Sprint 11 decisions — no new period concept).
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public function resolvePeriod(Carbon $date): array
    {
        return match ($this) {
            self::DailyWorkSummary => [$date->copy()->startOfDay(), $date->copy()->startOfDay()],
            self::WeeklyProductivityReport => [
                $date->copy()->startOfWeek(CarbonInterface::MONDAY),
                $date->copy()->endOfWeek(CarbonInterface::SUNDAY),
            ],
            self::RecurringBlockers => PayrollPeriod::resolve($date),
        };
    }

    /**
     * Versioned template identifier stored with every output so a future
     * template/prompt change is distinguishable in the audit trail.
     */
    public function promptVersion(): string
    {
        return $this->value.'.v1';
    }
}
