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

    public function test_limit_caps_the_number_of_notifications_returned(): void
    {
        $user = User::factory()->create();
        $timesheet = Timesheet::factory()->create(['user_id' => $user->id]);
        $user->notify(new TimesheetApproved($timesheet, 'One.'));
        $user->notify(new TimesheetApproved($timesheet, 'Two.'));
        $user->notify(new TimesheetApproved($timesheet, 'Three.'));

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->getJson('/api/notifications?limit=2')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_mark_all_read_only_affects_the_authenticated_users_notifications(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        $timesheet = Timesheet::factory()->create(['user_id' => $user->id]);
        $user->notify(new TimesheetApproved($timesheet, 'Mine.'));
        $user->notify(new TimesheetApproved($timesheet, 'Also mine.'));
        $otherUser->notify(new TimesheetApproved($timesheet, 'Not mine.'));

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user))
            ->patchJson('/api/notifications/read-all')
            ->assertOk();

        $this->assertSame(0, $user->unreadNotifications()->count());
        $this->assertSame(1, $otherUser->unreadNotifications()->count());
    }
}
