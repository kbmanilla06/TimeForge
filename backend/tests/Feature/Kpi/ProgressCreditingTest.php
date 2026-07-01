<?php

namespace Tests\Feature\Kpi;

use App\Models\Department;
use App\Models\KpiAssignment;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestResponse;
use Tests\TestCase;

class ProgressCreditingTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    /**
     * Same Sanctum guard-caching fix used in Sprint 5's ReviewTest: forget
     * guards before switching actors within a single test method.
     */
    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    /**
     * @return array<string, mixed>
     */
    private function baseEntryPayload(): array
    {
        return [
            'date' => now()->toDateString(),
            'start_time' => now()->setTime(9, 0)->toDateTimeString(),
            'end_time' => now()->setTime(10, 0)->toDateTimeString(),
            'task' => 'Fix bugs',
            'work_category' => 'Development',
            'description' => 'Fixed some bugs.',
        ];
    }

    public function test_employee_can_link_a_time_entry_to_their_own_assignment(): void
    {
        $employee = User::factory()->create();
        $assignment = KpiAssignment::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($employee)
            ->postJson('/api/time-entries', [
                ...$this->baseEntryPayload(),
                'kpi_assignment_id' => $assignment->id,
                'kpi_progress_value' => 3,
            ])
            ->assertCreated()
            ->assertJsonPath('kpi_assignment_id', $assignment->id);
    }

    public function test_employee_cannot_link_a_time_entry_to_an_assignment_not_visible_to_them(): void
    {
        $employee = User::factory()->create();
        $otherEmployee = User::factory()->create();
        $assignment = KpiAssignment::factory()->create(['user_id' => $otherEmployee->id]);

        $this->withAuth($employee)
            ->postJson('/api/time-entries', [
                ...$this->baseEntryPayload(),
                'kpi_assignment_id' => $assignment->id,
                'kpi_progress_value' => 3,
            ])
            ->assertStatus(422);
    }

    public function test_kpi_progress_value_and_assignment_are_required_together(): void
    {
        $employee = User::factory()->create();
        $assignment = KpiAssignment::factory()->create(['user_id' => $employee->id]);

        $this->withAuth($employee)
            ->postJson('/api/time-entries', [
                ...$this->baseEntryPayload(),
                'kpi_assignment_id' => $assignment->id,
            ])
            ->assertStatus(422);

        $this->withAuth($employee)
            ->postJson('/api/time-entries', [
                ...$this->baseEntryPayload(),
                'kpi_progress_value' => 3,
            ])
            ->assertStatus(422);
    }

    public function test_progress_is_not_credited_on_submit_or_reject(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $assignment = KpiAssignment::factory()->create(['user_id' => $employee->id, 'progress_value' => 0]);

        $date = now()->toDateString();
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => $date,
            'kpi_assignment_id' => $assignment->id,
            'kpi_progress_value' => 5,
        ]);

        $this->withAuth($employee)->postJson('/api/timesheets', ['date' => $date])->assertCreated();
        $this->assertEquals(0, $assignment->fresh()->progress_value);

        $timesheet = Timesheet::where('user_id', $employee->id)->where('date', $date)->firstOrFail();

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/reject", ['comment' => 'Not yet.'])
            ->assertOk();

        $this->assertEquals(0, $assignment->fresh()->progress_value);
    }

    public function test_progress_is_credited_exactly_once_on_approval(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $assignment = KpiAssignment::factory()->create(['user_id' => $employee->id, 'progress_value' => 0]);

        $date = now()->toDateString();
        $entry = TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => $date,
            'kpi_assignment_id' => $assignment->id,
            'kpi_progress_value' => 5,
        ]);

        $this->withAuth($employee)->postJson('/api/timesheets', ['date' => $date])->assertCreated();
        $timesheet = Timesheet::where('user_id', $employee->id)->where('date', $date)->firstOrFail();

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => null])
            ->assertOk();

        $this->assertEquals(5, $assignment->fresh()->progress_value);
        $this->assertNotNull($entry->fresh()->kpi_progress_applied_at);
    }

    public function test_progress_does_not_double_count_across_reopen_and_reapprove(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $admin = User::factory()->admin()->create();
        $assignment = KpiAssignment::factory()->create(['user_id' => $employee->id, 'progress_value' => 0]);

        $date = now()->toDateString();
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => $date,
            'kpi_assignment_id' => $assignment->id,
            'kpi_progress_value' => 5,
        ]);

        $this->withAuth($employee)->postJson('/api/timesheets', ['date' => $date])->assertCreated();
        $timesheet = Timesheet::where('user_id', $employee->id)->where('date', $date)->firstOrFail();

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => null])
            ->assertOk();
        $this->assertEquals(5, $assignment->fresh()->progress_value);

        // Admin reopens (status -> revision_requested); the employee must
        // resubmit the same date before it can be approved again.
        $this->withAuth($admin)
            ->patchJson("/api/timesheets/{$timesheet->id}/reopen", ['comment' => 'Please double check.'])
            ->assertOk();

        $this->withAuth($employee)->postJson('/api/timesheets', ['date' => $date])->assertCreated();

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => 'Confirmed.'])
            ->assertOk();

        $this->assertEquals(5, $assignment->fresh()->progress_value);
    }

    public function test_progress_credits_correctly_for_a_department_level_assignment(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $assignment = KpiAssignment::factory()->create([
            'user_id' => null,
            'department_id' => $department->id,
            'progress_value' => 0,
        ]);

        $date = now()->toDateString();
        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => $date,
            'kpi_assignment_id' => $assignment->id,
            'kpi_progress_value' => 2,
        ]);

        $this->withAuth($employee)->postJson('/api/timesheets', ['date' => $date])->assertCreated();
        $timesheet = Timesheet::where('user_id', $employee->id)->where('date', $date)->firstOrFail();

        $this->withAuth($supervisor)
            ->patchJson("/api/timesheets/{$timesheet->id}/approve", ['comment' => null])
            ->assertOk();

        $this->assertEquals(2, $assignment->fresh()->progress_value);
    }
}
