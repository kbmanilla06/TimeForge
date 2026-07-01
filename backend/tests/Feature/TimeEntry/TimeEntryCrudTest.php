<?php

namespace Tests\Feature\TimeEntry;

use App\Models\Department;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimeEntryCrudTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_user_can_create_a_manual_time_entry(): void
    {
        $department = Department::factory()->create();
        $user = User::factory()->create(['department_id' => $department->id]);
        $project = Project::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->postJson('/api/time-entries', [
                'date' => now()->toDateString(),
                'start_time' => now()->setTime(9, 0)->toDateTimeString(),
                'end_time' => now()->setTime(10, 30)->toDateTimeString(),
                'project_id' => $project->id,
                'task' => 'Implement login page',
                'work_category' => 'Development',
                'description' => 'Built the login form and wired it to the API.',
                'reference_links' => ['https://example.com/ticket/123'],
                'deliverables' => ['Login page component'],
            ]);

        $response->assertCreated()
            ->assertJsonPath('duration_minutes', 90)
            ->assertJsonPath('department.id', $department->id)
            ->assertJsonPath('project.id', $project->id)
            ->assertJsonPath('reference_links.0', 'https://example.com/ticket/123')
            ->assertJsonPath('deliverables.0', 'Login page component');
    }

    public function test_user_can_list_only_their_own_entries(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        TimeEntry::factory()->count(2)->create(['user_id' => $user->id]);
        TimeEntry::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->getJson('/api/time-entries');

        $response->assertOk()->assertJsonCount(2);
    }

    public function test_user_can_view_update_and_delete_their_own_entry(): void
    {
        $user = User::factory()->create();
        $entry = TimeEntry::factory()->create(['user_id' => $user->id, 'task' => 'Original task']);
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/time-entries/{$entry->id}")
            ->assertOk()
            ->assertJsonPath('task', 'Original task');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entry->id}", [
                'date' => $entry->date->toDateString(),
                'start_time' => $entry->start_time->toDateTimeString(),
                'end_time' => $entry->end_time->toDateTimeString(),
                'task' => 'Updated task',
                'work_category' => $entry->work_category,
                'description' => $entry->description,
            ])
            ->assertOk()
            ->assertJsonPath('task', 'Updated task');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/time-entries/{$entry->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('time_entries', ['id' => $entry->id]);
    }

    public function test_user_cannot_view_update_or_delete_another_users_entry(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $entry = TimeEntry::factory()->create(['user_id' => $owner->id]);
        $token = $this->tokenFor($intruder);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/time-entries/{$entry->id}")
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/time-entries/{$entry->id}", [
                'date' => $entry->date->toDateString(),
                'start_time' => $entry->start_time->toDateTimeString(),
                'end_time' => $entry->end_time->toDateTimeString(),
                'task' => 'Hijacked',
                'work_category' => $entry->work_category,
                'description' => $entry->description,
            ])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/time-entries/{$entry->id}")
            ->assertStatus(403);

        $this->assertDatabaseHas('time_entries', ['id' => $entry->id, 'task' => $entry->task]);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/time-entries')->assertStatus(401);
    }
}
