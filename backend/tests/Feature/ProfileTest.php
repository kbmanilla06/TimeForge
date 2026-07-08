<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    private function withAuth(User $user)
    {
        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    public function test_user_can_update_contact_number_and_position(): void
    {
        $user = User::factory()->create(['contact_number' => null, 'position' => 'Engineer']);

        $response = $this->withAuth($user)->patchJson('/api/profile', [
            'contact_number' => '555-0100',
            'position' => 'Senior Engineer',
        ]);

        $response->assertOk();
        $this->assertSame('555-0100', $user->fresh()->contact_number);
        $this->assertSame('Senior Engineer', $user->fresh()->position);
    }

    public function test_name_role_and_department_are_not_touched_by_this_endpoint(): void
    {
        $user = User::factory()->create(['name' => 'Original Name']);

        $this->withAuth($user)->patchJson('/api/profile', [
            'name' => 'Hacked Name',
            'role' => 'admin',
            'contact_number' => '555-0100',
        ])->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('Original Name', $fresh->name);
        $this->assertNotSame('admin', $fresh->role->value);
        $this->assertSame('555-0100', $fresh->contact_number);
    }

    public function test_user_can_upload_a_profile_picture(): void
    {
        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('avatar.png', 100, 'image/png');

        $response = $this->withAuth($user)->post('/api/profile/picture', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $path = $user->fresh()->profile_picture_path;
        $this->assertNotNull($path);
        $this->assertStringStartsWith("profile-pictures/{$user->id}/", $path);
        Storage::disk('local')->assertExists($path);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'profile_picture.uploaded',
            'subject_id' => $user->id,
            'metadata' => json_encode(['replaced' => false]),
        ]);
    }

    public function test_profile_picture_path_is_never_exposed_in_me(): void
    {
        $user = User::factory()->create();
        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('avatar.png', 100, 'image/png'),
        ], ['Accept' => 'application/json']);

        $me = $this->withAuth($user)->getJson('/api/me');

        $this->assertArrayNotHasKey('profile_picture_path', $me->json('user'));
    }

    public function test_reuploading_deletes_the_previous_file(): void
    {
        $user = User::factory()->create();

        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('first.png', 100, 'image/png'),
        ], ['Accept' => 'application/json']);
        $firstPath = $user->fresh()->profile_picture_path;

        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('second.png', 100, 'image/png'),
        ], ['Accept' => 'application/json']);
        $secondPath = $user->fresh()->profile_picture_path;

        Storage::disk('local')->assertMissing($firstPath);
        Storage::disk('local')->assertExists($secondPath);
    }

    public function test_upload_rejects_non_image_files_and_oversized_files(): void
    {
        $user = User::factory()->create();

        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors(['file']);

        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('huge.png', 3 * 1024, 'image/png'),
        ], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors(['file']);

        $this->assertNull($user->fresh()->profile_picture_path);
    }

    public function test_show_picture_streams_when_set_and_404s_when_not(): void
    {
        $user = User::factory()->create();

        $this->withAuth($user)->get('/api/profile/picture', ['Accept' => 'application/json'])->assertStatus(404);

        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('avatar.png', 100, 'image/png'),
        ], ['Accept' => 'application/json']);

        $this->withAuth($user)->get('/api/profile/picture')->assertOk();
    }

    /**
     * Sprint 44: every other test in this file exercises the 'local'
     * disk, which is also this app's default — that wouldn't have caught
     * the original Sprint 39 bug where every call site hardcoded
     * Storage::disk('local') regardless of FILESYSTEM_DISK. This proves
     * the upload/download/delete flow genuinely follows whatever disk is
     * configured, not just 'local' coincidentally.
     */
    public function test_profile_picture_flow_follows_the_configured_default_disk(): void
    {
        config(['filesystems.default' => 's3']);
        Storage::fake('s3');

        $user = User::factory()->create();

        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('avatar.png', 100, 'image/png'),
        ], ['Accept' => 'application/json'])->assertOk();

        $path = $user->fresh()->profile_picture_path;
        Storage::disk('s3')->assertExists($path);
        Storage::disk('local')->assertMissing($path);

        $this->withAuth($user)->get('/api/profile/picture')->assertOk();

        $this->withAuth($user)->post('/api/profile/picture', [
            'file' => UploadedFile::fake()->create('second.png', 100, 'image/png'),
        ], ['Accept' => 'application/json'])->assertOk();

        Storage::disk('s3')->assertMissing($path);
    }

    public function test_user_can_change_their_password_with_the_correct_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password-123']);

        $this->withAuth($user)->patchJson('/api/profile/password', [
            'current_password' => 'old-password-123',
            'password' => 'NewSecur3Pass!',
            'password_confirmation' => 'NewSecur3Pass!',
        ])->assertOk();

        $this->assertDatabaseHas('audit_logs', ['action' => 'password.changed', 'actor_id' => $user->id]);
        // Never the password itself, in any form.
        $entry = AuditLog::where('action', 'password.changed')->sole();
        $this->assertStringNotContainsString('NewSecur3Pass!', json_encode($entry->toArray()));

        $this->assertTrue(Hash::check('NewSecur3Pass!', $user->fresh()->password));
    }

    public function test_change_password_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password-123']);

        $this->withAuth($user)->patchJson('/api/profile/password', [
            'current_password' => 'wrong-password',
            'password' => 'NewSecur3Pass!',
            'password_confirmation' => 'NewSecur3Pass!',
        ])->assertStatus(422)->assertJsonValidationErrors(['current_password']);

        $this->assertTrue(Hash::check('old-password-123', $user->fresh()->password));
    }

    public function test_unauthenticated_requests_are_rejected(): void
    {
        $this->patchJson('/api/profile', ['position' => 'Anything'])->assertStatus(401);
        $this->getJson('/api/profile/picture', ['Accept' => 'application/json'])->assertStatus(401);
        $this->patchJson('/api/profile/password', [])->assertStatus(401);
    }
}
