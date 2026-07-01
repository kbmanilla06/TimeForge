<?php

namespace Tests\Feature\Timesheet;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use App\Notifications\TimesheetApproved;
use App\Notifications\TimesheetRejected;
use App\Notifications\TimesheetReopened;
use App\Notifications\TimesheetRevisionRequested;
use App\Notifications\TimesheetSubmitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestResponse;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    /**
     * Sanctum's guard caches the resolved user on the guard instance for the
     * lifetime of the test's container, so a later request with a different
     * bearer token can otherwise still resolve to the previously-authenticated
     * user. Forgetting the cached guards forces fresh resolution per call,
     * which is required here since these tests deliberately switch between
     * multiple actors (employee/supervisor/admin) within one test method.
     */
    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    private function submittedTimesheetFor(User $employee): Timesheet
    {
        $timesheet = Timesheet::factory()->create(['user_id' => $employee->id]);
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => $timesheet->date,
            'timesheet_id' => $timesheet->id,
        ]);

        return $timesheet;
    }

    public function test_supervisor_can_approve_a_submitted_timesheet_in_their_department(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $timesheet = $this->submittedTimesheetFor($employee);

        $response = $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => 'Looks good.']);

        $response->assertOk()->assertJsonPath('status', 'approved');

        $this->assertDatabaseHas('timesheet_comments', [
            'timesheet_id' => $timesheet->id,
            'author_id' => $supervisor->id,
            'action' => 'approved',
            'comment' => 'Looks good.',
        ]);

        Notification::assertSentTo($employee, TimesheetApproved::class);
    }

    public function test_supervisor_cannot_review_a_timesheet_outside_their_department(): void
    {
        $departmentA = Department::factory()->create();
        $departmentB = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $departmentA->id]);
        $otherSupervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $departmentB->id]);
        $timesheet = $this->submittedTimesheetFor($employee);

        $this->withAuth($otherSupervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => 'Should not work.'])
            ->assertStatus(403);

        $this->withAuth($otherSupervisor)
            ->getJson('/api/timesheets/team')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_admin_can_review_any_timesheet_regardless_of_department(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $admin = User::factory()->admin()->create();
        $timesheet = $this->submittedTimesheetFor($employee);

        $this->withAuth($admin)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => null])
            ->assertOk()
            ->assertJsonPath('status', 'approved');
    }

    public function test_nobody_can_review_their_own_timesheet(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $timesheet = $this->submittedTimesheetFor($supervisor);

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => 'Self-approving.'])
            ->assertStatus(403);
    }

    public function test_reject_requires_a_comment(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $timesheet = $this->submittedTimesheetFor($employee);

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/reject", [])
            ->assertStatus(422);
    }

    public function test_reject_notifies_the_employee_with_the_comment(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $timesheet = $this->submittedTimesheetFor($employee);

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/reject", ['comment' => 'Missing a deliverable link.'])
            ->assertOk()
            ->assertJsonPath('status', 'rejected');

        Notification::assertSentTo($employee, TimesheetRejected::class);
    }

    public function test_request_revision_requires_a_comment_and_unlocks_entries(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $timesheet = $this->submittedTimesheetFor($employee);
        $entry = TimeEntry::where('timesheet_id', $timesheet->id)->firstOrFail();

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/request-revision", [])
            ->assertStatus(422);

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/request-revision", ['comment' => 'Please fix the task name.'])
            ->assertOk()
            ->assertJsonPath('status', 'revision_requested');

        Notification::assertSentTo($employee, TimesheetRevisionRequested::class);

        $this->withAuth($employee)
            ->patchJson("/api/time-entries/{$entry->id}", [
                'date' => $entry->date->toDateString(),
                'start_time' => $entry->start_time->toDateTimeString(),
                'end_time' => $entry->end_time->toDateTimeString(),
                'task' => 'Fixed task name',
                'work_category' => $entry->work_category,
                'description' => $entry->description,
            ])
            ->assertOk();
    }

    public function test_comments_accumulate_across_multiple_review_cycles(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $timesheet = $this->submittedTimesheetFor($employee);

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/request-revision", ['comment' => 'First round of feedback.'])
            ->assertOk();

        // Resubmit.
        $this->withAuth($employee)
            ->postJson('/api/timesheets', ['date' => $timesheet->date->toDateString()])
            ->assertCreated();

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => 'Looks good now.'])
            ->assertOk();

        $comments = $timesheet->fresh()->comments;

        $this->assertCount(2, $comments);
        $this->assertTrue($comments->pluck('comment')->contains('First round of feedback.'));
        $this->assertTrue($comments->pluck('comment')->contains('Looks good now.'));
    }

    public function test_only_admin_can_reopen_an_approved_timesheet(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $admin = User::factory()->admin()->create();
        $timesheet = Timesheet::factory()->approved()->create(['user_id' => $employee->id]);

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/reopen", ['comment' => 'Should fail.'])
            ->assertStatus(403);

        $this->withAuth($admin)
            ->patchJson("/api/timesheets/{$timesheet->id}/reopen", ['comment' => 'Correction needed.'])
            ->assertOk()
            ->assertJsonPath('status', 'revision_requested');

        Notification::assertSentTo($employee, TimesheetReopened::class);

        $this->assertDatabaseHas('timesheet_comments', [
            'timesheet_id' => $timesheet->id,
            'action' => 'reopened',
        ]);
    }

    public function test_cannot_reopen_a_timesheet_that_is_not_approved(): void
    {
        $employee = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $timesheet = $this->submittedTimesheetFor($employee);

        $this->withAuth($admin)
            ->patchJson("/api/timesheets/{$timesheet->id}/reopen", ['comment' => null])
            ->assertStatus(422);
    }

    public function test_cannot_approve_a_timesheet_that_is_not_submitted(): void
    {
        $employee = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $timesheet = Timesheet::factory()->approved()->create(['user_id' => $employee->id]);

        $this->withAuth($admin)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => null])
            ->assertStatus(422);
    }

    public function test_submission_notifies_department_supervisors(): void
    {
        Notification::fake();

        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $department->id]);
        $entry = TimeEntry::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($employee)
            ->postJson('/api/timesheets', ['date' => $entry->date->toDateString()])
            ->assertCreated();

        Notification::assertSentTo($supervisor, TimesheetSubmitted::class);
    }
}
