<?php

namespace Tests\Feature;

use App\Models\Holiday;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HolidayTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_any_authenticated_user_can_list_holidays(): void
    {
        $employee = User::factory()->create();
        Holiday::factory()->create(['date' => '2026-12-25', 'name' => 'Christmas']);
        Holiday::factory()->create(['date' => '2026-01-01', 'name' => "New Year's Day"]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/holidays');

        $response->assertOk()->assertJsonCount(2);
        // Ordered by date ascending.
        $response->assertJsonPath('0.name', "New Year's Day");
        $response->assertJsonPath('1.name', 'Christmas');
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/holidays', ['Accept' => 'application/json'])->assertStatus(401);
    }

    public function test_admin_can_create_a_holiday(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->postJson('/api/admin/holidays', ['date' => '2026-12-25', 'name' => 'Christmas']);

        $response->assertCreated()->assertJsonPath('name', 'Christmas');
        $this->assertDatabaseHas('holidays', ['date' => '2026-12-25', 'name' => 'Christmas', 'created_by' => $admin->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'holiday.created']);
    }

    public function test_non_admin_cannot_create_a_holiday(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->postJson('/api/admin/holidays', ['date' => '2026-12-25', 'name' => 'Christmas'])
            ->assertStatus(403);
    }

    public function test_duplicate_holiday_date_is_rejected(): void
    {
        $admin = User::factory()->admin()->create();
        Holiday::factory()->create(['date' => '2026-12-25']);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->postJson('/api/admin/holidays', ['date' => '2026-12-25', 'name' => 'Christmas (again)'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['date']);
    }

    public function test_admin_can_update_a_holiday(): void
    {
        $admin = User::factory()->admin()->create();
        $holiday = Holiday::factory()->create(['date' => '2026-12-25', 'name' => 'Christmas']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/holidays/{$holiday->id}", ['name' => "Christmas Day"]);

        $response->assertOk()->assertJsonPath('name', 'Christmas Day');
        $this->assertDatabaseHas('audit_logs', ['action' => 'holiday.updated']);
    }

    public function test_admin_can_delete_a_holiday(): void
    {
        $admin = User::factory()->admin()->create();
        $holiday = Holiday::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->deleteJson("/api/admin/holidays/{$holiday->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('holidays', ['id' => $holiday->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'holiday.deleted']);
    }

    public function test_non_admin_cannot_delete_a_holiday(): void
    {
        $employee = User::factory()->create();
        $holiday = Holiday::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->deleteJson("/api/admin/holidays/{$holiday->id}")
            ->assertStatus(403);
    }
}
