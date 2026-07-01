<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Client;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SelfServiceCatalogTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_non_admin_can_read_projects_and_clients(): void
    {
        $employee = User::factory()->role(UserRole::Employee)->create();
        $client = Client::factory()->create();
        Project::factory()->create(['client_id' => $client->id]);
        $token = $this->tokenFor($employee);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/projects')
            ->assertOk()
            ->assertJsonCount(1);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(1);
    }

    public function test_non_admin_cannot_write_via_the_self_service_endpoints(): void
    {
        $employee = User::factory()->role(UserRole::Employee)->create();
        $token = $this->tokenFor($employee);

        // The self-service routes only expose GET; POST/PATCH/DELETE to the
        // same paths should not resolve to any write action (405/404), and
        // must never reach the admin-only create/update/destroy behavior.
        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/projects', ['name' => 'Should not be creatable'])
            ->assertStatus(405);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/clients', ['name' => 'Should not be creatable'])
            ->assertStatus(405);
    }

    public function test_unauthenticated_requests_to_self_service_endpoints_are_rejected(): void
    {
        $this->getJson('/api/projects')->assertStatus(401);
        $this->getJson('/api/clients')->assertStatus(401);
    }
}
