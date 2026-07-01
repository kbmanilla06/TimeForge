<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserDepartmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_supervisors_team_is_every_user_sharing_their_department(): void
    {
        $engineering = Department::factory()->create();
        $marketing = Department::factory()->create();

        $supervisor = User::factory()->role(UserRole::Supervisor)->create(['department_id' => $engineering->id]);
        $teammate = User::factory()->create(['department_id' => $engineering->id]);
        $otherDepartmentUser = User::factory()->create(['department_id' => $marketing->id]);

        $team = User::where('department_id', $supervisor->department_id)->pluck('id');

        $this->assertTrue($team->contains($teammate->id));
        $this->assertFalse($team->contains($otherDepartmentUser->id));
        $this->assertSame($engineering->id, $supervisor->department->id);
    }
}
