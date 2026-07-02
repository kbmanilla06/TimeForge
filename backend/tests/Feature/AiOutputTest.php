<?php

namespace Tests\Feature;

use App\Models\AiOutput;
use App\Models\DailyScrum;
use App\Models\Department;
use App\Models\Kpi;
use App\Models\KpiAssignment;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestResponse;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AiOutputTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    /**
     * Sanctum caches the resolved guard user for the test's container
     * lifetime; forgetting guards forces fresh auth when a test switches
     * actors within one method (same fix used since Sprint 5's ReviewTest).
     */
    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    /**
     * One timesheet + one time entry for a day, mirroring DashboardTest's
     * helper (deactivated reviewer so no stray active users are created).
     *
     * @param  array<string, mixed>  $entryAttributes
     */
    private function loggedDay(
        User $user,
        string $date,
        int $minutes,
        string $status = 'approved',
        array $entryAttributes = []
    ): TimeEntry {
        $start = Carbon::parse($date)->setTime(9, 0);

        $timesheet = Timesheet::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'status' => $status,
            'reviewed_by' => $status === 'submitted' ? null : User::factory()->deactivated(),
            'reviewed_at' => $status === 'submitted' ? null : now(),
        ]);

        return TimeEntry::factory()->create(array_merge([
            'user_id' => $user->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes($minutes),
            'timesheet_id' => $timesheet->id,
        ], $entryAttributes));
    }

    public function test_employee_can_generate_their_own_daily_summary_with_exact_content(): void
    {
        $employee = User::factory()->create(['name' => 'Jane Employee']);
        $project = Project::factory()->create(['name' => 'Website Redesign']);

        $timesheet = Timesheet::factory()->create([
            'user_id' => $employee->id,
            'date' => '2026-01-05',
            'status' => 'approved',
            'reviewed_by' => User::factory()->deactivated(),
            'reviewed_at' => now(),
        ]);

        $kpi = Kpi::factory()->create(['name' => 'Bugs Resolved', 'unit' => 'bugs', 'target_value' => 10]);
        $assignment = KpiAssignment::factory()->create(['kpi_id' => $kpi->id, 'user_id' => $employee->id]);

        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => '2026-01-05',
            'start_time' => Carbon::parse('2026-01-05 09:00'),
            'end_time' => Carbon::parse('2026-01-05 12:00'),
            'timesheet_id' => $timesheet->id,
            'project_id' => $project->id,
            'task' => 'Fix login bug',
            'work_category' => 'Development',
            'task_status' => 'done',
            'description' => 'Patched session handling',
            'kpi_assignment_id' => $assignment->id,
            'kpi_progress_value' => 3,
        ]);

        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => '2026-01-05',
            'start_time' => Carbon::parse('2026-01-05 13:00'),
            'end_time' => Carbon::parse('2026-01-05 17:30'),
            'timesheet_id' => $timesheet->id,
            'task' => 'Ad-hoc support',
            'work_category' => 'Support',
            'task_status' => null,
            'description' => 'Customer escalation triage',
        ]);

        DailyScrum::factory()->create([
            'user_id' => $employee->id,
            'date' => '2026-01-05',
            'previous_work' => 'Shipped exports',
            'planned_work' => 'Fix login bug',
            'blockers' => 'VPN keeps dropping',
            'notes' => null,
        ]);

        $response = $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $employee->id,
            'date' => '2026-01-05',
        ]);

        $response->assertStatus(201);

        $expected = <<<'TEXT'
Daily work summary for Jane Employee on 2026-01-05.

Jane Employee logged 7h 30m across 2 time entries.
- Fix login bug (Development, done) — 3h 00m on Website Redesign: Patched session handling
- Ad-hoc support (Support, no status) — 4h 30m on no linked project or client: Customer escalation triage
Timesheet status for the day: approved.
Daily scrum — previous: Shipped exports | planned: Fix login bug | blockers: VPN keeps dropping | notes: none.
KPI progress reported: Bugs Resolved +3 bugs.
AI-generated by TimeForge (stub provider) from stored records only.
TEXT;

        $this->assertSame($expected, $response->json('content'));
        $this->assertSame('stub', $response->json('provider'));
        $this->assertSame('daily_work_summary.v1', $response->json('prompt_version'));
        $this->assertSame('2026-01-05', $response->json('period_start'));
        $this->assertSame('2026-01-05', $response->json('period_end'));
        $this->assertSame('Jane Employee', $response->json('generated_by_name'));

        // The stored row carries the full audit snapshot, server-set only.
        $this->assertDatabaseCount('ai_outputs', 1);
        $output = AiOutput::sole();
        $this->assertSame(450, $output->source_data['total_minutes']);
        $this->assertCount(2, $output->source_data['entries']);
        $this->assertSame($employee->id, $output->generated_by);

        $list = $this->withAuth($employee)
            ->getJson('/api/ai-outputs?type=daily_work_summary&user_id='.$employee->id.'&date=2026-01-05');

        $list->assertOk();
        $this->assertCount(1, $list->json('outputs'));
        $this->assertSame($output->id, $list->json('outputs.0.id'));
    }

    public function test_employee_cannot_generate_or_list_another_users_summary(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $colleague = User::factory()->create(['department_id' => $department->id]);

        $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $colleague->id,
            'date' => '2026-01-05',
        ])->assertStatus(403);

        $this->withAuth($employee)
            ->getJson('/api/ai-outputs?type=daily_work_summary&user_id='.$colleague->id.'&date=2026-01-05')
            ->assertStatus(403);

        $this->assertDatabaseCount('ai_outputs', 0);
    }

    public function test_employee_cannot_request_a_recurring_blockers_report(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);

        $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'recurring_blockers',
            'department_id' => $department->id,
            'date' => '2026-01-05',
        ])->assertStatus(403);
    }

    public function test_supervisor_can_generate_for_department_members_but_not_cross_department(): void
    {
        $ownDepartment = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $ownDepartment->id]);
        $member = User::factory()->create(['department_id' => $ownDepartment->id]);
        $outsider = User::factory()->create(['department_id' => $otherDepartment->id]);

        $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
            'type' => 'weekly_productivity_report',
            'user_id' => $member->id,
            'date' => '2026-01-05',
        ])->assertStatus(201);

        $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
            'type' => 'weekly_productivity_report',
            'user_id' => $outsider->id,
            'date' => '2026-01-05',
        ])->assertStatus(403);
    }

    public function test_supervisor_can_generate_own_department_blockers_but_not_another_departments(): void
    {
        $ownDepartment = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $ownDepartment->id]);

        $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
            'type' => 'recurring_blockers',
            'department_id' => $ownDepartment->id,
            'date' => '2026-01-05',
        ])->assertStatus(201);

        $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
            'type' => 'recurring_blockers',
            'department_id' => $otherDepartment->id,
            'date' => '2026-01-05',
        ])->assertStatus(403);
    }

    public function test_hr_finance_has_no_ai_access_at_all(): void
    {
        $hr = User::factory()->hrFinance()->create();

        $this->withAuth($hr)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $hr->id,
            'date' => '2026-01-05',
        ])->assertStatus(403);

        $this->withAuth($hr)
            ->getJson('/api/ai-outputs?type=daily_work_summary&user_id='.$hr->id.'&date=2026-01-05')
            ->assertStatus(403);
    }

    public function test_admin_can_generate_for_any_user_and_any_department(): void
    {
        $department = Department::factory()->create();
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $employee->id,
            'date' => '2026-01-05',
        ])->assertStatus(201);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'recurring_blockers',
            'department_id' => $department->id,
            'date' => '2026-01-05',
        ])->assertStatus(201);
    }

    public function test_weekly_report_numbers_are_computed_correctly(): void
    {
        $employee = User::factory()->create(['name' => 'Wally Week']);

        // Monday 2026-06-01: 10h approved => 8h regular + 2h overtime.
        $this->loggedDay($employee, '2026-06-01', 600, 'approved', ['kpi_progress_value' => 2.5]);
        // Tuesday 2026-06-02: 2h submitted => pending.
        $this->loggedDay($employee, '2026-06-02', 120, 'submitted');

        $response = $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'weekly_productivity_report',
            'user_id' => $employee->id,
            'date' => '2026-06-03',
        ]);

        $response->assertStatus(201);
        $this->assertSame('2026-06-01', $response->json('period_start'));
        $this->assertSame('2026-06-07', $response->json('period_end'));

        $expected = <<<'TEXT'
Weekly productivity report for Wally Week, 2026-06-01 to 2026-06-07.

Total logged: 12h 00m across 2 days with time entries.
Approved: 10h 00m (8h 00m regular, 2h 00m overtime). Pending: 2h 00m. Rejected: 0h 00m.
Daily breakdown:
- 2026-06-01: 10h 00m
- 2026-06-02: 2h 00m
- 2026-06-03: 0h 00m
- 2026-06-04: 0h 00m
- 2026-06-05: 0h 00m
- 2026-06-06: 0h 00m
- 2026-06-07: 0h 00m
Timesheets: 1 approved, 1 submitted.
KPI progress reported this week: 2.5 across 1 entry.
AI-generated by TimeForge (stub provider) from stored records only.
TEXT;

        $this->assertSame($expected, $response->json('content'));
    }

    public function test_weekly_outputs_are_found_for_any_date_in_the_same_iso_week(): void
    {
        $employee = User::factory()->create();

        $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'weekly_productivity_report',
            'user_id' => $employee->id,
            'date' => '2026-06-03',
        ])->assertStatus(201);

        // Friday of the same Monday-Sunday week resolves to the same period.
        $list = $this->withAuth($employee)
            ->getJson('/api/ai-outputs?type=weekly_productivity_report&user_id='.$employee->id.'&date=2026-06-05');

        $list->assertOk();
        $this->assertCount(1, $list->json('outputs'));
    }

    public function test_recurring_blockers_are_normalized_grouped_and_reported_exactly(): void
    {
        $department = Department::factory()->create(['name' => 'Engineering']);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $jane = User::factory()->create(['name' => 'Jane Doe', 'department_id' => $department->id]);
        $john = User::factory()->create(['name' => 'John Smith', 'department_id' => $department->id]);

        DailyScrum::factory()->create(['user_id' => $jane->id, 'date' => '2026-01-05', 'blockers' => 'VPN keeps dropping']);
        // Different casing and doubled whitespace must normalize to the same blocker.
        DailyScrum::factory()->create(['user_id' => $john->id, 'date' => '2026-01-05', 'blockers' => 'vpn keeps  DROPPING']);
        DailyScrum::factory()->create(['user_id' => $jane->id, 'date' => '2026-01-07', 'blockers' => 'VPN keeps dropping']);
        // One-off blocker: reported on a single day, so never "recurring".
        DailyScrum::factory()->create(['user_id' => $john->id, 'date' => '2026-01-06', 'blockers' => 'Printer jam']);
        DailyScrum::factory()->create(['user_id' => $john->id, 'date' => '2026-01-07', 'blockers' => null]);

        $response = $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
            'type' => 'recurring_blockers',
            'department_id' => $department->id,
            'date' => '2026-01-10',
        ]);

        $response->assertStatus(201);
        $this->assertSame('2026-01-01', $response->json('period_start'));
        $this->assertSame('2026-01-15', $response->json('period_end'));

        $expected = <<<'TEXT'
Recurring blocker report for Engineering, 2026-01-01 to 2026-01-15.

Scanned 5 daily scrum entries in the period; blockers were reported in 4 of them.
Recurring blockers (same blocker reported on 2 or more distinct days):
- "VPN keeps dropping" — 3 occurrences (2026-01-05, 2026-01-07) by Jane Doe, John Smith.
AI-generated by TimeForge (stub provider) from stored records only.
TEXT;

        $this->assertSame($expected, $response->json('content'));
        $this->assertStringNotContainsString('Printer jam', $response->json('content'));
    }

    public function test_regeneration_appends_a_new_row_and_history_returns_newest_first(): void
    {
        $employee = User::factory()->create();

        $first = $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $employee->id,
            'date' => '2026-01-05',
        ]);
        $second = $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $employee->id,
            'date' => '2026-01-05',
        ]);

        $first->assertStatus(201);
        $second->assertStatus(201);
        $this->assertNotSame($first->json('id'), $second->json('id'));
        $this->assertDatabaseCount('ai_outputs', 2);

        // The first generation is untouched by the second (append-only).
        $this->assertDatabaseHas('ai_outputs', ['id' => $first->json('id'), 'content' => $first->json('content')]);

        $list = $this->withAuth($employee)
            ->getJson('/api/ai-outputs?type=daily_work_summary&user_id='.$employee->id.'&date=2026-01-05');

        $list->assertOk();
        $this->assertCount(2, $list->json('outputs'));
        $this->assertSame($second->json('id'), $list->json('outputs.0.id'));
        $this->assertSame($first->json('id'), $list->json('outputs.1.id'));
    }

    public function test_validation_rejects_malformed_requests(): void
    {
        $admin = User::factory()->admin()->create();
        $department = Department::factory()->create();

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'sentiment_analysis',
            'user_id' => $admin->id,
            'date' => '2026-01-05',
        ])->assertStatus(422)->assertJsonValidationErrors(['type']);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'date' => '2026-01-05',
        ])->assertStatus(422)->assertJsonValidationErrors(['user_id']);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $admin->id,
            'department_id' => $department->id,
            'date' => '2026-01-05',
        ])->assertStatus(422)->assertJsonValidationErrors(['department_id']);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'recurring_blockers',
            'department_id' => $department->id,
            'user_id' => $admin->id,
            'date' => '2026-01-05',
        ])->assertStatus(422)->assertJsonValidationErrors(['user_id']);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'daily_work_summary',
            'user_id' => $admin->id,
            'date' => Carbon::tomorrow()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors(['date']);
    }
}
