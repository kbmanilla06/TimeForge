<?php

namespace Tests\Feature\Auth;

use App\Enums\AccountRequestStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
