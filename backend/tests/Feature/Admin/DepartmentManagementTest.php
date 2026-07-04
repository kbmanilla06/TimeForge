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

    public function test_admin_can_create_a_department_with_a_description(): void
    {
        $admin = User::factory()->admin()->create();
        $description = "Paragraph one about the department.\n\nParagraph two with more detail.";

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->postJson('/api/admin/departments', [
                'name' => 'Engineering',
                'description' => $description,
            ]);

        $response->assertCreated()->assertJsonPath('description', $description);
        $this->assertSame($description, Department::where('name', 'Engineering')->firstOrFail()->description);
    }

    public function test_creating_a_department_without_a_description_leaves_it_null(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->postJson('/api/admin/departments', ['name' => 'Marketing']);

        $response->assertCreated()->assertJsonPath('description', null);
    }

    public function test_admin_can_set_a_multi_paragraph_department_description(): void
    {
        $admin = User::factory()->admin()->create();
        $department = Department::factory()->create();
        $description = "Paragraph one about the department.\n\nParagraph two with more detail.";

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/departments/{$department->id}", [
                'name' => $department->name,
                'description' => $description,
            ]);

        $response->assertOk()->assertJsonPath('description', $description);
        $this->assertSame($description, $department->fresh()->description);
    }

    public function test_department_description_is_optional(): void
    {
        $admin = User::factory()->admin()->create();
        $department = Department::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/departments/{$department->id}", ['name' => $department->name])
            ->assertOk()
            ->assertJsonPath('description', null);
    }

    public function test_non_admin_cannot_set_a_department_description(): void
    {
        $supervisor = User::factory()->role(UserRole::Supervisor)->create();
        $department = Department::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->patchJson("/api/admin/departments/{$department->id}", [
                'name' => $department->name,
                'description' => 'Should not be allowed.',
            ])
            ->assertStatus(403);

        $this->assertNull($department->fresh()->description);
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
