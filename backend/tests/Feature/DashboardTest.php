<?php

namespace Tests\Feature;

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

class DashboardTest extends TestCase
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
     * @return array<string, mixed>
     */
    private function dayOfMinutes(
        User $user,
        string $date,
        int $minutes,
        string $status = 'approved',
        ?Project $project = null
    ): TimeEntry {
        $start = Carbon::parse($date)->setTime(9, 0);

        // A deactivated reviewer is used (rather than a fresh active user
        // each call) so this helper never pollutes org-wide active-user
        // aggregates (employee_productivity, payroll_summary counts, etc.)
        // with throwaway "reviewer" accounts.
        $timesheet = Timesheet::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'status' => $status,
            'reviewed_by' => $status === 'submitted' ? null : User::factory()->deactivated(),
            'reviewed_at' => $status === 'submitted' ? null : now(),
        ]);

        return TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes($minutes),
            'timesheet_id' => $timesheet->id,
            'project_id' => $project?->id,
        ]);
    }

    public function test_admin_and_hr_finance_see_payroll_summary_but_supervisor_does_not(): void
    {
        $department = Department::factory()->create();
        $admin = User::factory()->admin()->create();
        $hr = User::factory()->hrFinance()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);

        $adminResponse = $this->withAuth($admin)->getJson('/api/dashboard');
        $adminResponse->assertOk();
        $this->assertArrayHasKey('payroll_summary', $adminResponse->json());
        $this->assertSame('organization', $adminResponse->json('scope'));

        $hrResponse = $this->withAuth($hr)->getJson('/api/dashboard');
        $hrResponse->assertOk();
        $this->assertArrayHasKey('payroll_summary', $hrResponse->json());

        $supervisorResponse = $this->withAuth($supervisor)->getJson('/api/dashboard');
        $supervisorResponse->assertOk();
        $this->assertArrayNotHasKey('payroll_summary', $supervisorResponse->json());
        $this->assertSame('department', $supervisorResponse->json('scope'));
        $this->assertSame($department->name, $supervisorResponse->json('department_name'));
    }

    public function test_employee_cannot_view_the_dashboard(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/dashboard')
            ->assertStatus(403);
    }

    public function test_supervisor_without_a_department_cannot_view_the_dashboard(): void
    {
        $supervisor = User::factory()->supervisor()->create(['department_id' => null]);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->getJson('/api/dashboard')
            ->assertStatus(403);
    }

    public function test_total_hours_and_employee_productivity_are_computed_correctly(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['name' => 'Jane Employee']);

        $this->dayOfMinutes($employee, '2026-01-05', 480, 'approved');
        $this->dayOfMinutes($employee, '2026-01-06', 120, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/dashboard?date=2026-01-10');

        $response->assertOk();
        // Admin (0) + Jane (600) = 600.
        $this->assertSame(600, $response->json('total_hours_minutes'));

        $productivity = collect($response->json('employee_productivity'))->firstWhere('name', 'Jane Employee');
        $this->assertSame(600, $productivity['approved_minutes']);
    }

    public function test_department_performance_includes_hours_and_average_kpi_completion(): void
    {
        $department = Department::factory()->create();
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $this->dayOfMinutes($employee, '2026-01-05', 480, 'approved');

        $kpi = Kpi::factory()->create(['target_value' => 10]);
        KpiAssignment::factory()->create(['kpi_id' => $kpi->id, 'user_id' => $employee->id, 'progress_value' => 6]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/dashboard?date=2026-01-10');

        $deptRow = collect($response->json('department_performance'))->firstWhere('department_id', $department->id);
        $this->assertSame(480, $deptRow['approved_minutes']);
        $this->assertEquals(60.0, $deptRow['average_kpi_completion_rate']);

        $kpiRow = collect($response->json('kpi_completion_rates'))->first();
        $this->assertEquals(60.0, $kpiRow['completion_rate']);
    }

    public function test_pending_approvals_counts_only_submitted_timesheets(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();

        $this->dayOfMinutes($employee, '2026-01-05', 240, 'submitted');
        $this->dayOfMinutes($employee, '2026-01-06', 240, 'approved');
        $this->dayOfMinutes($employee, '2026-01-07', 240, 'revision_requested');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/dashboard?date=2026-01-10');

        $this->assertSame(1, $response->json('pending_approvals'));
    }

    public function test_attendance_trends_cover_every_day_in_the_period_with_correct_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $employeeA = User::factory()->create();
        $employeeB = User::factory()->create();

        $this->dayOfMinutes($employeeA, '2026-01-05', 240, 'approved');
        $this->dayOfMinutes($employeeB, '2026-01-05', 120, 'submitted');
        $this->dayOfMinutes($employeeA, '2026-01-06', 240, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/dashboard?date=2026-01-10');

        $trend = collect($response->json('attendance_trends'));
        $this->assertCount(15, $trend);
        $this->assertSame(2, $trend->firstWhere('date', '2026-01-05')['employee_count']);
        $this->assertSame(1, $trend->firstWhere('date', '2026-01-06')['employee_count']);
        $this->assertSame(0, $trend->firstWhere('date', '2026-01-08')['employee_count']);
    }

    public function test_billable_and_non_billable_split_and_project_allocation(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $project = Project::factory()->create(['name' => 'Website Redesign']);

        $this->dayOfMinutes($employee, '2026-01-05', 300, 'approved', $project);
        $this->dayOfMinutes($employee, '2026-01-06', 100, 'approved');
        // Pending day must not count toward billable/non-billable at all.
        $this->dayOfMinutes($employee, '2026-01-07', 999, 'submitted', $project);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/dashboard?date=2026-01-10');

        $this->assertSame(300, $response->json('billable_minutes'));
        $this->assertSame(100, $response->json('non_billable_minutes'));

        $allocation = collect($response->json('project_allocation'))->firstWhere('project_name', 'Website Redesign');
        $this->assertSame(300, $allocation['approved_minutes']);
    }

    public function test_payroll_summary_totals_are_computed_correctly(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['hourly_rate' => 20]);
        $unratedEmployee = User::factory()->create(['hourly_rate' => null]);

        // 8h + 10h approved days => 16h regular, 2h overtime for the rated employee.
        $this->dayOfMinutes($employee, '2026-01-05', 480, 'approved');
        $this->dayOfMinutes($employee, '2026-01-06', 600, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/dashboard?date=2026-01-10');

        $summary = $response->json('payroll_summary');
        // (16h x $20) + (2h x $20 x 1.25) = 320 + 50 = 370.
        $this->assertEquals(370.0, $summary['total_estimated_payroll']);
        $this->assertSame(960, $summary['total_regular_minutes']);
        $this->assertSame(120, $summary['total_overtime_minutes']);
        $this->assertSame(1, $summary['employees_with_rate_count']);
        // admin + unrated employee.
        $this->assertSame(2, $summary['employees_without_rate_count']);
    }

    public function test_supervisor_dashboard_is_scoped_to_their_own_department_only(): void
    {
        $ownDepartment = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $ownDepartment->id]);
        $ownEmployee = User::factory()->create(['department_id' => $ownDepartment->id]);
        $otherEmployee = User::factory()->create(['department_id' => $otherDepartment->id]);

        $this->dayOfMinutes($ownEmployee, '2026-01-05', 240, 'approved');
        $this->dayOfMinutes($otherEmployee, '2026-01-05', 480, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->getJson('/api/dashboard?date=2026-01-10');

        // Only the Supervisor's own department's 240 minutes, not the other
        // department's 480.
        $this->assertSame(240, $response->json('total_hours_minutes'));
        $this->assertCount(1, $response->json('department_performance'));
    }
}
