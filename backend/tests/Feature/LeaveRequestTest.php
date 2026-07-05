<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Notifications\LeaveRequestApproved;
use App\Notifications\LeaveRequestRejected;
use App\Notifications\LeaveRequestSubmitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestResponse;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class LeaveRequestTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    /**
     * Same rationale as Timesheet\ReviewTest: forces fresh guard
     * resolution per call since these tests switch actors within one
     * method.
     */
    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    public function test_employee_can_submit_a_leave_request(): void
    {
        $employee = User::factory()->create();

        $response = $this->withAuth($employee)->postJson('/api/leave-requests', [
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-03',
            'leave_type' => 'vacation',
            'reason' => 'Family trip',
        ]);

        $response->assertCreated()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('leave_type', 'vacation');

        $this->assertDatabaseHas('leave_requests', [
            'user_id' => $employee->id,
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-03',
            'status' => 'pending',
        ]);
    }

    public function test_end_date_before_start_date_is_rejected(): void
    {
        $employee = User::factory()->create();

        $this->withAuth($employee)->postJson('/api/leave-requests', [
            'start_date' => '2026-08-05',
            'end_date' => '2026-08-01',
            'leave_type' => 'vacation',
        ])->assertStatus(422)->assertJsonValidationErrors(['end_date']);
    }

    public function test_invalid_leave_type_is_rejected(): void
    {
        $employee = User::factory()->create();

        $this->withAuth($employee)->postJson('/api/leave-requests', [
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-02',
            'leave_type' => 'sabbatical',
        ])->assertStatus(422)->assertJsonValidationErrors(['leave_type']);
    }

    public function test_submitting_notifies_department_supervisors(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);

        $this->withAuth($employee)->postJson('/api/leave-requests', [
            'start_date' => '2026-08-01',
            'end_date' => '2026-08-02',
            'leave_type' => 'sick',
        ])->assertCreated();

        Notification::assertSentTo($supervisor, LeaveRequestSubmitted::class);
    }

    public function test_employee_sees_only_their_own_leave_requests(): void
    {
        $employee = User::factory()->create();
        $other = User::factory()->create();
        LeaveRequest::factory()->create(['user_id' => $employee->id]);
        LeaveRequest::factory()->create(['user_id' => $other->id]);

        $response = $this->withAuth($employee)->getJson('/api/leave-requests');

        $response->assertOk()->assertJsonCount(1);
    }

    public function test_supervisor_sees_only_their_departments_leave_requests(): void
    {
        $departmentA = Department::factory()->create();
        $departmentB = Department::factory()->create();
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $departmentA->id]);
        $employeeA = User::factory()->create(['department_id' => $departmentA->id]);
        $employeeB = User::factory()->create(['department_id' => $departmentB->id]);
        LeaveRequest::factory()->create(['user_id' => $employeeA->id]);
        LeaveRequest::factory()->create(['user_id' => $employeeB->id]);

        $response = $this->withAuth($supervisor)->getJson('/api/leave-requests/team');

        $response->assertOk()->assertJsonCount(1);
    }

    public function test_admin_sees_every_departments_leave_requests(): void
    {
        $admin = User::factory()->admin()->create();
        LeaveRequest::factory()->count(3)->create();

        $response = $this->withAuth($admin)->getJson('/api/leave-requests/team');

        $response->assertOk()->assertJsonCount(3);
    }

    public function test_employee_without_a_team_cannot_view_the_team_index(): void
    {
        $employee = User::factory()->create();

        $this->withAuth($employee)->getJson('/api/leave-requests/team')->assertStatus(403);
    }

    public function test_supervisor_can_approve_a_pending_request_in_their_department(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        $leaveRequest = LeaveRequest::factory()->create(['user_id' => $employee->id]);

        $response = $this->withAuth($supervisor)->patchJson("/api/leave-requests/{$leaveRequest->id}/approve");

        $response->assertOk()->assertJsonPath('status', 'approved');
        $this->assertSame($supervisor->id, $leaveRequest->fresh()->reviewed_by);
        $this->assertNotNull($leaveRequest->fresh()->reviewed_at);
        Notification::assertSentTo($employee, LeaveRequestApproved::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'leave_request.approved', 'subject_id' => $leaveRequest->id]);
    }

    public function test_supervisor_cannot_review_a_request_outside_their_department(): void
    {
        $departmentA = Department::factory()->create();
        $departmentB = Department::factory()->create();
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $departmentA->id]);
        $employee = User::factory()->create(['department_id' => $departmentB->id]);
        $leaveRequest = LeaveRequest::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($supervisor)
            ->patchJson("/api/leave-requests/{$leaveRequest->id}/approve")
            ->assertStatus(403);
    }

    public function test_nobody_can_review_their_own_leave_request(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $leaveRequest = LeaveRequest::factory()->create(['user_id' => $supervisor->id]);

        $this->withAuth($supervisor)
            ->patchJson("/api/leave-requests/{$leaveRequest->id}/approve")
            ->assertStatus(403);
    }

    public function test_admin_can_reject_with_an_optional_reason(): void
    {
        Notification::fake();

        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $leaveRequest = LeaveRequest::factory()->create(['user_id' => $employee->id]);

        $response = $this->withAuth($admin)->patchJson("/api/leave-requests/{$leaveRequest->id}/reject", [
            'rejection_reason' => 'Insufficient coverage that week.',
        ]);

        $response->assertOk()->assertJsonPath('status', 'rejected');
        $this->assertSame('Insufficient coverage that week.', $leaveRequest->fresh()->rejection_reason);
        Notification::assertSentTo($employee, LeaveRequestRejected::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'leave_request.rejected', 'subject_id' => $leaveRequest->id]);
    }

    public function test_rejection_reason_is_optional(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $leaveRequest = LeaveRequest::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($admin)
            ->patchJson("/api/leave-requests/{$leaveRequest->id}/reject", [])
            ->assertOk()
            ->assertJsonPath('status', 'rejected');
    }

    public function test_cannot_approve_an_already_decided_request(): void
    {
        $admin = User::factory()->admin()->create();
        $leaveRequest = LeaveRequest::factory()->approved()->create();

        $this->withAuth($admin)
            ->patchJson("/api/leave-requests/{$leaveRequest->id}/approve")
            ->assertStatus(422);
    }

    public function test_cannot_reject_an_already_decided_request(): void
    {
        $admin = User::factory()->admin()->create();
        $leaveRequest = LeaveRequest::factory()->rejected()->create();

        $this->withAuth($admin)
            ->patchJson("/api/leave-requests/{$leaveRequest->id}/reject")
            ->assertStatus(422);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/leave-requests', ['Accept' => 'application/json'])->assertStatus(401);
    }
}
