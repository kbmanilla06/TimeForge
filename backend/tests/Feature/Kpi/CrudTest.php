<?php

namespace Tests\Feature\Kpi;

use App\Models\Kpi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CrudTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_admin_can_create_a_kpi(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->postJson('/api/admin/kpis', [
                'name' => 'Bugs Resolved',
                'target_value' => 10,
                'unit' => 'bugs',
            ]);

        $response->assertCreated()->assertJsonPath('name', 'Bugs Resolved');

        $this->assertDatabaseHas('kpis', [
            'name' => 'Bugs Resolved',
            'target_value' => 10,
            'created_by' => $admin->id,
        ]);
    }

    public function test_kpi_target_and_unit_are_optional(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->postJson('/api/admin/kpis', ['name' => 'Sales Opportunities Generated'])
            ->assertCreated();
    }

    public function test_non_admin_cannot_create_a_kpi(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->postJson('/api/admin/kpis', ['name' => 'Bugs Resolved'])
            ->assertStatus(403);
    }

    public function test_any_active_user_can_read_the_kpi_catalog(): void
    {
        Kpi::factory()->create(['name' => 'Bugs Resolved']);
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/kpis')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Bugs Resolved']);
    }
}
