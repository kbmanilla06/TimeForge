<?php

namespace Tests\Feature\Auth;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_user_can_log_in(): void
    {
        $user = User::factory()->create(['password' => 'password']);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk()->assertJsonStructure(['user', 'token']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'login.success', 'actor_id' => $user->id]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create(['password' => 'password']);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('audit_logs', ['action' => 'login.failed', 'subject_id' => $user->id]);
    }

    public function test_pending_user_cannot_log_in(): void
    {
        $user = User::factory()->pending()->create(['password' => 'password']);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(422);
    }

    public function test_deactivated_user_cannot_log_in(): void
    {
        $user = User::factory()->deactivated()->create(['password' => 'password']);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertStatus(422);
    }

    public function test_deactivated_user_token_stops_working(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $user->update(['status' => \App\Enums\UserStatus::Deactivated]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me');

        $response->assertStatus(403);
    }

    public function test_authenticated_user_can_fetch_me(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me');

        $response->assertOk()->assertJsonPath('user.id', $user->id);
    }

    /**
     * Sprint 21: /me and /login now eager-load the user's department (name
     * + description) so the Home dashboard doesn't need a second request.
     */
    public function test_me_and_login_include_the_users_department_with_its_description(): void
    {
        $department = \App\Models\Department::factory()->create([
            'name' => 'Engineering',
            'description' => 'Builds the product.',
        ]);
        $user = User::factory()->create(['password' => 'password', 'department_id' => $department->id]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('user.department.name', 'Engineering')
            ->assertJsonPath('user.department.description', 'Builds the product.');

        $token = $user->createToken('api')->plainTextToken;
        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.department.name', 'Engineering')
            ->assertJsonPath('user.department.description', 'Builds the product.');
    }

    public function test_me_department_is_null_when_the_user_has_no_department(): void
    {
        $user = User::factory()->create(['department_id' => null]);
        $token = $user->createToken('api')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.department', null);
    }

    public function test_user_can_log_out(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertOk();

        // Asserted against the database rather than a second simulated
        // request: Laravel's Sanctum guard caches the resolved user on its
        // guard instance for the lifetime of the test's container, so a
        // second in-process request can return a stale "still authenticated"
        // result even though the token row is gone. A fresh request in a
        // real deployment would correctly receive a 401.
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseHas('audit_logs', ['action' => 'logout', 'actor_id' => $user->id]);
    }
}
