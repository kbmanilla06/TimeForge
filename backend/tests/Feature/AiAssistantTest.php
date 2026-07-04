<?php

namespace Tests\Feature;

use App\Enums\AssistantCategory;
use App\Models\AiOutput;
use App\Models\DailyScrum;
use App\Models\Department;
use App\Models\Kpi;
use App\Models\KpiAssignment;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AiAssistantTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    private function ask(User $user, string $question): \Illuminate\Testing\TestResponse
    {
        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->postJson('/api/ai-assistant/ask', ['question' => $question]);
    }

    private function dayOfMinutes(User $user, string $date, int $minutes, string $status = 'approved'): void
    {
        $start = Carbon::parse($date)->setTime(9, 0);

        $timesheet = Timesheet::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'status' => $status,
            'reviewed_by' => User::factory()->deactivated(),
            'reviewed_at' => now(),
        ]);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes($minutes),
            'timesheet_id' => $status === 'submitted' ? null : $timesheet->id,
        ]);
    }

    public function test_classifier_matches_every_example_question(): void
    {
        $this->assertSame(AssistantCategory::TeamProgress, AssistantCategory::classify("What is my team's progress?"));
        $this->assertSame(AssistantCategory::BehindSchedule, AssistantCategory::classify('Which employees are behind schedule?'));
        $this->assertSame(AssistantCategory::DepartmentProductivity, AssistantCategory::classify('Which department has highest productivity?'));
        $this->assertSame(AssistantCategory::AttendanceTrend, AssistantCategory::classify('Show attendance trends.'));
        $this->assertSame(AssistantCategory::ScrumSummary, AssistantCategory::classify("Summarize today's scrum."));
        $this->assertSame(AssistantCategory::KpiFurthestBelowTarget, AssistantCategory::classify('Which KPIs declined this week?'));
        $this->assertSame(AssistantCategory::Unsupported, AssistantCategory::classify('What is the meaning of life?'));
    }

    public function test_unsupported_question_returns_fallback_with_examples(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->ask($admin, 'What is the meaning of life?');

        $response->assertCreated();
        $response->assertJsonPath('category', 'unsupported');
        $this->assertNotEmpty($response->json('supported_examples'));
        $this->assertNull($response->json('chart'));
        $this->assertNull($response->json('table'));
    }

    public function test_admin_gets_organization_wide_team_progress(): void
    {
        $deptA = Department::factory()->create();
        $deptB = Department::factory()->create();
        $employeeA = User::factory()->create(['department_id' => $deptA->id]);
        $employeeB = User::factory()->create(['department_id' => $deptB->id]);
        $this->dayOfMinutes($employeeA, '2026-07-02', 480);
        $this->dayOfMinutes($employeeB, '2026-07-02', 240);

        $admin = User::factory()->admin()->create();

        $response = $this->ask($admin, "What is my team's progress?");

        $response->assertCreated();
        $response->assertJsonPath('category', 'team_progress');
        $this->assertCount(3, $response->json('table.rows')); // employeeA, employeeB, admin (0 hours)
    }

    public function test_supervisor_only_sees_their_own_department(): void
    {
        $department = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        $otherEmployee = User::factory()->create(['department_id' => $otherDepartment->id]);
        $this->dayOfMinutes($employee, '2026-07-02', 480);
        $this->dayOfMinutes($otherEmployee, '2026-07-02', 480);

        $response = $this->ask($supervisor, "What is my team's progress?");

        $response->assertCreated();
        $names = collect($response->json('table.rows'))->pluck(0);
        $this->assertTrue($names->contains($employee->name));
        $this->assertFalse($names->contains($otherEmployee->name));
    }

    public function test_department_productivity_notes_limited_scope_for_supervisor(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);

        $response = $this->ask($supervisor, 'Which department has highest productivity?');

        $response->assertCreated();
        $this->assertStringContainsString('only compare within your own department', $response->json('executive_summary'));
    }

    public function test_kpi_decline_question_is_reinterpreted_not_fabricated(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        $kpi = Kpi::factory()->create(['target_value' => 10]);
        KpiAssignment::factory()->create(['kpi_id' => $kpi->id, 'user_id' => $employee->id, 'progress_value' => 2]);

        $response = $this->ask($supervisor, 'Which KPIs declined this week?');

        $response->assertCreated();
        $response->assertJsonPath('category', 'kpi_furthest_below_target');
        $this->assertStringContainsString("doesn't track KPI progress history", $response->json('executive_summary'));
        $this->assertNotEmpty($response->json('table.rows'));
    }

    public function test_behind_schedule_flags_unsubmitted_days(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id, 'name' => 'Jane Employee']);
        $this->dayOfMinutes($employee, '2026-07-02', 300, 'submitted');

        $response = $this->ask($supervisor, 'Which employees are behind schedule?');

        $response->assertCreated();
        $rows = collect($response->json('table.rows'));
        $this->assertTrue($rows->contains(fn ($row) => $row[0] === 'Jane Employee'));
    }

    public function test_scrum_summary_lists_todays_entries_and_missing_submissions(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $submitted = User::factory()->create(['department_id' => $department->id, 'name' => 'Submitted Employee']);
        User::factory()->create(['department_id' => $department->id, 'name' => 'Silent Employee']);

        DailyScrum::factory()->create([
            'user_id' => $submitted->id,
            'date' => Carbon::today()->toDateString(),
            'blockers' => 'Waiting on design.',
        ]);

        $response = $this->ask($supervisor, "Summarize today's scrum.");

        $response->assertCreated();
        $this->assertStringContainsString('Silent Employee', $response->json('detail'));
        $this->assertNotEmpty($response->json('recommendations'));
    }

    public function test_attendance_trend_returns_a_line_chart(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        $this->dayOfMinutes($employee, '2026-07-02', 480);

        $response = $this->ask($supervisor, 'Show attendance trends.');

        $response->assertCreated();
        $response->assertJsonPath('chart.type', 'line');
    }

    public function test_employee_cannot_use_the_assistant(): void
    {
        $employee = User::factory()->create();

        $this->ask($employee, "What is my team's progress?")->assertStatus(403);
    }

    public function test_hr_finance_cannot_use_the_assistant(): void
    {
        $hr = User::factory()->hrFinance()->create();

        $this->ask($hr, "What is my team's progress?")->assertStatus(403);
    }

    public function test_answer_is_persisted_as_an_assistant_query_ai_output(): void
    {
        $admin = User::factory()->admin()->create();

        $this->ask($admin, "What is my team's progress?")->assertCreated();

        $stored = AiOutput::query()->latest('id')->first();
        $this->assertSame('assistant_query', $stored->type->value);
        $this->assertNull($stored->user_id);
        $this->assertNull($stored->department_id);
        $this->assertSame($admin->id, $stored->generated_by);
        $this->assertSame("What is my team's progress?", $stored->source_data['question']);
    }

    public function test_generic_ai_outputs_endpoint_rejects_assistant_query_type(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/ai-outputs?type=assistant_query&date=2026-07-04');

        $response->assertStatus(404);
    }
}
