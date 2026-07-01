<?php

namespace Tests\Feature;

use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PayrollTest extends TestCase
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
            'reviewed_by' => $status === 'submitted' ? null : User::factory(),
            'reviewed_at' => $status === 'submitted' ? null : now(),
        ]);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes($minutes),
            'timesheet_id' => $timesheet->id,
        ]);
    }

    private function summaryFor(array $response, int $userId): ?array
    {
        return collect($response)->firstWhere('user_id', $userId);
    }

    public function test_admin_and_hr_finance_can_view_payroll(): void
    {
        $admin = User::factory()->admin()->create();
        $hr = User::factory()->hrFinance()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/payroll')
            ->assertOk();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($hr))
            ->getJson('/api/payroll')
            ->assertOk();
    }

    public function test_supervisor_and_employee_cannot_view_payroll(): void
    {
        $supervisor = User::factory()->supervisor()->create();
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->getJson('/api/payroll')
            ->assertStatus(403);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/payroll')
            ->assertStatus(403);
    }

    public function test_estimated_payroll_formula_with_overtime(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['hourly_rate' => 20]);

        // One approved 8-hour day (regular only) and one approved 10-hour
        // day (8h regular + 2h overtime), both within the 2026-01-01..15 period.
        $this->dayOfMinutes($employee, '2026-01-05', 480, 'approved');
        $this->dayOfMinutes($employee, '2026-01-06', 600, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/payroll?date=2026-01-10');

        $response->assertOk();
        $row = $this->summaryFor($response->json(), $employee->id);

        // Regular: 480 + 480 = 960 minutes (16h). Overtime: 0 + 120 = 120 minutes (2h).
        $this->assertSame(960, $row['regular_minutes']);
        $this->assertSame(120, $row['overtime_minutes']);
        $this->assertSame(1080, $row['approved_minutes']);
        $this->assertSame(2, $row['attendance_days']);

        // (16h x $20) + (2h x $20 x 1.25) = 320 + 50 = 370.
        $this->assertEquals(370.0, $row['estimated_payroll']);
    }

    public function test_pending_and_rejected_hours_are_bucketed_separately_from_approved(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['hourly_rate' => 10]);

        $this->dayOfMinutes($employee, '2026-01-05', 240, 'submitted');
        $this->dayOfMinutes($employee, '2026-01-06', 120, 'rejected');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/payroll?date=2026-01-10');

        $row = $this->summaryFor($response->json(), $employee->id);

        $this->assertSame(0, $row['approved_minutes']);
        $this->assertSame(240, $row['pending_minutes']);
        $this->assertSame(120, $row['rejected_minutes']);
        $this->assertEquals(0.0, $row['estimated_payroll']);
    }

    public function test_unsubmitted_entries_count_toward_attendance_but_no_bucket(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();
        $today = Carbon::today();

        TimeEntry::factory()->create([
            'user_id' => $employee->id,
            'date' => $today->toDateString(),
            'start_time' => $today->copy()->setTime(9, 0),
            'end_time' => $today->copy()->setTime(11, 0),
            'timesheet_id' => null,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/payroll');

        $row = $this->summaryFor($response->json(), $employee->id);

        $this->assertSame(1, $row['attendance_days']);
        $this->assertSame(0, $row['approved_minutes']);
        $this->assertSame(0, $row['pending_minutes']);
        $this->assertSame(0, $row['rejected_minutes']);
    }

    public function test_estimated_payroll_is_null_without_an_hourly_rate(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['hourly_rate' => null]);
        $this->dayOfMinutes($employee, Carbon::today()->toDateString(), 480, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/payroll');

        $row = $this->summaryFor($response->json(), $employee->id);

        $this->assertNull($row['hourly_rate']);
        $this->assertNull($row['estimated_payroll']);
    }

    public function test_a_date_outside_the_requested_period_is_excluded(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create(['hourly_rate' => 15]);

        // Belongs to the 1st-15th period.
        $this->dayOfMinutes($employee, '2026-01-05', 480, 'approved');

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/payroll?date=2026-01-20');

        $row = $this->summaryFor($response->json(), $employee->id);

        $this->assertSame(0, $row['approved_minutes']);
        $this->assertSame(0, $row['attendance_days']);
        $this->assertSame('2026-01-16', $row['period_start']);
        $this->assertSame('2026-01-31', $row['period_end']);
    }

    public function test_deactivated_users_are_excluded_from_the_summary(): void
    {
        $admin = User::factory()->admin()->create();
        $deactivated = User::factory()->deactivated()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/payroll');

        $this->assertNull($this->summaryFor($response->json(), $deactivated->id));
    }
}
