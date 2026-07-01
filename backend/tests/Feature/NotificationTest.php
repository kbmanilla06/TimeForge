<?php

namespace Tests\Feature;

use App\Models\Timesheet;
use App\Models\User;
use App\Notifications\TimesheetApproved;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_user_can_list_only_their_own_notifications(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $timesheet = Timesheet::factory()->create(['user_id' => $user->id]);

        $user->notify(new TimesheetApproved($timesheet, 'Nice work.'));
        $otherUser->notify(new TimesheetApproved($timesheet, 'Not yours.'));

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->getJson('/api/notifications');

        $response->assertOk()->assertJsonCount(1);
    }

    public function test_user_can_mark_their_own_notification_as_read(): void
    {
        $user = User::factory()->create();
        $timesheet = Timesheet::factory()->create(['user_id' => $user->id]);
        $user->notify(new TimesheetApproved($timesheet, 'Nice work.'));
        $notificationId = $user->notifications()->first()->id;
        $token = $this->tokenFor($user);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->patchJson("/api/notifications/{$notificationId}/read");

        $response->assertOk();
        $this->assertNotNull($response->json('read_at'));
    }

    public function test_user_cannot_mark_another_users_notification_as_read(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $timesheet = Timesheet::factory()->create(['user_id' => $otherUser->id]);
        $otherUser->notify(new TimesheetApproved($timesheet, 'Not yours.'));
        $notificationId = $otherUser->notifications()->first()->id;

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->patchJson("/api/notifications/{$notificationId}/read")
            ->assertStatus(404);
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->getJson('/api/notifications')->assertStatus(401);
    }
}
