<?php

namespace App\Ai\SourceData;

use App\Models\DailyScrum;
use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Scans a department's daily scrum blockers across a period and groups
 * them mechanically: normalized text (trimmed, whitespace-collapsed,
 * case-insensitive) reported on two or more distinct dates counts as
 * recurring (per the approved Sprint 11 decisions). No semantic inference
 * is claimed — paraphrased blockers are a documented stub limitation.
 */
final class RecurringBlockersGatherer
{
    /**
     * @return array<string, mixed>
     */
    public function gather(Department $department, Carbon $periodStart, Carbon $periodEnd): array
    {
        $scrums = DailyScrum::with('user:id,name')
            ->whereIn('user_id', User::where('department_id', $department->id)->pluck('id'))
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->orderBy('date')
            ->orderBy('id')
            ->get();

        $withBlockers = $scrums->filter(fn (DailyScrum $scrum) => trim((string) $scrum->blockers) !== '');

        $recurring = $withBlockers
            ->groupBy(fn (DailyScrum $scrum) => Str::lower(Str::squish($scrum->blockers)))
            ->filter(fn (Collection $group) => $group->map(fn (DailyScrum $scrum) => $scrum->date->toDateString())->unique()->count() >= 2)
            ->map(fn (Collection $group) => [
                'text' => Str::squish($group->first()->blockers),
                'occurrences' => $group->count(),
                'dates' => $group->map(fn (DailyScrum $scrum) => $scrum->date->toDateString())->unique()->sort()->values()->all(),
                'employees' => $group->pluck('user.name')->unique()->values()->all(),
            ])
            ->sortByDesc('occurrences')
            ->values()
            ->all();

        return [
            'department_name' => $department->name,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'scanned_entries' => $scrums->count(),
            'entries_with_blockers' => $withBlockers->count(),
            'recurring_blockers' => $recurring,
        ];
    }
}
