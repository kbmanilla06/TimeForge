<?php

namespace Tests\Feature\Timesheet;

use App\Enums\TimesheetStatus;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubmissionTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_user_can_submit_a_timesheet_for_a_date_with_entries(): void
    {
        $user = User::factory()->create();
        $entry = TimeEntry::factory()->create(['user_id' => $user->id]);
        $token = $this->tokenFor($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/timesheets', ['date' => $entry->date->toDateString()]);

        $response->assertCreated()->assertJsonPath('status', 'submitted');

        $this->assertDatabaseHas('time_entries', [
            'id' => $entry->id,
            'timesheet_id' => $response->json('id'),
        ]);
    }

    public function test_cannot_submit_a_date_with_no_entries(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/timesheets', ['date' => now()->toDateString()])
            ->assertStatus(422);
    }

    public function test_cannot_submit_the_same_date_twice(): void
    {
        $user = User::factory()->create();
        $entry = TimeEntry::factory()->create(['user_id' => $user->id]);
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/timesheets', ['date' => $entry->date->toDateString()])
            ->assertCreated();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/timesheets', ['date' => $entry->date->toDateString()])
            ->assertStatus(422);
    }

    public function test_resubmission_after_revision_requested_reuses_the_same_timesheet_row(): void
    {
        $user = User::factory()->create();
        $timesheet = Timesheet::factory()->revisionRequested()->create(['user_id' => $user->id]);
        TimeEntry::factory()->create(['user_id' => $user->id, 'date' => $timesheet->date, 'timesheet_id' => $timesheet->id]);
        $token = $this->tokenFor($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/timesheets', ['date' => $timesheet->date->toDateString()]);

        $response->assertCreated()
            ->assertJsonPath('id', $timesheet->id)
            ->assertJsonPath('status', 'submitted');

        $this->assertSame(1, Timesheet::where('user_id', $user->id)->count());
    }

    public function test_user_cannot_view_or_submit_on_behalf_of_another_user(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $entry = TimeEntry::factory()->create(['user_id' => $owner->id]);
        $timesheet = Timesheet::factory()->create(['user_id' => $owner->id, 'date' => $entry->date]);
        TimeEntry::query()->where('id', $entry->id)->update(['timesheet_id' => $timesheet->id]);

        $token = $this->tokenFor($intruder);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/timesheets/{$timesheet->id}")
            ->assertStatus(403);
    }
}
