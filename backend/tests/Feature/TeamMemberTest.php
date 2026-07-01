<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamMemberTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_supervisor_sees_only_their_own_department_members(): void
    {
        $department = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $employee = User::factory()->create(['department_id' => $department->id]);
        User::factory()->create(['department_id' => $otherDepartment->id]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($supervisor))
            ->getJson('/api/team-members');

        $response->assertOk();
        $ids = collect($response->json())->pluck('id');
        $this->assertTrue($ids->contains($supervisor->id));
        $this->assertTrue($ids->contains($employee->id));
        $this->assertCount(2, $ids);
    }

    public function test_admin_sees_every_user(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(3)->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/team-members');

        $response->assertOk()->assertJsonCount(4);
    }

    public function test_plain_employee_cannot_view_team_members(): void
    {
        $employee = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/team-members')
            ->assertStatus(403);
    }
}
