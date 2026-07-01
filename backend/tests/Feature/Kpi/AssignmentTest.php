<?php

namespace Tests\Feature\Kpi;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Kpi;
use App\Models\KpiAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestResponse;
use Tests\TestCase;

class AssignmentTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    /**
     * Sanctum caches the resolved guard user for the test's container
     * lifetime; forgetting guards forces fresh auth when a test switches
     * actors within one method (same fix used in Sprint 5's ReviewTest).
     */
    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    public function test_admin_can_assign_a_kpi_to_any_user(): void
    {
        $admin = User::factory()->admin()->create();
        $kpi = Kpi::factory()->create();
        $employee = User::factory()->create();

        $this->withAuth($admin)
            ->postJson('/api/kpi-assignments', ['kpi_id' => $kpi->id, 'user_id' => $employee->id])
            ->assertCreated()
            ->assertJsonPath('user_id', $employee->id);
    }

    public function test_admin_can_assign_a_kpi_to_any_department(): void
    {
        $admin = User::factory()->admin()->create();
        $kpi = Kpi::factory()->create();
        $department = Department::factory()->create();

        $this->withAuth($admin)
            ->postJson('/api/kpi-assignments', ['kpi_id' => $kpi->id, 'department_id' => $department->id])
            ->assertCreated()
            ->assertJsonPath('department_id', $department->id);
    }

    public function test_supervisor_can_assign_a_kpi_to_a_user_in_their_own_department(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        $kpi = Kpi::factory()->create();

        $this->withAuth($supervisor)
            ->postJson('/api/kpi-assignments', ['kpi_id' => $kpi->id, 'user_id' => $employee->id])
            ->assertCreated();
    }

    public function test_supervisor_can_assign_a_kpi_to_their_own_department(): void
    {
        $department = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $kpi = Kpi::factory()->create();

        $this->withAuth($supervisor)
            ->postJson('/api/kpi-assignments', ['kpi_id' => $kpi->id, 'department_id' => $department->id])
            ->assertCreated();
    }

    public function test_supervisor_cannot_assign_a_kpi_to_a_user_outside_their_department(): void
    {
        $departmentA = Department::factory()->create();
        $departmentB = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $departmentA->id]);
        $outsider = User::factory()->create(['department_id' => $departmentB->id]);
        $kpi = Kpi::factory()->create();

        $this->withAuth($supervisor)
            ->postJson('/api/kpi-assignments', ['kpi_id' => $kpi->id, 'user_id' => $outsider->id])
            ->assertStatus(422);
    }

    public function test_supervisor_cannot_assign_a_kpi_to_a_different_department(): void
    {
        $ownDepartment = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $ownDepartment->id]);
        $kpi = Kpi::factory()->create();

        $this->withAuth($supervisor)
            ->postJson('/api/kpi-assignments', ['kpi_id' => $kpi->id, 'department_id' => $otherDepartment->id])
            ->assertStatus(422);
    }

    public function test_assignment_must_target_exactly_one_of_user_or_department(): void
    {
        $admin = User::factory()->admin()->create();
        $kpi = Kpi::factory()->create();
        $employee = User::factory()->create();
        $department = Department::factory()->create();

        $this->withAuth($admin)
            ->postJson('/api/kpi-assignments', ['kpi_id' => $kpi->id])
            ->assertStatus(422);

        $this->withAuth($admin)
            ->postJson('/api/kpi-assignments', [
                'kpi_id' => $kpi->id,
                'user_id' => $employee->id,
                'department_id' => $department->id,
            ])
            ->assertStatus(422);
    }

    public function test_employee_sees_only_their_own_individual_and_department_assignments(): void
    {
        $department = Department::factory()->create();
        $employee = User::factory()->create(['department_id' => $department->id]);
        $coworker = User::factory()->create(['department_id' => $department->id]);
        $kpi = Kpi::factory()->create();

        $ownAssignment = KpiAssignment::factory()->create(['kpi_id' => $kpi->id, 'user_id' => $employee->id]);
        $departmentAssignment = KpiAssignment::factory()->create([
            'kpi_id' => $kpi->id,
            'user_id' => null,
            'department_id' => $department->id,
        ]);
        KpiAssignment::factory()->create(['kpi_id' => $kpi->id, 'user_id' => $coworker->id]);

        $response = $this->withAuth($employee)->getJson('/api/kpi-assignments/mine');

        $response->assertOk()->assertJsonCount(2);
        $ids = collect($response->json())->pluck('id');
        $this->assertTrue($ids->contains($ownAssignment->id));
        $this->assertTrue($ids->contains($departmentAssignment->id));
    }

    public function test_supervisor_team_view_includes_whole_department_but_not_other_departments(): void
    {
        $department = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        $kpi = Kpi::factory()->create();

        $inDept = KpiAssignment::factory()->create(['kpi_id' => $kpi->id, 'user_id' => $employee->id]);
        KpiAssignment::factory()->create([
            'kpi_id' => $kpi->id,
            'user_id' => User::factory()->create(['department_id' => $otherDepartment->id])->id,
        ]);

        $response = $this->withAuth($supervisor)->getJson('/api/kpi-assignments/team');

        $response->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $inDept->id);
    }

    public function test_admin_team_view_includes_every_department(): void
    {
        $admin = User::factory()->admin()->create();
        KpiAssignment::factory()->count(2)->create();

        $this->withAuth($admin)
            ->getJson('/api/kpi-assignments/team')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_plain_employee_cannot_view_a_team(): void
    {
        $employee = User::factory()->create();

        $this->withAuth($employee)
            ->getJson('/api/kpi-assignments/team')
            ->assertStatus(403);
    }

    public function test_admin_can_delete_any_assignment(): void
    {
        $admin = User::factory()->admin()->create();
        $assignment = KpiAssignment::factory()->create();

        $this->withAuth($admin)
            ->deleteJson("/api/kpi-assignments/{$assignment->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('kpi_assignments', ['id' => $assignment->id]);
    }

    public function test_supervisor_cannot_delete_an_assignment_outside_their_department(): void
    {
        $department = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $assignment = KpiAssignment::factory()->create([
            'user_id' => User::factory()->create(['department_id' => $otherDepartment->id])->id,
        ]);

        $this->withAuth($supervisor)
            ->deleteJson("/api/kpi-assignments/{$assignment->id}")
            ->assertStatus(403);
    }
}
