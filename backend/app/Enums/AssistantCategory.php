<?php

namespace App\Enums;

/**
 * The fixed set of questions the AI Assistant can answer (Sprint 28).
 * Matching is local, deterministic keyword containment — no external NLP
 * or LLM call. Unmatched questions fall through to Unsupported, which
 * returns a fallback message listing these examples rather than guessing.
 */
enum AssistantCategory: string
{
    case TeamProgress = 'team_progress';
    case DepartmentProductivity = 'department_productivity';
    case AttendanceTrend = 'attendance_trend';
    case ScrumSummary = 'scrum_summary';
    case BehindSchedule = 'behind_schedule';
    case KpiFurthestBelowTarget = 'kpi_furthest_below_target';
    case Unsupported = 'unsupported';

    /**
     * Ordered so more specific phrases are checked before broader ones
     * that could otherwise collide (e.g. "behind schedule" before a bare
     * "progress" check would ever see it).
     *
     * @return array<int, array{0: self, 1: array<int, string>}>
     */
    private static function rules(): array
    {
        return [
            [self::BehindSchedule, ['behind schedule', 'falling behind', 'behind on', 'who is behind']],
            [self::KpiFurthestBelowTarget, ['declined', 'decline', 'dropped', 'furthest below target', 'worst kpi']],
            [self::ScrumSummary, ['scrum', 'standup', 'stand-up']],
            [self::AttendanceTrend, ['attendance']],
            [self::DepartmentProductivity, ['which department', 'department productivity', 'most productive department', 'highest productivity']],
            [self::TeamProgress, ['progress', 'how is my team', 'how are we doing', "team's doing"]],
        ];
    }

    public static function classify(string $question): self
    {
        $normalized = strtolower(trim($question));

        foreach (self::rules() as [$category, $phrases]) {
            foreach ($phrases as $phrase) {
                if (str_contains($normalized, $phrase)) {
                    return $category;
                }
            }
        }

        return self::Unsupported;
    }

    /**
     * Shown verbatim in the fallback message when nothing matches.
     *
     * @return array<int, string>
     */
    public static function supportedExamples(): array
    {
        return [
            "What is my team's progress?",
            'Which employees are behind schedule?',
            'Which department has the highest productivity?',
            'Show attendance trends.',
            "Summarize today's scrum.",
            'Which KPIs are furthest below target?',
        ];
    }
}
