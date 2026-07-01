<?php

namespace Tests\Feature\TimeEntry;

use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimerTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_user_can_start_and_stop_a_timer(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $start = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries/start', [
                'task' => 'Fix bug',
                'work_category' => 'Development',
                'description' => 'Investigating a production issue.',
            ]);

        $start->assertCreated()->assertJsonPath('end_time', null);
        $entryId = $start->json('id');

        $stop = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entryId}/stop");

        $stop->assertOk();
        $this->assertNotNull($stop->json('end_time'));
        $this->assertNotNull($stop->json('duration_minutes'));
    }

    public function test_user_cannot_start_a_second_timer_while_one_is_running(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries/start', [
                'task' => 'First task',
                'work_category' => 'Development',
                'description' => 'Working on the first thing.',
            ])
            ->assertCreated();

        $second = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries/start', [
                'task' => 'Second task',
                'work_category' => 'Development',
                'description' => 'Trying to start another timer.',
            ]);

        $second->assertStatus(422);
        $this->assertSame(1, TimeEntry::where('user_id', $user->id)->count());
    }

    public function test_stopping_an_already_stopped_entry_is_rejected(): void
    {
        $user = User::factory()->create();
        $entry = TimeEntry::factory()->create(['user_id' => $user->id]);
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entry->id}/stop")
            ->assertStatus(422);
    }

    public function test_a_user_can_start_a_new_timer_after_stopping_the_previous_one(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $first = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries/start', [
                'task' => 'First task',
                'work_category' => 'Development',
                'description' => 'First.',
            ])->json('id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$first}/stop")
            ->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/time-entries/start', [
                'task' => 'Second task',
                'work_category' => 'Development',
                'description' => 'Second.',
            ])
            ->assertCreated();
    }
}
