<?php

namespace Tests\Feature\Admin;

use App\Enums\UserStatus;
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
                'password' => 'password',
                'role' => 'employee',
                'department_id' => $department->id,
            ]);

        $response->assertCreated()->assertJsonPath('status', 'pending');
        $this->assertDatabaseHas('users', [
            'email' => 'new.employee@example.com',
            'status' => UserStatus::Pending->value,
        ]);
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
                    'password' => 'password',
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
