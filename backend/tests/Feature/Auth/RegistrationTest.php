<?php

namespace Tests\Feature\Auth;

use App\Enums\AccountRequestStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Department;
use App\Models\RegistrationOtp;
use App\Models\User;
use App\Notifications\NewAccountRequestSubmitted;
use App\Notifications\RegistrationOtpIssued;
use App\Notifications\RegistrationReceived;
use App\Support\OtpPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function validPayload(array $overrides = []): array
    {
        $department = Department::factory()->create();

        return array_merge([
            'first_name' => 'Jane',
            'middle_name' => 'Q',
            'last_name' => 'Applicant',
            'employee_id' => 'EMP-042',
            'department_id' => $department->id,
            'position' => 'Backend Engineer',
            'email' => 'jane.applicant@timeforge.test',
            'password' => 'Str0ng!Passw0rd',
            'password_confirmation' => 'Str0ng!Passw0rd',
            'contact_number' => '+1 555 0100',
            'terms_accepted' => true,
        ], $overrides);
    }

    public function test_registration_creates_a_pending_employee_and_a_submitted_account_request(): void
    {
        $response = $this->postJson('/api/register', $this->validPayload());

        $response->assertStatus(201)->assertJsonStructure(['message']);
        $response->assertJsonMissing(['token']);

        $user = User::where('email', 'jane.applicant@timeforge.test')->firstOrFail();
        $this->assertSame('Jane Q Applicant', $user->name);
        $this->assertSame(UserRole::Employee, $user->role);
        $this->assertSame(UserStatus::Pending, $user->status);
        $this->assertSame('EMP-042', $user->employee_id);
        $this->assertSame('Backend Engineer', $user->position);
        $this->assertSame('+1 555 0100', $user->contact_number);

        $this->assertNotNull($user->accountRequest);
        $this->assertSame(AccountRequestStatus::Submitted, $user->accountRequest->status);
        $this->assertNotNull($user->accountRequest->terms_accepted_at);
        $this->assertNull($user->accountRequest->reviewed_at);
    }

    public function test_registration_omits_middle_name_cleanly_from_the_stored_name(): void
    {
        $this->postJson('/api/register', $this->validPayload([
            'middle_name' => null,
            'email' => 'no.middle@timeforge.test',
        ]))->assertStatus(201);

        $user = User::where('email', 'no.middle@timeforge.test')->firstOrFail();
        $this->assertSame('Jane Applicant', $user->name);
    }

    public function test_registration_rejects_a_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@timeforge.test']);

        $response = $this->postJson('/api/register', $this->validPayload(['email' => 'taken@timeforge.test']));

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_registration_requires_first_name_last_name_department_and_terms(): void
    {
        $response = $this->postJson('/api/register', $this->validPayload([
            'first_name' => '',
            'last_name' => '',
            'department_id' => '',
            'terms_accepted' => false,
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors([
            'first_name', 'last_name', 'department_id', 'terms_accepted',
        ]);
    }

    public function test_registration_rejects_an_unknown_department(): void
    {
        $response = $this->postJson('/api/register', $this->validPayload(['department_id' => 999_999]));

        $response->assertStatus(422)->assertJsonValidationErrors('department_id');
    }

    public function test_registration_requires_password_confirmation_to_match(): void
    {
        $response = $this->postJson('/api/register', $this->validPayload([
            'password' => 'Str0ng!Passw0rd',
            'password_confirmation' => 'DoesNotMatch1!',
        ]));

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_registration_never_lets_the_applicant_choose_role_or_status(): void
    {
        $response = $this->postJson('/api/register', $this->validPayload([
            'role' => 'admin',
            'status' => 'active',
        ]));

        $response->assertStatus(201);

        $user = User::where('email', 'jane.applicant@timeforge.test')->firstOrFail();
        $this->assertSame(UserRole::Employee, $user->role);
        $this->assertSame(UserStatus::Pending, $user->status);
    }

    public function test_newly_registered_applicant_cannot_log_in_until_approved(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);

        $response = $this->postJson('/api/login', [
            'email' => 'jane.applicant@timeforge.test',
            'password' => 'Str0ng!Passw0rd',
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('not active yet', $response->json('message'));
    }

    public function test_public_departments_endpoint_lists_departments_without_authentication(): void
    {
        Department::factory()->create(['name' => 'Engineering']);
        Department::factory()->create(['name' => 'Marketing']);

        $response = $this->getJson('/api/register/departments');

        $response->assertOk();
        $this->assertCount(2, $response->json());
        $this->assertEqualsCanonicalizing(
            ['Engineering', 'Marketing'],
            collect($response->json())->pluck('name')->all(),
        );
    }

    /**
     * Sprint 19 hardening: before this fix, GET /register/departments
     * shared the "auth" limiter's email+IP bucket. With no email input it
     * always keyed to ''|{ip}, so six page loads in a minute could 429 a
     * legitimate applicant before they ever submitted the form. It now
     * has its own generous per-IP "lookup" limiter.
     */
    public function test_departments_endpoint_is_not_rate_limited_by_the_auth_bucket(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->getJson('/api/register/departments')->assertOk();
        }
    }

    public function test_hammering_the_departments_endpoint_does_not_exhaust_the_registration_rate_limit(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->getJson('/api/register/departments');
        }

        // The real anti-brute-force protection on /register itself is
        // untouched by this fix: still exactly 5 before a 429.
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/register', $this->validPayload())->assertStatus(
                $i === 0 ? 201 : 422, // first succeeds, rest fail on unique-email
            );
        }

        $this->postJson('/api/register', $this->validPayload())->assertStatus(429);
    }

    public function test_registration_is_rate_limited_after_five_per_minute(): void
    {
        // The "auth" limiter is keyed per email+IP (Sprint 14), so repeated
        // attempts with the same email exercise the same bucket even though
        // only the first succeeds and the rest fail on the unique-email rule.
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/register', $this->validPayload());
        }

        $response = $this->postJson('/api/register', $this->validPayload());

        $response->assertStatus(429);
    }

    public function test_registration_only_sends_the_otp_email_not_the_pending_approval_notifications(): void
    {
        Notification::fake();

        $activeAdmin = User::factory()->admin()->create();

        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);

        $applicant = User::where('email', 'jane.applicant@timeforge.test')->firstOrFail();

        Notification::assertSentTo($applicant, RegistrationOtpIssued::class);
        Notification::assertNotSentTo($applicant, RegistrationReceived::class);
        Notification::assertNotSentTo($activeAdmin, NewAccountRequestSubmitted::class);
        $this->assertNull($applicant->fresh()->email_verified_at);
    }

    /**
     * Overwrites the randomly generated OTP's hash with a known value —
     * the plain code is never persisted or retrievable, by design, so
     * this is the straightforward way to test against a known code.
     */
    private function forceKnownOtp(string $email, string $code = '123456'): void
    {
        RegistrationOtp::where('email', $email)->firstOrFail()->update(['code_hash' => Hash::make($code)]);
    }

    public function test_verifying_the_otp_notifies_the_applicant_and_active_admins(): void
    {
        Notification::fake();

        $activeAdmin = User::factory()->admin()->create();
        $pendingAdmin = User::factory()->admin()->pending()->create();
        $deactivatedAdmin = User::factory()->admin()->deactivated()->create();

        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);
        $applicant = User::where('email', 'jane.applicant@timeforge.test')->firstOrFail();
        $this->forceKnownOtp($applicant->email);

        $this->postJson('/api/register/verify-otp', ['email' => $applicant->email, 'code' => '123456'])
            ->assertOk();

        Notification::assertSentTo($applicant, RegistrationReceived::class);
        Notification::assertSentTo($activeAdmin, NewAccountRequestSubmitted::class);
        Notification::assertNotSentTo($pendingAdmin, NewAccountRequestSubmitted::class);
        Notification::assertNotSentTo($deactivatedAdmin, NewAccountRequestSubmitted::class);
        Notification::assertNotSentTo($applicant, NewAccountRequestSubmitted::class);
        $this->assertNotNull($applicant->fresh()->email_verified_at);
    }

    public function test_new_account_request_notification_contains_applicant_details(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();

        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);
        $applicant = User::where('email', 'jane.applicant@timeforge.test')->firstOrFail();
        $this->forceKnownOtp($applicant->email);

        $this->postJson('/api/register/verify-otp', ['email' => $applicant->email, 'code' => '123456'])->assertOk();

        Notification::assertSentTo(
            $admin,
            function (NewAccountRequestSubmitted $notification) use ($admin) {
                $mail = $notification->toMail($admin);

                return str_contains(implode(' ', $mail->introLines), 'Jane Q Applicant')
                    && str_contains(implode(' ', $mail->introLines), 'jane.applicant@timeforge.test');
            },
        );
    }

    public function test_registering_issues_an_otp_expiring_in_ten_minutes(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);

        $otp = RegistrationOtp::where('email', 'jane.applicant@timeforge.test')->firstOrFail();

        $this->assertEqualsWithDelta(
            now()->addMinutes(OtpPolicy::TTL_MINUTES)->timestamp,
            $otp->expires_at->timestamp,
            5,
        );
    }

    public function test_verifying_with_the_wrong_code_is_rejected_and_counts_as_an_attempt(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);
        $this->forceKnownOtp('jane.applicant@timeforge.test');

        $this->postJson('/api/register/verify-otp', [
            'email' => 'jane.applicant@timeforge.test',
            'code' => '000000',
        ])->assertStatus(422);

        $otp = RegistrationOtp::where('email', 'jane.applicant@timeforge.test')->firstOrFail();
        $this->assertSame(1, $otp->attempts);
        $this->assertNull(User::where('email', 'jane.applicant@timeforge.test')->firstOrFail()->email_verified_at);
    }

    public function test_verifying_an_expired_code_is_rejected_even_if_correct(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);
        $this->forceKnownOtp('jane.applicant@timeforge.test');
        RegistrationOtp::where('email', 'jane.applicant@timeforge.test')->firstOrFail()
            ->update(['expires_at' => now()->subMinute()]);

        $this->postJson('/api/register/verify-otp', [
            'email' => 'jane.applicant@timeforge.test',
            'code' => '123456',
        ])->assertStatus(422);
    }

    public function test_verifying_is_rejected_after_the_max_attempt_cap_even_with_the_correct_code(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);
        $this->forceKnownOtp('jane.applicant@timeforge.test');
        RegistrationOtp::where('email', 'jane.applicant@timeforge.test')->firstOrFail()
            ->update(['attempts' => OtpPolicy::MAX_ATTEMPTS]);

        $this->postJson('/api/register/verify-otp', [
            'email' => 'jane.applicant@timeforge.test',
            'code' => '123456',
        ])->assertStatus(422);
    }

    public function test_verifying_an_unregistered_email_returns_the_same_generic_error(): void
    {
        $response = $this->postJson('/api/register/verify-otp', [
            'email' => 'never.registered@timeforge.test',
            'code' => '123456',
        ]);

        $response->assertStatus(422)->assertJsonPath('message', 'Invalid or expired code.');
    }

    public function test_resend_within_the_cooldown_is_rejected(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);

        $this->postJson('/api/register/resend-otp', ['email' => 'jane.applicant@timeforge.test'])
            ->assertStatus(422);
    }

    public function test_resend_after_the_cooldown_issues_a_new_code_and_invalidates_the_old_one(): void
    {
        Notification::fake();

        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);
        $this->forceKnownOtp('jane.applicant@timeforge.test', '123456');
        RegistrationOtp::where('email', 'jane.applicant@timeforge.test')->firstOrFail()
            ->update(['last_sent_at' => now()->subSeconds(OtpPolicy::RESEND_COOLDOWN_SECONDS + 1)]);

        $this->postJson('/api/register/resend-otp', ['email' => 'jane.applicant@timeforge.test'])
            ->assertOk();

        Notification::assertSentTo(
            User::where('email', 'jane.applicant@timeforge.test')->firstOrFail(),
            RegistrationOtpIssued::class,
        );

        // The old known code ("123456") must no longer verify.
        $this->postJson('/api/register/verify-otp', [
            'email' => 'jane.applicant@timeforge.test',
            'code' => '123456',
        ])->assertStatus(422);
    }

    public function test_resend_for_an_unregistered_email_returns_the_same_generic_message(): void
    {
        $registered = $this->postJson('/api/register', $this->validPayload());
        $registered->assertStatus(201);
        RegistrationOtp::where('email', 'jane.applicant@timeforge.test')->firstOrFail()
            ->update(['last_sent_at' => now()->subSeconds(OtpPolicy::RESEND_COOLDOWN_SECONDS + 1)]);

        $realResend = $this->postJson('/api/register/resend-otp', ['email' => 'jane.applicant@timeforge.test']);
        $unknownResend = $this->postJson('/api/register/resend-otp', ['email' => 'never.registered@timeforge.test']);

        $realResend->assertOk();
        $unknownResend->assertOk();
        $this->assertSame($realResend->json('message'), $unknownResend->json('message'));
    }

    public function test_a_consumed_code_cannot_be_reused(): void
    {
        $this->postJson('/api/register', $this->validPayload())->assertStatus(201);
        $this->forceKnownOtp('jane.applicant@timeforge.test');

        $this->postJson('/api/register/verify-otp', [
            'email' => 'jane.applicant@timeforge.test',
            'code' => '123456',
        ])->assertOk();

        $this->postJson('/api/register/verify-otp', [
            'email' => 'jane.applicant@timeforge.test',
            'code' => '123456',
        ])->assertStatus(422);
    }
}
