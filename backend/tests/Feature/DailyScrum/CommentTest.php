<?php

namespace Tests\Feature\DailyScrum;

use App\Models\Department;
use App\Models\DailyScrum;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestResponse;
use Tests\TestCase;

class CommentTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    /**
     * Sanctum caches the resolved guard user for the test's container
     * lifetime; forgetting guards forces fresh auth when a test switches
     * actors within one method (same fix used in Sprint 5's ReviewTest).
     */
    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    public function test_supervisor_can_comment_on_an_entry_in_their_department(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $scrum = DailyScrum::factory()->create(['user_id' => $employee->id]);

        $response = $this->withAuth($supervisor)
            ->postJson("/api/daily-scrums/{$scrum->id}/comments", ['comment' => 'Nice progress.']);

        $response->assertCreated();
        $this->assertDatabaseHas('scrum_comments', [
            'daily_scrum_id' => $scrum->id,
            'author_id' => $supervisor->id,
            'comment' => 'Nice progress.',
        ]);
    }

    public function test_supervisor_cannot_comment_outside_their_department(): void
    {
        $departmentA = Department::factory()->create();
        $departmentB = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $departmentA->id]);
        $otherSupervisor = User::factory()->supervisor()->create(['department_id' => $departmentB->id]);
        $scrum = DailyScrum::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($otherSupervisor)
            ->postJson("/api/daily-scrums/{$scrum->id}/comments", ['comment' => 'Should not work.'])
            ->assertStatus(403);
    }

    public function test_admin_can_comment_on_any_entry(): void
    {
        $employee = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $scrum = DailyScrum::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($admin)
            ->postJson("/api/daily-scrums/{$scrum->id}/comments", ['comment' => 'Looks good.'])
            ->assertCreated();
    }

    public function test_employee_cannot_comment_on_their_own_entry(): void
    {
        $employee = User::factory()->create();
        $scrum = DailyScrum::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($employee)
            ->postJson("/api/daily-scrums/{$scrum->id}/comments", ['comment' => 'Self-commenting.'])
            ->assertStatus(403);
    }

    public function test_comment_requires_text(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $scrum = DailyScrum::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($supervisor)
            ->postJson("/api/daily-scrums/{$scrum->id}/comments", [])
            ->assertStatus(422);
    }

    public function test_the_first_comment_locks_the_entry_and_further_comments_accumulate(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $scrum = DailyScrum::factory()->create(['user_id' => $employee->id, 'date' => now()->toDateString()]);

        $this->assertFalse($scrum->fresh()->isLocked());

        $this->withAuth($supervisor)
            ->postJson("/api/daily-scrums/{$scrum->id}/comments", ['comment' => 'First comment.'])
            ->assertCreated();

        $this->assertTrue($scrum->fresh()->isLocked());

        $this->withAuth($employee)
            ->postJson('/api/daily-scrums', [
                'date' => $scrum->date->toDateString(),
                'previous_work' => 'Trying to sneak an edit in.',
                'planned_work' => 'Still working on it.',
            ])
            ->assertStatus(422);

        $this->withAuth($supervisor)
            ->postJson("/api/daily-scrums/{$scrum->id}/comments", ['comment' => 'Second comment.'])
            ->assertCreated();

        $this->assertSame(2, $scrum->fresh()->comments()->count());
    }

    public function test_supervisor_team_view_and_admin_team_view_are_scoped_correctly(): void
    {
        $departmentA = Department::factory()->create();
        $departmentB = Department::factory()->create();
        $employeeA = User::factory()->create(['department_id' => $departmentA->id]);
        $employeeB = User::factory()->create(['department_id' => $departmentB->id]);
        $supervisorA = User::factory()->supervisor()->create(['department_id' => $departmentA->id]);
        $admin = User::factory()->admin()->create();

        DailyScrum::factory()->create(['user_id' => $employeeA->id]);
        DailyScrum::factory()->create(['user_id' => $employeeB->id]);

        $this->withAuth($supervisorA)
            ->getJson('/api/daily-scrums/team')
            ->assertOk()
            ->assertJsonCount(1);

        $this->withAuth($admin)
            ->getJson('/api/daily-scrums/team')
            ->assertOk()
            ->assertJsonCount(2);

        $this->withAuth($employeeA)
            ->getJson('/api/daily-scrums/team')
            ->assertStatus(403);
    }

    public function test_employee_index_only_returns_their_own_entries(): void
    {
        $employee = User::factory()->create();
        $other = User::factory()->create();
        DailyScrum::factory()->create(['user_id' => $employee->id]);
        DailyScrum::factory()->create(['user_id' => $other->id]);

        $this->withAuth($employee)
            ->getJson('/api/daily-scrums')
            ->assertOk()
            ->assertJsonCount(1);
    }
}
