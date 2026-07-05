<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\Client;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectManagementTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_admin_can_create_list_update_and_delete_projects(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);
        $client = Client::factory()->create();

        $create = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/projects', ['name' => 'Website Redesign', 'client_id' => $client->id]);
        $create->assertCreated();
        $projectId = $create->json('id');
        $this->assertDatabaseHas('audit_logs', ['action' => 'project.created', 'subject_id' => $projectId]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/projects')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.client.id', $client->id);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/projects/{$projectId}", ['name' => 'Website Redesign v2', 'client_id' => null])
            ->assertOk()
            ->assertJsonPath('name', 'Website Redesign v2')
            ->assertJsonPath('client', null);
        $this->assertDatabaseHas('audit_logs', ['action' => 'project.updated', 'subject_id' => $projectId]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/projects/{$projectId}")
            ->assertStatus(204);
        $this->assertDatabaseHas('audit_logs', ['action' => 'project.deleted', 'subject_id' => $projectId]);
    }

    public function test_project_can_be_created_without_a_client(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/projects', ['name' => 'Internal Tooling'])
            ->assertCreated()
            ->assertJsonPath('client_id', null);
    }

    public function test_project_creation_rejects_an_unknown_client_id(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/projects', ['name' => 'Ghost Project', 'client_id' => 99999])
            ->assertStatus(422);
    }

    public function test_non_admin_roles_are_forbidden_from_project_endpoints(): void
    {
        $supervisor = User::factory()->role(UserRole::Supervisor)->create();
        $project = Project::factory()->create();

        $token = $this->tokenFor($supervisor);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/projects')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/projects', ['name' => 'New Project'])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/projects/{$project->id}", ['name' => 'Renamed'])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/projects/{$project->id}")
            ->assertStatus(403);
    }
}
