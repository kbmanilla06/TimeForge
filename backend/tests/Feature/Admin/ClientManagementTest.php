<?php

namespace Tests\Feature\Admin;

use App\Enums\UserRole;
use App\Models\Client;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientManagementTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_admin_can_create_list_update_and_delete_clients(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);

        $create = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/clients', ['name' => 'Acme Corp']);
        $create->assertCreated();
        $clientId = $create->json('id');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/clients')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.projects_count', 0);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/clients/{$clientId}", ['name' => 'Acme Corporation'])
            ->assertOk()
            ->assertJsonPath('name', 'Acme Corporation');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/clients/{$clientId}")
            ->assertStatus(204);
    }

    public function test_client_index_reports_accurate_project_counts(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);

        $acme = Client::factory()->create();
        $globex = Client::factory()->create();
        Project::factory()->count(2)->create(['client_id' => $acme->id]);
        Project::factory()->create(['client_id' => $globex->id]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/clients')
            ->assertOk();

        $counts = collect($response->json())->pluck('projects_count', 'id');

        $this->assertSame(2, $counts[$acme->id]);
        $this->assertSame(1, $counts[$globex->id]);
    }

    public function test_deleting_a_client_unlinks_rather_than_deletes_its_projects(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $this->tokenFor($admin);

        $client = Client::factory()->create();
        $project = Project::factory()->create(['client_id' => $client->id]);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/clients/{$client->id}")
            ->assertStatus(204);

        $this->assertDatabaseHas('projects', ['id' => $project->id, 'client_id' => null]);
    }

    public function test_non_admin_roles_are_forbidden_from_client_endpoints(): void
    {
        $supervisor = User::factory()->role(UserRole::Supervisor)->create();
        $client = Client::factory()->create();

        $token = $this->tokenFor($supervisor);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/clients')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/admin/clients', ['name' => 'New Client'])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/clients/{$client->id}", ['name' => 'Renamed'])
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->deleteJson("/api/admin/clients/{$client->id}")
            ->assertStatus(403);
    }
}
