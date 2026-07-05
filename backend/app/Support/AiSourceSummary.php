<?php

namespace App\Support;

use App\Enums\AiOutputType;

/**
 * Derives a safe, human-readable "what data was used" summary from an
 * AiOutput's source_data (Sprint 51) — counts and categorical facts
 * only, never free text, raw values, or employee name lists. Callers
 * (AiOutputController::present()) already run the exact same
 * authorization check that gates the rest of the output, so this never
 * introduces a new exposure surface — it only decides what's safe to
 * show even to an already-authorized viewer.
 */
final class AiSourceSummary
{
    /**
     * @param  array<string, mixed>  $sourceData
     * @return array<string, mixed>
     */
    public static function summarize(AiOutputType $type, array $sourceData): array
    {
        return match ($type) {
            AiOutputType::DailyWorkSummary => [
                'entry_count' => count($sourceData['entries'] ?? []),
                'total_minutes' => $sourceData['total_minutes'] ?? 0,
                'timesheet_status' => $sourceData['timesheet_status'] ?? null,
                'has_scrum_entry' => ($sourceData['scrum'] ?? null) !== null,
            ],
            AiOutputType::WeeklyProductivityReport => [
                'days_with_entries' => collect($sourceData['daily_breakdown'] ?? [])
                    ->filter(fn (array $day) => ($day['logged_minutes'] ?? 0) > 0)
                    ->count(),
                'total_logged_minutes' => $sourceData['total_logged_minutes'] ?? 0,
                'timesheet_status_counts' => $sourceData['timesheet_status_counts'] ?? [],
            ],
            AiOutputType::ProductivityTrendAnalysis => [
                'period_count' => count($sourceData['periods'] ?? []),
                'net_change_minutes' => $sourceData['net_change_minutes'] ?? 0,
            ],
            AiOutputType::RecurringBlockers => [
                'scanned_entries' => $sourceData['scanned_entries'] ?? 0,
                'entries_with_blockers' => $sourceData['entries_with_blockers'] ?? 0,
                'recurring_blocker_count' => count($sourceData['recurring_blockers'] ?? []),
            ],
            AiOutputType::KpiPerformanceAnalysis => [
                'kpi_count' => count($sourceData['rated'] ?? []) + count($sourceData['untargeted'] ?? []),
                'rated_count' => count($sourceData['rated'] ?? []),
                'untargeted_count' => count($sourceData['untargeted'] ?? []),
                'zero_progress_count' => count($sourceData['zero_progress'] ?? []),
            ],
            AiOutputType::SupervisorRecommendations => [
                'pending_review_count' => $sourceData['pending_review_count'] ?? 0,
                'revision_requested_count' => $sourceData['revision_requested_count'] ?? 0,
                'recurring_blocker_count' => count($sourceData['recurring_blockers'] ?? []),
                'members_with_no_logged_time_count' => count($sourceData['members_with_no_logged_time'] ?? []),
                'unsubmitted_day_count' => $sourceData['unsubmitted_day_count'] ?? 0,
            ],
            AiOutputType::PayrollValidation => [
                'active_employee_count' => $sourceData['active_employee_count'] ?? 0,
                'employees_missing_rate_count' => count($sourceData['employees_missing_rate'] ?? []),
                'unsubmitted_day_count' => $sourceData['unsubmitted_day_count'] ?? 0,
                'open_timer_count' => $sourceData['open_timer_count'] ?? 0,
            ],
            // AssistantQuery is never served through AiOutputController
            // (explicit 404 guard in authorizeAccess()) — this branch
            // exists only so summarize() stays a total function.
            AiOutputType::AssistantQuery => [],
        };
    }
}
