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
    case KpiPerformanceAnalysis = 'kpi_performance_analysis';
    case PayrollValidation = 'payroll_validation';
    case SupervisorRecommendations = 'supervisor_recommendations';
    case ProductivityTrendAnalysis = 'productivity_trend_analysis';

    /**
     * What this output is about, per the approved Sprint 12 subject-shape
     * decisions. Drives request validation, authorization, and storage.
     */
    public function subjectShape(): AiSubjectShape
    {
        return match ($this) {
            self::DailyWorkSummary,
            self::WeeklyProductivityReport,
            self::ProductivityTrendAnalysis => AiSubjectShape::User,
            self::RecurringBlockers,
            self::KpiPerformanceAnalysis,
            self::SupervisorRecommendations => AiSubjectShape::Department,
            self::PayrollValidation => AiSubjectShape::Organization,
        };
    }

    /**
     * The stored period for a given reference date: the day itself, the ISO
     * Monday-Sunday week containing it, the existing semi-monthly payroll
     * period, or (for trend analysis) the six consecutive semi-monthly
     * periods ending with the reference date's period — per the approved
     * Sprint 11/12 decisions; no new period concept exists.
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
            self::RecurringBlockers,
            self::KpiPerformanceAnalysis,
            self::PayrollValidation,
            self::SupervisorRecommendations => PayrollPeriod::resolve($date),
            self::ProductivityTrendAnalysis => self::trendWindow($date),
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

    /**
     * Six consecutive semi-monthly periods ending with the one containing
     * the reference date (approved Sprint 12 trend-window decision).
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private static function trendWindow(Carbon $date): array
    {
        [$start, $end] = PayrollPeriod::resolve($date);

        for ($i = 1; $i < 6; $i++) {
            [$start] = PayrollPeriod::resolve($start->copy()->subDay());
        }

        return [$start, $end];
    }
}
