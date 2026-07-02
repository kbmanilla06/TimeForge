<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Sprint 14 hardening: rate limiting did not exist before this sprint.
 * The "auth" limiter (5/min per email+IP) guards the public credential
 * endpoints against brute force; the "api" limiter (60/min per user)
 * caps authenticated traffic far above legitimate SPA usage.
 */
class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_attempts_are_throttled_after_five_per_minute(): void
    {
        User::factory()->create(['email' => 'target@timeforge.test']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => 'target@timeforge.test',
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/login', [
            'email' => 'target@timeforge.test',
            'password' => 'wrong-password',
        ])->assertStatus(429);

        // The limiter is keyed per email+IP: another account is unaffected.
        $this->postJson('/api/login', [
            'email' => 'someone-else@timeforge.test',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_forgot_password_is_throttled_after_five_per_minute(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/forgot-password', ['email' => 'nobody@timeforge.test']);
        }

        $this->postJson('/api/forgot-password', ['email' => 'nobody@timeforge.test'])
            ->assertStatus(429);
    }

    public function test_authenticated_api_requests_are_throttled_after_sixty_per_minute(): void
    {
        $user = User::factory()->create();
        $this->withHeader('Authorization', 'Bearer '.$user->createToken('api')->plainTextToken);

        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/me')->assertOk();
        }

        $this->getJson('/api/me')->assertStatus(429);
    }
}
