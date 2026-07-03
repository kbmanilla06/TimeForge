<?php

namespace Tests\Feature;

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

    public function test_user_can_change_their_password_with_the_correct_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password-123']);

        $this->withAuth($user)->patchJson('/api/profile/password', [
            'current_password' => 'old-password-123',
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password-456', $user->fresh()->password));
    }

    public function test_change_password_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password-123']);

        $this->withAuth($user)->patchJson('/api/profile/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-password-456',
            'password_confirmation' => 'new-password-456',
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
