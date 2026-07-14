<?php

namespace Tests\Feature;

use App\Models\AiOutput;
use App\Models\DailyScrum;
use App\Models\Department;
use App\Models\Kpi;
use App\Models\KpiAssignment;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestResponse;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Sprint 12: the four AI analysis capabilities (KPI performance analysis,
 * payroll validation, supervisor recommendations, productivity trend
 * analysis). Sprint 11's three capabilities keep their own coverage in
 * AiOutputTest.
 */
class AiAnalysisTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    /**
     * One timesheet + one time entry for a day (deactivated reviewer so no
     * stray active users pollute org-wide payroll aggregates).
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

    public function test_payroll_validation_is_admin_and_hr_finance_only(): void
    {
        $department = Department::factory()->create();
        $admin = User::factory()->admin()->create();
        $hr = User::factory()->hrFinance()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);

        $payload = ['type' => 'payroll_validation', 'date' => '2026-01-10'];

        $this->withAuth($admin)->postJson('/api/ai-outputs', $payload)->assertStatus(201);
        $this->withAuth($hr)->postJson('/api/ai-outputs', $payload)->assertStatus(201);
        $this->withAuth($hr)->getJson('/api/ai-outputs?type=payroll_validation&date=2026-01-10')->assertOk();
        $this->withAuth($supervisor)->postJson('/api/ai-outputs', $payload)->assertStatus(403);
        $this->withAuth($employee)->postJson('/api/ai-outputs', $payload)->assertStatus(403);
    }

    public function test_hr_finance_is_denied_every_type_except_payroll_validation(): void
    {
        $department = Department::factory()->create();
        $hr = User::factory()->hrFinance()->create();

        $userSubject = ['user_id' => $hr->id];
        $departmentSubject = ['department_id' => $department->id];

        $attempts = [
            ['type' => 'daily_work_summary', ...$userSubject],
            ['type' => 'weekly_productivity_report', ...$userSubject],
            ['type' => 'productivity_trend_analysis', ...$userSubject],
            ['type' => 'recurring_blockers', ...$departmentSubject],
            ['type' => 'kpi_performance_analysis', ...$departmentSubject],
            ['type' => 'supervisor_recommendations', ...$departmentSubject],
        ];

        foreach ($attempts as $attempt) {
            $this->withAuth($hr)
                ->postJson('/api/ai-outputs', [...$attempt, 'date' => '2026-01-10'])
                ->assertStatus(403);
        }

        $this->assertDatabaseCount('ai_outputs', 0);
    }

    public function test_supervisor_department_scope_applies_to_kpi_analysis_and_recommendations(): void
    {
        $ownDepartment = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $ownDepartment->id]);

        foreach (['kpi_performance_analysis', 'supervisor_recommendations'] as $type) {
            $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
                'type' => $type,
                'department_id' => $ownDepartment->id,
                'date' => '2026-01-10',
            ])->assertStatus(201);

            $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
                'type' => $type,
                'department_id' => $otherDepartment->id,
                'date' => '2026-01-10',
            ])->assertStatus(403);
        }
    }

    public function test_employee_can_generate_own_trend_but_nothing_department_scoped(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $colleague = User::factory()->create(['department_id' => $department->id]);

        $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'productivity_trend_analysis',
            'user_id' => $employee->id,
            'date' => '2026-01-10',
        ])->assertStatus(201);

        $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'productivity_trend_analysis',
            'user_id' => $colleague->id,
            'date' => '2026-01-10',
        ])->assertStatus(403);

        $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'kpi_performance_analysis',
            'department_id' => $department->id,
            'date' => '2026-01-10',
        ])->assertStatus(403);
    }

    public function test_admin_can_generate_all_four_new_types(): void
    {
        $department = Department::factory()->create();
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'kpi_performance_analysis', 'department_id' => $department->id, 'date' => '2026-01-10',
        ])->assertStatus(201);
        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'supervisor_recommendations', 'department_id' => $department->id, 'date' => '2026-01-10',
        ])->assertStatus(201);
        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'productivity_trend_analysis', 'user_id' => $employee->id, 'date' => '2026-01-10',
        ])->assertStatus(201);
        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'payroll_validation', 'date' => '2026-01-10',
        ])->assertStatus(201);
    }

    public function test_payroll_validation_reports_exact_facts_and_stores_the_organization_shape(): void
    {
        $hr = User::factory()->hrFinance()->create();
        $jane = User::factory()->create(['name' => 'Jane Payroll', 'hourly_rate' => 20]);
        $rick = User::factory()->create(['name' => 'Rick Rateless', 'hourly_rate' => null]);

        // Jane: 8h + 10h approved (=> 16h regular, 2h overtime, $370),
        // 4h pending, 2h rejected, plus one 1h day never submitted.
        $this->loggedDay($jane, '2026-01-05', 480, 'approved');
        $this->loggedDay($jane, '2026-01-06', 600, 'approved');
        $this->loggedDay($jane, '2026-01-07', 240, 'submitted');
        $this->loggedDay($jane, '2026-01-08', 120, 'rejected');
        TimeEntry::factory()->create([
            'user_id' => $jane->id,
            'date' => '2026-01-10',
            'start_time' => Carbon::parse('2026-01-10 09:00'),
            'end_time' => Carbon::parse('2026-01-10 10:00'),
        ]);

        // Rick: 4h approved with no hourly rate, plus an open timer on an
        // unsubmitted day.
        $this->loggedDay($rick, '2026-01-09', 240, 'approved');
        TimeEntry::factory()->running()->create([
            'user_id' => $rick->id,
            'date' => '2026-01-11',
            'start_time' => Carbon::parse('2026-01-11 09:00'),
        ]);

        $response = $this->withAuth($hr)->postJson('/api/ai-outputs', [
            'type' => 'payroll_validation',
            'date' => '2026-01-10',
        ]);

        $response->assertStatus(201);
        $this->assertSame('2026-01-01', $response->json('period_start'));
        $this->assertSame('2026-01-15', $response->json('period_end'));

        $expected = <<<'TEXT'
Payroll validation for the organization, 2026-01-01 to 2026-01-15.

Period totals: 20h 00m regular, 2h 00m overtime, estimated payroll 370.00, across 3 active employees.
Employees with approved hours but no hourly rate: Rick Rateless.
Hours not payroll-ready: 4h 00m pending review, 2h 00m rejected.
Days with logged time but no timesheet: 2 (Jane Payroll, Rick Rateless).
Open timers left running in the period: 1 (Rick Rateless).
Largest single approved day: Jane Payroll on 2026-01-06 with 10h 00m.
AI-generated by All in Time (stub provider) from stored records only.
TEXT;

        $this->assertSame($expected, $response->json('content'));

        // Organization shape: no subject at all, retrievable by type+period.
        $output = AiOutput::sole();
        $this->assertNull($output->user_id);
        $this->assertNull($output->department_id);

        $list = $this->withAuth($hr)->getJson('/api/ai-outputs?type=payroll_validation&date=2026-01-12');
        $list->assertOk();
        $this->assertCount(1, $list->json('outputs'));
        $this->assertSame($output->id, $list->json('outputs.0.id'));
    }

    public function test_kpi_performance_analysis_ranks_and_reports_exact_numbers(): void
    {
        $department = Department::factory()->create(['name' => 'Engineering']);
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $jane = User::factory()->create(['name' => 'Jane Doe', 'department_id' => $department->id]);
        $john = User::factory()->create(['name' => 'John Smith', 'department_id' => $department->id]);
        $outsider = User::factory()->create(['department_id' => $otherDepartment->id]);

        $bugs = Kpi::factory()->create(['name' => 'Bugs Resolved', 'target_value' => 10, 'unit' => 'bugs']);
        $docs = Kpi::factory()->create(['name' => 'Docs Written', 'target_value' => 10, 'unit' => 'docs']);
        $calls = Kpi::factory()->create(['name' => 'Sales Calls', 'target_value' => null, 'unit' => 'calls']);
        $secret = Kpi::factory()->create(['name' => 'Secret Metric', 'target_value' => 10]);

        $janeAssignment = KpiAssignment::factory()->create(['kpi_id' => $bugs->id, 'user_id' => $jane->id, 'progress_value' => 6]);
        KpiAssignment::factory()->create(['kpi_id' => $docs->id, 'user_id' => null, 'department_id' => $department->id, 'progress_value' => 0]);
        KpiAssignment::factory()->create(['kpi_id' => $calls->id, 'user_id' => $john->id, 'progress_value' => 4]);
        KpiAssignment::factory()->create(['kpi_id' => $secret->id, 'user_id' => $outsider->id, 'progress_value' => 9]);

        // +3 credited (applied) within the period; the +99 entry was never
        // applied and must not count.
        TimeEntry::factory()->create([
            'user_id' => $jane->id,
            'date' => '2026-01-05',
            'start_time' => Carbon::parse('2026-01-05 09:00'),
            'end_time' => Carbon::parse('2026-01-05 10:00'),
            'kpi_assignment_id' => $janeAssignment->id,
            'kpi_progress_value' => 3,
        ])->forceFill(['kpi_progress_applied_at' => now()])->save();

        TimeEntry::factory()->create([
            'user_id' => $jane->id,
            'date' => '2026-01-06',
            'start_time' => Carbon::parse('2026-01-06 09:00'),
            'end_time' => Carbon::parse('2026-01-06 10:00'),
            'kpi_assignment_id' => $janeAssignment->id,
            'kpi_progress_value' => 99,
        ]);

        $response = $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
            'type' => 'kpi_performance_analysis',
            'department_id' => $department->id,
            'date' => '2026-01-10',
        ]);

        $response->assertStatus(201);

        $expected = <<<'TEXT'
KPI performance analysis for Engineering, 2026-01-01 to 2026-01-15.

In scope: 3 KPI assignments (2 with a numeric target).
Completion rates (highest first):
- Bugs Resolved — Jane Doe: 6/10 bugs (60%); +3 credited this period.
- Docs Written — Engineering (department): 0/10 docs (0%); +0 credited this period.
Assignments without a numeric target:
- Sales Calls — John Smith: progress 4 calls; +0 credited this period.
Assignments with zero recorded progress: Docs Written — Engineering (department).
AI-generated by All in Time (stub provider) from stored records only.
TEXT;

        $this->assertSame($expected, $response->json('content'));
        $this->assertStringNotContainsString('Secret Metric', $response->json('content'));
    }

    public function test_supervisor_recommendations_cite_exact_counts_and_names(): void
    {
        $department = Department::factory()->create(['name' => 'Engineering']);
        $supervisor = User::factory()->supervisor()->create(['name' => 'Sam Supervisor', 'department_id' => $department->id]);
        $jane = User::factory()->create(['name' => 'Jane Doe', 'department_id' => $department->id]);
        $john = User::factory()->create(['name' => 'John Smith', 'department_id' => $department->id]);
        User::factory()->create(['name' => 'Zoe Zero', 'department_id' => $department->id]);

        // The supervisor and John have logged time, so only Zoe has none.
        $this->loggedDay($supervisor, '2026-01-03', 240, 'approved');
        $this->loggedDay($john, '2026-01-04', 240, 'approved');

        // Jane: two pending reviews, one revision-requested day, and one
        // logged day never submitted.
        $this->loggedDay($jane, '2026-01-05', 240, 'submitted');
        $this->loggedDay($jane, '2026-01-07', 240, 'submitted');
        $this->loggedDay($jane, '2026-01-06', 240, 'revision_requested');
        TimeEntry::factory()->create([
            'user_id' => $jane->id,
            'date' => '2026-01-08',
            'start_time' => Carbon::parse('2026-01-08 09:00'),
            'end_time' => Carbon::parse('2026-01-08 10:00'),
        ]);

        // "VPN keeps dropping" on two distinct days (3 occurrences).
        DailyScrum::factory()->create(['user_id' => $jane->id, 'date' => '2026-01-05', 'blockers' => 'VPN keeps dropping']);
        DailyScrum::factory()->create(['user_id' => $john->id, 'date' => '2026-01-05', 'blockers' => 'vpn keeps  dropping']);
        DailyScrum::factory()->create(['user_id' => $jane->id, 'date' => '2026-01-07', 'blockers' => 'VPN keeps dropping']);

        $calls = Kpi::factory()->create(['name' => 'Sales Calls', 'target_value' => null, 'unit' => 'calls']);
        $docs = Kpi::factory()->create(['name' => 'Docs Written', 'target_value' => 10, 'unit' => 'docs']);
        KpiAssignment::factory()->create(['kpi_id' => $calls->id, 'user_id' => $john->id, 'progress_value' => 4]);
        KpiAssignment::factory()->create(['kpi_id' => $docs->id, 'user_id' => null, 'department_id' => $department->id, 'progress_value' => 0]);

        $response = $this->withAuth($supervisor)->postJson('/api/ai-outputs', [
            'type' => 'supervisor_recommendations',
            'department_id' => $department->id,
            'date' => '2026-01-10',
        ]);

        $response->assertStatus(201);

        $expected = <<<'TEXT'
Supervisor recommendations for Engineering, 2026-01-01 to 2026-01-15.

1. Review 2 submitted timesheets awaiting a decision; the oldest is dated 2026-01-05.
2. 1 timesheet is awaiting employee resubmission after a revision request.
3. Address the recurring blocker "VPN keeps dropping" (3 occurrences in this period).
4. Check in with members who logged no time this period: Zoe Zero.
5. 1 logged day has no submitted timesheet; affected: Jane Doe.
6. Set a numeric target for: Sales Calls — John Smith.
7. Follow up on KPI assignments with zero recorded progress: Docs Written — Engineering (department).
AI-generated by All in Time (stub provider) from stored records only.
TEXT;

        $this->assertSame($expected, $response->json('content'));
    }

    public function test_productivity_trend_covers_six_periods_with_exact_deltas(): void
    {
        $employee = User::factory()->create(['name' => 'Wally Week']);

        // 10h approved in the 2026-06-01..15 period, 4h in 06-16..30.
        $this->loggedDay($employee, '2026-06-05', 600, 'approved');
        $this->loggedDay($employee, '2026-06-20', 240, 'approved');

        $response = $this->withAuth($employee)->postJson('/api/ai-outputs', [
            'type' => 'productivity_trend_analysis',
            'user_id' => $employee->id,
            'date' => '2026-06-20',
        ]);

        $response->assertStatus(201);
        $this->assertSame('2026-04-01', $response->json('period_start'));
        $this->assertSame('2026-06-30', $response->json('period_end'));

        $expected = <<<'TEXT'
Productivity trend analysis for Wally Week, 2026-04-01 to 2026-06-30 (6 payroll periods).

- 2026-04-01 to 2026-04-15: 0h 00m approved (0h 00m overtime, 0h 00m pending), 0 attendance days.
- 2026-04-16 to 2026-04-30: 0h 00m approved (0h 00m overtime, 0h 00m pending), 0 attendance days; change from previous period: +0h 00m.
- 2026-05-01 to 2026-05-15: 0h 00m approved (0h 00m overtime, 0h 00m pending), 0 attendance days; change from previous period: +0h 00m.
- 2026-05-16 to 2026-05-31: 0h 00m approved (0h 00m overtime, 0h 00m pending), 0 attendance days; change from previous period: +0h 00m.
- 2026-06-01 to 2026-06-15: 10h 00m approved (2h 00m overtime, 0h 00m pending), 1 attendance day; change from previous period: +10h 00m.
- 2026-06-16 to 2026-06-30: 4h 00m approved (0h 00m overtime, 0h 00m pending), 1 attendance day; change from previous period: -6h 00m.
Net change across the window: +4h 00m approved (first period 0h 00m, latest period 4h 00m).
AI-generated by All in Time (stub provider) from stored records only.
TEXT;

        $this->assertSame($expected, $response->json('content'));
    }

    public function test_validation_rejects_wrong_subjects_for_each_new_shape(): void
    {
        $admin = User::factory()->admin()->create();
        $department = Department::factory()->create();

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'payroll_validation',
            'user_id' => $admin->id,
            'date' => '2026-01-10',
        ])->assertStatus(422)->assertJsonValidationErrors(['user_id']);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'payroll_validation',
            'department_id' => $department->id,
            'date' => '2026-01-10',
        ])->assertStatus(422)->assertJsonValidationErrors(['department_id']);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'kpi_performance_analysis',
            'date' => '2026-01-10',
        ])->assertStatus(422)->assertJsonValidationErrors(['department_id']);

        $this->withAuth($admin)->postJson('/api/ai-outputs', [
            'type' => 'productivity_trend_analysis',
            'date' => '2026-01-10',
        ])->assertStatus(422)->assertJsonValidationErrors(['user_id']);
    }
}
