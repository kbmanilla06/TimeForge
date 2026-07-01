<?php

namespace Tests\Feature\Timesheet;

use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LockingTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    private function updatePayload(TimeEntry $entry, array $overrides = []): array
    {
        return array_merge([
            'date' => $entry->date->toDateString(),
            'start_time' => $entry->start_time->toDateTimeString(),
            'end_time' => $entry->end_time->toDateTimeString(),
            'task' => $entry->task,
            'work_category' => $entry->work_category,
            'description' => $entry->description,
        ], $overrides);
    }

    public function test_entries_linked_to_a_submitted_timesheet_are_locked(): void
    {
        $user = User::factory()->create();
        $timesheet = Timesheet::factory()->create(['user_id' => $user->id]);
        $entry = TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $timesheet->date,
            'timesheet_id' => $timesheet->id,
        ]);
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entry->id}", $this->updatePayload($entry, ['task' => 'Hijacked']))
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/time-entries/{$entry->id}")
            ->assertStatus(403);
    }

    public function test_entries_linked_to_an_approved_timesheet_are_locked(): void
    {
        $user = User::factory()->create();
        $timesheet = Timesheet::factory()->approved()->create(['user_id' => $user->id]);
        $entry = TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $timesheet->date,
            'timesheet_id' => $timesheet->id,
        ]);
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entry->id}", $this->updatePayload($entry, ['task' => 'Hijacked']))
            ->assertStatus(403);
    }

    public function test_entries_linked_to_a_revision_requested_timesheet_are_editable(): void
    {
        $user = User::factory()->create();
        $timesheet = Timesheet::factory()->revisionRequested()->create(['user_id' => $user->id]);
        $entry = TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $timesheet->date,
            'timesheet_id' => $timesheet->id,
        ]);
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entry->id}", $this->updatePayload($entry, ['task' => 'Fixed']))
            ->assertOk()
            ->assertJsonPath('task', 'Fixed');
    }

    public function test_unlinked_entries_remain_freely_editable(): void
    {
        $user = User::factory()->create();
        $entry = TimeEntry::factory()->create(['user_id' => $user->id]);
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entry->id}", $this->updatePayload($entry, ['task' => 'Still editable']))
            ->assertOk();
    }
}
