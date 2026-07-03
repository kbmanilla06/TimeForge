<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

    public function test_forgot_password_sends_a_reset_link_for_known_email(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $response = $this->postJson('/api/forgot-password', [
            'email' => $user->email,
        ]);

        $response->assertOk()->assertJson(['message' => self::GENERIC_MESSAGE]);
        Notification::assertSentTo($user, ResetPassword::class);
    }

    /**
     * Sprint 18 hardening: an unknown email must be indistinguishable from
     * a known one — same status code, same message, no notification sent —
     * so the endpoint can't be used to enumerate registered accounts.
     */
    public function test_forgot_password_gives_an_identical_generic_response_for_an_unknown_email(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'nobody@timeforge.test',
        ]);

        $response->assertOk()->assertJson(['message' => self::GENERIC_MESSAGE]);
        Notification::assertNothingSent();
    }

    public function test_forgot_password_response_is_identical_regardless_of_account_existence(): void
    {
        $user = User::factory()->create();

        $known = $this->postJson('/api/forgot-password', ['email' => $user->email]);
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@timeforge.test']);

        $this->assertSame($known->status(), $unknown->status());
        $this->assertSame($known->json('message'), $unknown->json('message'));
    }

    public function test_password_reset_email_links_to_the_frontend_reset_page(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, function (ResetPassword $notification) use ($user) {
            $url = $notification->toMail($user)->actionUrl;

            return str_starts_with($url, rtrim(config('app.frontend_url'), '/').'/reset-password/')
                && str_contains($url, 'email='.urlencode($user->email));
        });
    }

    public function test_reset_password_with_valid_token_updates_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);

        $token = Password::createToken($user);

        $response = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertOk();

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'new-password',
        ]);

        $login->assertOk();
    }

    public function test_reset_password_with_invalid_token_fails(): void
    {
        $user = User::factory()->create();

        $response = $this->postJson('/api/reset-password', [
            'token' => 'not-a-real-token',
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ]);

        $response->assertStatus(422);
    }

    public function test_reset_password_token_cannot_be_reused(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        $token = Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $replay = $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'another-password',
            'password_confirmation' => 'another-password',
        ]);

        $replay->assertStatus(422);
    }
}
