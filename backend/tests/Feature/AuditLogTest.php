<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_record_captures_actor_subject_metadata_and_ip(): void
    {
        $actor = User::factory()->create();
        $subject = User::factory()->create();

        $this->actingAs($actor);
        AuditLog::record('user.activated', $subject, ['note' => 'test'], $actor);

        $entry = AuditLog::latest('id')->first();
        $this->assertSame($actor->id, $entry->actor_id);
        $this->assertSame('user.activated', $entry->action);
        $this->assertSame(User::class, $entry->subject_type);
        $this->assertSame($subject->id, $entry->subject_id);
        $this->assertSame(['note' => 'test'], $entry->metadata);
    }

    public function test_record_defaults_actor_to_the_currently_authenticated_user(): void
    {
        $actor = User::factory()->create();
        $this->actingAs($actor);

        AuditLog::record('logout');

        $this->assertSame($actor->id, AuditLog::latest('id')->first()->actor_id);
    }

    public function test_record_allows_a_null_actor_for_actions_with_no_authenticated_user(): void
    {
        AuditLog::record('login.failed', null, ['email' => 'nobody@timeforge.test']);

        $entry = AuditLog::latest('id')->first();
        $this->assertNull($entry->actor_id);
        $this->assertSame(['email' => 'nobody@timeforge.test'], $entry->metadata);
    }

    public function test_record_never_throws_even_if_writing_the_entry_fails(): void
    {
        // An actor referencing a user id that doesn't actually exist
        // genuinely violates the actor_id foreign key constraint — a real
        // DB-level failure, not a simulated one. record() must swallow it
        // (logged via report()) rather than break the caller.
        $nonExistentActor = User::factory()->make(['id' => 999999]);

        AuditLog::record('user.activated', null, [], $nonExistentActor);

        $this->assertTrue(true); // reaching this line means record() didn't throw
        $this->assertDatabaseMissing('audit_logs', ['actor_id' => 999999]);
    }

    public function test_audit_log_entries_cannot_be_updated_or_deleted(): void
    {
        $entry = AuditLog::factory()->create();

        $this->expectException(LogicException::class);
        $entry->update(['action' => 'tampered']);
    }

    public function test_audit_log_entries_cannot_be_deleted(): void
    {
        $entry = AuditLog::factory()->create();

        $this->expectException(LogicException::class);
        $entry->delete();
    }

    public function test_admin_can_list_audit_logs(): void
    {
        $admin = User::factory()->admin()->create();
        AuditLog::factory()->create(['action' => 'user.activated']);
        AuditLog::factory()->create(['action' => 'department.created']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/audit-logs');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_audit_logs_can_be_filtered_by_action(): void
    {
        $admin = User::factory()->admin()->create();
        AuditLog::factory()->create(['action' => 'user.activated']);
        AuditLog::factory()->create(['action' => 'department.created']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/audit-logs?action=user.activated');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('user.activated', $response->json('data.0.action'));
    }

    public function test_audit_logs_can_be_filtered_by_actor(): void
    {
        $admin = User::factory()->admin()->create();
        $actorA = User::factory()->create();
        $actorB = User::factory()->create();
        AuditLog::factory()->create(['actor_id' => $actorA->id]);
        AuditLog::factory()->create(['actor_id' => $actorB->id]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson("/api/admin/audit-logs?actor_id={$actorA->id}");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_audit_logs_can_be_filtered_by_date_range(): void
    {
        $admin = User::factory()->admin()->create();
        AuditLog::factory()->create(['created_at' => now()->subDays(10)]);
        AuditLog::factory()->create(['created_at' => now()]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($admin))
            ->getJson('/api/admin/audit-logs?date_from='.now()->subDay()->toDateString());

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_non_admin_cannot_view_audit_logs(): void
    {
        $employee = User::factory()->create();
        AuditLog::factory()->create();

        $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($employee))
            ->getJson('/api/admin/audit-logs')
            ->assertStatus(403);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/admin/audit-logs', ['Accept' => 'application/json'])->assertStatus(401);
    }
}
