<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TeamHoursReportTrendTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    private function dayOfMinutes(User $user, string $date, int $minutes, string $status = 'approved'): void
    {
        $start = Carbon::parse($date)->setTime(9, 0);

        $timesheet = Timesheet::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'status' => $status,
            'reviewed_by' => User::factory(),
            'reviewed_at' => now(),
        ]);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes($minutes),
            'timesheet_id' => $timesheet->id,
        ]);
    }

    public function test_returns_six_consecutive_periods_ending_with_the_reference_date(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->get('/api/team-hours-report/trend?date=2026-07-04');

        $response->assertOk();
        $periods = $response->json();

        $this->assertCount(6, $periods);
        $this->assertSame(
            ['2026-04-16', '2026-05-01', '2026-05-16', '2026-06-01', '2026-06-16', '2026-07-01'],
            array_column($periods, 'period_start'),
        );
        $this->assertSame(
            ['2026-04-30', '2026-05-15', '2026-05-31', '2026-06-15', '2026-06-30', '2026-07-15'],
            array_column($periods, 'period_end'),
        );
    }

    public function test_supervisor_only_sees_their_own_departments_approved_minutes(): void
    {
        $department = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        $otherEmployee = User::factory()->create(['department_id' => $otherDepartment->id]);

        $this->dayOfMinutes($employee, '2026-07-02', 480, 'approved');
        $this->dayOfMinutes($otherEmployee, '2026-07-02', 480, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->get('/api/team-hours-report/trend?date=2026-07-04');

        $response->assertOk();
        $periods = collect($response->json());
        $currentPeriod = $periods->firstWhere('period_start', '2026-07-01');

        $this->assertSame(480, $currentPeriod['approved_minutes']);
    }

    public function test_admin_and_hr_finance_see_org_wide_approved_minutes(): void
    {
        $departmentA = Department::factory()->create();
        $departmentB = Department::factory()->create();
        $employeeA = User::factory()->create(['department_id' => $departmentA->id]);
        $employeeB = User::factory()->create(['department_id' => $departmentB->id]);

        $this->dayOfMinutes($employeeA, '2026-07-02', 480, 'approved');
        $this->dayOfMinutes($employeeB, '2026-07-02', 240, 'approved');

        foreach (['admin', 'hrFinance'] as $factoryState) {
            $requester = User::factory()->{$factoryState}()->create();

            $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($requester))
                ->get('/api/team-hours-report/trend?date=2026-07-04');

            $response->assertOk();
            $currentPeriod = collect($response->json())->firstWhere('period_start', '2026-07-01');
            $this->assertSame(720, $currentPeriod['approved_minutes']);
        }
    }

    public function test_employee_cannot_view_team_trend(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->get('/api/team-hours-report/trend')
            ->assertStatus(403);
    }

    public function test_pending_and_rejected_hours_are_excluded_from_approved_minutes(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);

        $this->dayOfMinutes($employee, '2026-07-02', 480, 'approved');
        $this->dayOfMinutes($employee, '2026-07-03', 300, 'submitted');
        $this->dayOfMinutes($employee, '2026-07-04', 200, 'rejected');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->get('/api/team-hours-report/trend?date=2026-07-04');

        $currentPeriod = collect($response->json())->firstWhere('period_start', '2026-07-01');
        $this->assertSame(480, $currentPeriod['approved_minutes']);
    }
}
