<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AccountRequest;
use App\Models\DailyScrum;
use App\Models\Department;
use App\Models\ScrumComment;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SidebarBadgeTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_employee_only_sees_their_own_notification_count(): void
    {
        $employee = User::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/sidebar-counts')
            ->assertOk();

        $response->assertJsonStructure(['notifications']);
        $response->assertJsonMissingPath('team_timesheets');
        $response->assertJsonMissingPath('team_scrum');
        $response->assertJsonMissingPath('account_approvals');
    }

    public function test_supervisor_sees_team_counts_scoped_to_their_own_department_only(): void
    {
        $department = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $ownReport = User::factory()->create(['department_id' => $department->id]);
        $otherReport = User::factory()->create(['department_id' => $otherDepartment->id]);

        Timesheet::factory()->create(['user_id' => $ownReport->id, 'status' => 'submitted', 'date' => '2026-01-01']);
        Timesheet::factory()->create(['user_id' => $ownReport->id, 'status' => 'approved', 'date' => '2026-01-02']);
        Timesheet::factory()->create(['user_id' => $otherReport->id, 'status' => 'submitted', 'date' => '2026-01-01']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->getJson('/api/sidebar-counts')
            ->assertOk();

        $response->assertJsonPath('team_timesheets', 1); // only the own-department submitted one
        $response->assertJsonMissingPath('account_approvals');
    }

    public function test_team_scrum_count_excludes_entries_that_already_have_a_comment(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $report = User::factory()->create(['department_id' => $department->id]);

        $reviewed = DailyScrum::factory()->create(['user_id' => $report->id, 'date' => '2026-01-01']);
        ScrumComment::factory()->create(['daily_scrum_id' => $reviewed->id]);
        DailyScrum::factory()->create(['user_id' => $report->id, 'date' => '2026-01-02']); // no comment yet

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->getJson('/api/sidebar-counts')
            ->assertOk();

        $response->assertJsonPath('team_scrum', 1);
    }

    public function test_admin_sees_all_counts_across_every_department(): void
    {
        $admin = User::factory()->admin()->create();
        AccountRequest::factory()->create(['status' => 'submitted']);
        AccountRequest::factory()->create(['status' => 'approved']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/sidebar-counts')
            ->assertOk();

        $response->assertJsonStructure(['notifications', 'team_timesheets', 'team_scrum', 'account_approvals']);
        $response->assertJsonPath('account_approvals', 1);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/sidebar-counts', ['Accept' => 'application/json'])->assertStatus(401);
    }
}
