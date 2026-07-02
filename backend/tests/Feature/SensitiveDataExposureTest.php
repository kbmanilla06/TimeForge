<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Sprint 14 security review: hourly_rate is payroll data, restricted to
 * Admin and HR/Finance since Sprint 8 — it must never serialize into the
 * review-facing responses that embed User models (e.g., a Supervisor
 * viewing a timesheet), while the Admin user-management responses (which
 * legitimately edit rates) keep it explicitly.
 */
class SensitiveDataExposureTest extends TestCase
{
    use RefreshDatabase;

    public function test_timesheet_responses_do_not_expose_employee_hourly_rates_to_supervisors(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id, 'hourly_rate' => 55.5]);
        $timesheet = Timesheet::factory()->create(['user_id' => $employee->id]);

        $token = $supervisor->createToken('api')->plainTextToken;

        $show = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson("/api/timesheets/{$timesheet->id}");
        $show->assertOk();
        $this->assertSame($employee->name, $show->json('user.name'));
        $this->assertArrayNotHasKey('hourly_rate', $show->json('user'));

        $team = $this->getJson('/api/timesheets/team');
        $team->assertOk();
        $this->assertArrayNotHasKey('hourly_rate', $team->json('0.user'));
    }

    public function test_admin_user_management_responses_still_include_hourly_rate(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['hourly_rate' => 20]);

        $response = $this->withHeader('Authorization', 'Bearer '.$admin->createToken('api')->plainTextToken)
            ->getJson('/api/admin/users');

        $response->assertOk();
        // The admin UI edits rates, so this surface keeps the field.
        $this->assertArrayHasKey('hourly_rate', $response->json('0'));
    }

    public function test_me_response_does_not_expose_hourly_rate(): void
    {
        $user = User::factory()->create(['hourly_rate' => 33]);

        $response = $this->withHeader('Authorization', 'Bearer '.$user->createToken('api')->plainTextToken)
            ->getJson('/api/me');

        $response->assertOk();
        $this->assertArrayNotHasKey('hourly_rate', $response->json('user'));
        $this->assertArrayNotHasKey('password', $response->json('user'));
    }
}
