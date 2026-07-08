<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_admin_can_list_users(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(2)->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/users');

        $response->assertOk()->assertJsonCount(3);
    }

    public function test_admin_can_create_a_user_that_starts_pending(): void
    {
        $admin = User::factory()->admin()->create();
        $department = Department::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->postJson('/api/admin/users', [
                'name' => 'New Employee',
                'email' => 'new.employee@example.com',
                'password' => 'Str0ng!Passw0rd',
                'role' => 'employee',
                'department_id' => $department->id,
            ]);

        $response->assertCreated()->assertJsonPath('status', 'pending');
        $this->assertDatabaseHas('users', [
            'email' => 'new.employee@example.com',
            'status' => UserStatus::Pending->value,
        ]);
    }

    public function test_admin_can_set_an_employees_hourly_rate(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/users/{$employee->id}", ['hourly_rate' => 20.5]);

        $response->assertOk();
        $this->assertEquals(20.5, $employee->fresh()->hourly_rate);
    }

    public function test_admin_can_activate_and_deactivate_a_user(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->pending()->create();

        $activate = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/users/{$employee->id}/activate");
        $activate->assertOk()->assertJsonPath('status', 'active');

        $deactivate = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/users/{$employee->id}/deactivate");
        $deactivate->assertOk()->assertJsonPath('status', 'deactivated');

        $this->assertDatabaseHas('audit_logs', ['action' => 'user.activated', 'subject_id' => $employee->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.deactivated', 'subject_id' => $employee->id]);
    }

    public function test_changing_role_or_department_is_audit_logged(): void
    {
        $admin = User::factory()->admin()->create();
        $oldDepartment = Department::factory()->create();
        $newDepartment = Department::factory()->create();
        $employee = User::factory()->create(['role' => UserRole::Employee, 'department_id' => $oldDepartment->id]);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/users/{$employee->id}", [
                'role' => 'supervisor',
                'department_id' => $newDepartment->id,
            ])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'user.role_changed', 'subject_id' => $employee->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.department_changed', 'subject_id' => $employee->id]);

        $roleChange = AuditLog::where('action', 'user.role_changed')->where('subject_id', $employee->id)->sole();
        $this->assertSame(['old' => 'employee', 'new' => 'supervisor'], $roleChange->metadata);
    }

    public function test_updating_unrelated_fields_does_not_create_role_or_department_audit_entries(): void
    {
        $admin = User::factory()->admin()->create();
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/users/{$employee->id}", ['hourly_rate' => 30])
            ->assertOk();

        $this->assertDatabaseMissing('audit_logs', ['action' => 'user.role_changed']);
        $this->assertDatabaseMissing('audit_logs', ['action' => 'user.department_changed']);
    }

    public function test_admin_cannot_deactivate_themselves(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/users/{$admin->id}/deactivate");

        $response->assertStatus(403);
    }

    public function test_non_admin_roles_are_forbidden_from_admin_user_endpoints(): void
    {
        foreach (['employee', 'supervisor', 'hr_finance'] as $role) {
            $user = User::factory()->role(\App\Enums\UserRole::from($role))->create();
            $token = $this->tokenFor($user);

            $this->withHeader('Authorization', "Bearer {$token}")
                ->getJson('/api/admin/users')
                ->assertStatus(403);

            $this->withHeader('Authorization', "Bearer {$token}")
                ->postJson('/api/admin/users', [
                    'name' => 'Someone',
                    'email' => "someone-{$role}@example.com",
                    'password' => 'Str0ng!Passw0rd',
                    'role' => 'employee',
                ])
                ->assertStatus(403);
        }
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/admin/users')->assertStatus(401);
    }
}
