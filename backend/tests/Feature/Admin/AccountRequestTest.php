<?php

namespace Tests\Feature\Admin;

use App\Enums\AccountRequestStatus;
use App\Enums\UserStatus;
use App\Models\AccountRequest;
use App\Models\User;
use App\Notifications\AccountApproved;
use App\Notifications\AccountRejected;
use Illuminate\Contracts\Notifications\Dispatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AccountRequestTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_admin_can_list_all_account_requests(): void
    {
        $admin = User::factory()->admin()->create();
        AccountRequest::factory()->count(2)->create();
        AccountRequest::factory()->approved()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/account-requests');

        $response->assertOk();
        $this->assertCount(3, $response->json());
    }

    public function test_search_matches_applicant_name_or_email(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->pending()->create(['name' => 'Jane Applicant', 'email' => 'jane@timeforge.test']);
        AccountRequest::factory()->create(['user_id' => $target->id]);
        AccountRequest::factory()->create(); // unrelated, should not match

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/account-requests?search=Jane');

        $response->assertOk();
        $this->assertCount(1, $response->json());
        $this->assertSame('Jane Applicant', $response->json('0.user.name'));
    }

    public function test_status_filter_narrows_results(): void
    {
        $admin = User::factory()->admin()->create();
        AccountRequest::factory()->count(2)->create();
        AccountRequest::factory()->rejected()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/account-requests?status=rejected');

        $response->assertOk();
        $this->assertCount(1, $response->json());
        $this->assertSame('rejected', $response->json('0.status'));
    }

    public function test_index_response_includes_applicant_details(): void
    {
        $admin = User::factory()->admin()->create();
        $applicant = User::factory()->pending()->create([
            'name' => 'Jane Applicant',
            'employee_id' => 'EMP-1',
            'position' => 'Engineer',
            'contact_number' => '555-0100',
        ]);
        AccountRequest::factory()->create(['user_id' => $applicant->id]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/account-requests');

        $response->assertOk()->assertJsonPath('0.user.employee_id', 'EMP-1')
            ->assertJsonPath('0.user.position', 'Engineer')
            ->assertJsonPath('0.user.contact_number', '555-0100')
            ->assertJsonPath('0.user.department.name', $applicant->department?->name);
    }

    public function test_approving_a_submitted_request_activates_the_user_and_records_the_reviewer(): void
    {
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/approve");

        $response->assertOk();

        $accountRequest->refresh();
        $this->assertSame(AccountRequestStatus::Approved, $accountRequest->status);
        $this->assertSame($admin->id, $accountRequest->reviewed_by);
        $this->assertNotNull($accountRequest->reviewed_at);
        $this->assertSame(UserStatus::Active, $accountRequest->user->fresh()->status);
    }

    public function test_rejecting_a_submitted_request_deactivates_the_user_and_stores_the_remark(): void
    {
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/reject", [
                'remarks' => 'Could not verify employment.',
            ]);

        $response->assertOk();

        $accountRequest->refresh();
        $this->assertSame(AccountRequestStatus::Rejected, $accountRequest->status);
        $this->assertSame('Could not verify employment.', $accountRequest->rejection_reason);
        $this->assertSame(UserStatus::Deactivated, $accountRequest->user->fresh()->status);
    }

    public function test_rejection_remarks_are_optional(): void
    {
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/reject");

        $response->assertOk();
        $this->assertNull($accountRequest->refresh()->rejection_reason);
    }

    public function test_approving_an_already_decided_request_is_rejected_with_422(): void
    {
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->approved()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/approve");

        $response->assertStatus(422);
    }

    public function test_rejecting_an_already_decided_request_is_rejected_with_422(): void
    {
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->rejected()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/reject");

        $response->assertStatus(422);
    }

    public function test_approved_applicant_can_then_log_in(): void
    {
        $admin = User::factory()->admin()->create();
        $applicant = User::factory()->pending()->create(['password' => 'password']);
        $accountRequest = AccountRequest::factory()->create(['user_id' => $applicant->id]);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/approve")
            ->assertOk();

        $this->postJson('/api/login', ['email' => $applicant->email, 'password' => 'password'])
            ->assertOk()
            ->assertJsonStructure(['user', 'token']);
    }

    public function test_rejected_applicant_still_cannot_log_in(): void
    {
        $admin = User::factory()->admin()->create();
        $applicant = User::factory()->pending()->create(['password' => 'password']);
        $accountRequest = AccountRequest::factory()->create(['user_id' => $applicant->id]);

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/reject")
            ->assertOk();

        $this->postJson('/api/login', ['email' => $applicant->email, 'password' => 'password'])
            ->assertStatus(422);
    }

    public function test_non_admin_cannot_list_or_decide_account_requests(): void
    {
        $employee = User::factory()->create();
        $accountRequest = AccountRequest::factory()->create();
        $token = $this->tokenFor($employee);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/admin/account-requests')
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/approve")
            ->assertStatus(403);

        $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/reject")
            ->assertStatus(403);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/admin/account-requests')->assertStatus(401);
    }

    public function test_an_unverified_submitted_request_is_hidden_from_the_list(): void
    {
        $admin = User::factory()->admin()->create();
        $unverifiedApplicant = User::factory()->pending()->unverified()->create();
        AccountRequest::factory()->create(['user_id' => $unverifiedApplicant->id]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/account-requests');

        $response->assertOk();
        $this->assertCount(0, $response->json());
    }

    public function test_verifying_makes_a_previously_hidden_request_appear(): void
    {
        $admin = User::factory()->admin()->create();
        $applicant = User::factory()->pending()->unverified()->create();
        AccountRequest::factory()->create(['user_id' => $applicant->id]);

        $applicant->forceFill(['email_verified_at' => now()])->save();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/account-requests');

        $response->assertOk();
        $this->assertCount(1, $response->json());
    }

    public function test_approved_and_rejected_history_stays_visible_even_if_never_verified(): void
    {
        $admin = User::factory()->admin()->create();
        $unverifiedApprovedApplicant = User::factory()->pending()->unverified()->create();
        AccountRequest::factory()->approved()->create(['user_id' => $unverifiedApprovedApplicant->id]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/account-requests');

        $response->assertOk();
        $this->assertCount(1, $response->json());
    }

    public function test_approving_an_unverified_request_is_rejected_with_422(): void
    {
        $admin = User::factory()->admin()->create();
        $applicant = User::factory()->pending()->unverified()->create();
        $accountRequest = AccountRequest::factory()->create(['user_id' => $applicant->id]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/approve");

        $response->assertStatus(422);
        $this->assertSame(AccountRequestStatus::Submitted, $accountRequest->fresh()->status);
    }

    public function test_approving_notifies_the_applicant(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/approve")
            ->assertOk();

        Notification::assertSentTo($accountRequest->user, AccountApproved::class);
    }

    public function test_rejecting_notifies_the_applicant_with_the_remark(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/reject", [
                'remarks' => 'Could not verify employment.',
            ])
            ->assertOk();

        Notification::assertSentTo(
            $accountRequest->user,
            function (AccountRejected $notification) use ($accountRequest) {
                $mail = $notification->toMail($accountRequest->user);

                return str_contains(implode(' ', $mail->introLines), 'Could not verify employment.');
            },
        );
    }

    /**
     * Sprint 45: a broken mail provider previously surfaced here as a raw
     * 500 even though the status change already succeeded — an admin
     * could think the approval itself failed and retry, only to hit the
     * already-decided guard, confusingly.
     */
    public function test_approving_succeeds_even_when_the_notification_fails_to_send(): void
    {
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->create();

        $this->mock(Dispatcher::class, function ($mock) {
            $mock->shouldReceive('send')->andThrow(new \RuntimeException('Simulated mail provider failure'));
        });

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/approve")
            ->assertOk();

        $this->assertSame(AccountRequestStatus::Approved, $accountRequest->fresh()->status);
        $this->assertSame(UserStatus::Active, $accountRequest->user->fresh()->status);
    }

    public function test_rejecting_succeeds_even_when_the_notification_fails_to_send(): void
    {
        $admin = User::factory()->admin()->create();
        $accountRequest = AccountRequest::factory()->create();

        $this->mock(Dispatcher::class, function ($mock) {
            $mock->shouldReceive('send')->andThrow(new \RuntimeException('Simulated mail provider failure'));
        });

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->patchJson("/api/admin/account-requests/{$accountRequest->id}/reject", [
                'remarks' => 'Could not verify employment.',
            ])
            ->assertOk();

        $this->assertSame(AccountRequestStatus::Rejected, $accountRequest->fresh()->status);
        $this->assertSame(UserStatus::Deactivated, $accountRequest->user->fresh()->status);
    }
}
