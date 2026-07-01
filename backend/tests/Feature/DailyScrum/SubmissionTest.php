<?php

namespace Tests\Feature\DailyScrum;

use App\Models\DailyScrum;
use App\Models\ScrumComment;
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

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'date' => now()->toDateString(),
            'previous_work' => 'Finished the login page.',
            'planned_work' => 'Start on the dashboard.',
            'blockers' => null,
            'notes' => null,
            ...$overrides,
        ];
    }

    public function test_employee_can_submit_todays_entry(): void
    {
        $employee = User::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->postJson('/api/daily-scrums', $this->payload());

        $response->assertCreated()->assertJsonPath('previous_work', 'Finished the login page.');

        $this->assertDatabaseHas('daily_scrums', [
            'user_id' => $employee->id,
            'previous_work' => 'Finished the login page.',
        ]);
    }

    public function test_cannot_submit_for_a_future_date(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->postJson('/api/daily-scrums', $this->payload(['date' => now()->addDay()->toDateString()]))
            ->assertStatus(422);
    }

    public function test_resubmitting_the_same_date_updates_the_existing_row_not_a_new_one(): void
    {
        $employee = User::factory()->create();
        $token = $this->tokenFor($employee);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/daily-scrums', $this->payload())
            ->assertCreated();

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/daily-scrums', $this->payload(['previous_work' => 'Updated the login page.']));

        $response->assertOk()->assertJsonPath('previous_work', 'Updated the login page.');
        $this->assertSame(1, DailyScrum::where('user_id', $employee->id)->count());
    }

    public function test_editing_is_rejected_once_the_entry_has_been_commented_on(): void
    {
        $employee = User::factory()->create();
        $scrum = DailyScrum::factory()->create(['user_id' => $employee->id, 'date' => now()->toDateString()]);
        ScrumComment::factory()->create(['daily_scrum_id' => $scrum->id]);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->postJson('/api/daily-scrums', $this->payload(['previous_work' => 'Trying to edit after review.']))
            ->assertStatus(422);
    }

    public function test_cannot_view_or_submit_on_behalf_of_another_user(): void
    {
        $employee = User::factory()->create();
        $other = User::factory()->create();
        $scrum = DailyScrum::factory()->create(['user_id' => $other->id]);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson("/api/daily-scrums/{$scrum->id}")
            ->assertStatus(403);
    }
}
