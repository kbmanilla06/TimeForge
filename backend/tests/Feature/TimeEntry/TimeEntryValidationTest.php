<?php

namespace Tests\Feature\TimeEntry;

use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimeEntryValidationTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_overlapping_entries_are_rejected(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'start_time' => now()->setTime(9, 0),
            'end_time' => now()->setTime(10, 0),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries', [
                'date' => now()->toDateString(),
                'start_time' => now()->setTime(9, 30)->toDateTimeString(),
                'end_time' => now()->setTime(10, 30)->toDateTimeString(),
                'task' => 'Overlapping task',
                'work_category' => 'Development',
                'description' => 'Should be rejected.',
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('start_time');
    }

    public function test_non_overlapping_entries_on_the_same_day_are_allowed(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'start_time' => now()->setTime(9, 0),
            'end_time' => now()->setTime(10, 0),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries', [
                'date' => now()->toDateString(),
                'start_time' => now()->setTime(10, 0)->toDateTimeString(),
                'end_time' => now()->setTime(11, 0)->toDateTimeString(),
                'task' => 'Back to back task',
                'work_category' => 'Development',
                'description' => 'Should be allowed.',
            ]);

        $response->assertCreated();
    }

    public function test_future_dated_entries_are_rejected(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries', [
                'date' => now()->addDay()->toDateString(),
                'start_time' => now()->addDay()->setTime(9, 0)->toDateTimeString(),
                'end_time' => now()->addDay()->setTime(10, 0)->toDateTimeString(),
                'task' => 'Future task',
                'work_category' => 'Development',
                'description' => 'Should be rejected.',
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('date');
    }

    public function test_end_time_before_start_time_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries', [
                'date' => now()->toDateString(),
                'start_time' => now()->setTime(10, 0)->toDateTimeString(),
                'end_time' => now()->setTime(9, 0)->toDateTimeString(),
                'task' => 'Backwards task',
                'work_category' => 'Development',
                'description' => 'Should be rejected.',
            ]);

        $response->assertStatus(422)->assertJsonValidationErrors('end_time');
    }

    public function test_updating_an_entry_to_overlap_another_is_rejected_but_excludes_itself(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $first = TimeEntry::factory()->create([
            'user_id' => $user->id,
            'start_time' => now()->setTime(9, 0),
            'end_time' => now()->setTime(10, 0),
        ]);
        $second = TimeEntry::factory()->create([
            'user_id' => $user->id,
            'start_time' => now()->setTime(11, 0),
            'end_time' => now()->setTime(12, 0),
        ]);

        // Updating $second without changing its time should not trigger a
        // false-positive overlap against itself.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$second->id}", [
                'date' => $second->date->toDateString(),
                'start_time' => $second->start_time->toDateTimeString(),
                'end_time' => $second->end_time->toDateTimeString(),
                'task' => 'Renamed',
                'work_category' => $second->work_category,
                'description' => $second->description,
            ])
            ->assertOk();

        // Moving $second to overlap $first should be rejected.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$second->id}", [
                'date' => $second->date->toDateString(),
                'start_time' => now()->setTime(9, 30)->toDateTimeString(),
                'end_time' => now()->setTime(10, 30)->toDateTimeString(),
                'task' => $second->task,
                'work_category' => $second->work_category,
                'description' => $second->description,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('start_time');
    }
}
