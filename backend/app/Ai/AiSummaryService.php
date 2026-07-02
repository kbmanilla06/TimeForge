<?php

namespace App\Ai;

use App\Ai\SourceData\DailyWorkSummaryGatherer;
use App\Ai\SourceData\RecurringBlockersGatherer;
use App\Ai\SourceData\WeeklyProductivityReportGatherer;
use App\Enums\AiOutputType;
use App\Models\AiOutput;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Orchestrates one AI generation: gather the source data for the subject
 * and period, render it through the bound AiProvider, and persist the
 * result as a new append-only ai_outputs row carrying the full audit
 * snapshot (source data, provider, prompt version, generator).
 */
final class AiSummaryService
{
    public function __construct(private readonly AiProvider $provider) {}

    public function generate(
        AiOutputType $type,
        User|Department $subject,
        Carbon $periodStart,
        Carbon $periodEnd,
        User $generator
    ): AiOutput {
        $sourceData = $this->gather($type, $subject, $periodStart, $periodEnd);

        return AiOutput::create([
            'type' => $type->value,
            'user_id' => $subject instanceof User ? $subject->id : null,
            'department_id' => $subject instanceof Department ? $subject->id : null,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'source_data' => $sourceData,
            'content' => $this->provider->generate($type, $sourceData),
            'provider' => $this->provider->name(),
            'prompt_version' => $type->promptVersion(),
            'generated_by' => $generator->id,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function gather(AiOutputType $type, User|Department $subject, Carbon $periodStart, Carbon $periodEnd): array
    {
        return match ($type) {
            AiOutputType::DailyWorkSummary => (new DailyWorkSummaryGatherer)->gather($subject, $periodStart),
            AiOutputType::WeeklyProductivityReport => (new WeeklyProductivityReportGatherer)->gather($subject, $periodStart, $periodEnd),
            AiOutputType::RecurringBlockers => (new RecurringBlockersGatherer)->gather($subject, $periodStart, $periodEnd),
        };
    }
}
