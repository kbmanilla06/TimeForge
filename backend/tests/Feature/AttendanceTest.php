<?php

namespace Tests\Feature;

use App\Models\AttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_today_returns_a_null_session_when_none_exists(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->getJson('/api/attendance/today')
            ->assertOk()
            ->assertExactJson(['session' => null]);
    }

    public function test_full_happy_path_time_in_pause_resume_time_out(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-06 09:00:00'));
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attendance/time-in')
            ->assertCreated()
            ->assertJsonPath('is_timed_out', false)
            ->assertJsonPath('has_used_break', false);

        Carbon::setTestNow(Carbon::parse('2026-07-06 12:00:00'));
        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/pause')
            ->assertOk()
            ->assertJsonPath('is_on_break', true);

        Carbon::setTestNow(Carbon::parse('2026-07-06 12:30:00'));
        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/resume')
            ->assertOk()
            ->assertJsonPath('is_on_break', false)
            ->assertJsonPath('break_minutes', 30);

        Carbon::setTestNow(Carbon::parse('2026-07-06 17:30:00'));
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/time-out')
            ->assertOk();

        // 9:00 -> 17:30 = 510 total minutes; 30 on break; 480 working.
        $response->assertJsonPath('total_minutes', 510)
            ->assertJsonPath('break_minutes', 30)
            ->assertJsonPath('working_minutes', 480)
            ->assertJsonPath('is_timed_out', true);
    }

    public function test_time_out_while_on_break_auto_resumes_then_clocks_out(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-06 09:00:00'));
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/attendance/time-in');

        Carbon::setTestNow(Carbon::parse('2026-07-06 12:00:00'));
        $this->withHeader('Authorization', "Bearer {$token}")->patchJson('/api/attendance/pause');

        Carbon::setTestNow(Carbon::parse('2026-07-06 12:15:00'));
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/time-out')
            ->assertOk();

        $response->assertJsonPath('is_on_break', false)
            ->assertJsonPath('is_timed_out', true)
            ->assertJsonPath('break_minutes', 15);
    }

    public function test_cannot_time_in_twice_in_one_day(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attendance/time-in')
            ->assertCreated();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attendance/time-in')
            ->assertStatus(422);
    }

    public function test_cannot_pause_without_an_active_session(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->patchJson('/api/attendance/pause')
            ->assertStatus(422);
    }

    public function test_cannot_pause_a_second_time_in_one_day(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/attendance/time-in');
        $this->withHeader('Authorization', "Bearer {$token}")->patchJson('/api/attendance/pause')->assertOk();
        $this->withHeader('Authorization', "Bearer {$token}")->patchJson('/api/attendance/resume')->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/pause')
            ->assertStatus(422);
    }

    public function test_cannot_resume_when_not_on_break(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/attendance/time-in');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/resume')
            ->assertStatus(422);
    }

    public function test_cannot_time_out_without_an_active_session(): void
    {
        $user = User::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->patchJson('/api/attendance/time-out')
            ->assertStatus(422);
    }

    public function test_cannot_act_again_after_timing_out(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/attendance/time-in');
        $this->withHeader('Authorization', "Bearer {$token}")->patchJson('/api/attendance/time-out')->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/time-out')
            ->assertStatus(422);
        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/attendance/pause')
            ->assertStatus(422);
    }

    public function test_cannot_time_in_again_after_completing_a_full_day(): void
    {
        $user = User::factory()->create();
        $token = $this->tokenFor($user);

        $this->withHeader('Authorization', "Bearer {$token}")->postJson('/api/attendance/time-in')->assertCreated();
        $this->withHeader('Authorization', "Bearer {$token}")->patchJson('/api/attendance/time-out')->assertOk();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/attendance/time-in')
            ->assertStatus(422);
    }

    public function test_users_cannot_see_or_affect_each_others_sessions(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();
        AttendanceSession::factory()->for($userA)->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($userB))
            ->getJson('/api/attendance/today')
            ->assertOk()
            ->assertExactJson(['session' => null]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/attendance/today', ['Accept' => 'application/json'])->assertStatus(401);
    }
}
