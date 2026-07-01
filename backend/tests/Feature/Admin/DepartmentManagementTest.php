<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentManagementTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_admin_can_create_list_update_and_delete_departments(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);

        $create = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/departments', ['name' => 'Engineering']);
        $create->assertCreated();
        $departmentId = $create->json('id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/departments')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.users_count', 0);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/departments/{$departmentId}", ['name' => 'Engineering & Product'])
            ->assertOk()
            ->assertJsonPath('name', 'Engineering & Product');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/departments/{$departmentId}")
            ->assertStatus(204);
    }

    public function test_department_index_reports_accurate_user_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);

        $engineering = Department::factory()->create();
        $marketing = Department::factory()->create();
        User::factory()->count(2)->create(['department_id' => $engineering->id]);
        User::factory()->create(['department_id' => $marketing->id]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/departments')
            ->assertOk();

        $counts = collect($response->json())->pluck('users_count', 'id');

        $this->assertSame(2, $counts[$engineering->id]);
        $this->assertSame(1, $counts[$marketing->id]);
    }

    public function test_non_admin_roles_are_forbidden_from_department_endpoints(): void
    {
        $supervisor = User::factory()->role(UserRole::Supervisor)->create();
        $department = Department::factory()->create();

        $token = $this->tokenFor($supervisor);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/departments')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/departments', ['name' => 'New Dept'])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/departments/{$department->id}", ['name' => 'Renamed'])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/departments/{$department->id}")
            ->assertStatus(403);
    }
}
