<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\TimeEntry;
use App\Models\TimeEntryAttachment;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class TimeEntryAttachmentTest extends TestCase
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

    private function withAuth(User $user): TestResponse|static
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeader('Authorization', 'Bearer '.$this->tokenFor($user));
    }

    private function entryFor(User $user, ?string $timesheetStatus = null, string $date = '2026-01-05'): TimeEntry
    {
        $timesheetId = null;

        if ($timesheetStatus !== null) {
            $timesheetId = Timesheet::factory()->create([
                'user_id' => $user->id,
                'date' => $date,
                'status' => $timesheetStatus,
            ])->id;
        }

        return TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $date,
            'start_time' => Carbon::parse($date.' 09:00'),
            'end_time' => Carbon::parse($date.' 10:00'),
            'timesheet_id' => $timesheetId,
        ]);
    }

    private function upload(User $user, TimeEntry $entry, UploadedFile $file): TestResponse
    {
        return $this->withAuth($user)->post(
            "/api/time-entries/{$entry->id}/attachments",
            ['file' => $file],
            ['Accept' => 'application/json'],
        );
    }

    private function pdf(string $name = 'receipt.pdf', string $content = '%PDF-1.4 test content'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    public function test_owner_can_upload_to_an_editable_entry(): void
    {
        $owner = User::factory()->create();
        $entry = $this->entryFor($owner);

        $response = $this->upload($owner, $entry, $this->pdf());

        $response->assertStatus(201);
        $this->assertSame('receipt.pdf', $response->json('original_name'));
        $this->assertSame('application/pdf', $response->json('mime_type'));
        $this->assertSame(strlen('%PDF-1.4 test content'), $response->json('size_bytes'));
        // The physical storage path must never reach a client.
        $this->assertArrayNotHasKey('path', $response->json());

        $attachment = TimeEntryAttachment::sole();
        $this->assertSame($entry->id, $attachment->time_entry_id);
        $this->assertSame($owner->id, $attachment->uploaded_by);
        $this->assertStringStartsWith("time-entry-attachments/{$entry->id}/", $attachment->path);
        Storage::disk('local')->assertExists($attachment->path);
    }

    /**
     * Sprint 44: every other test in this file exercises the 'local'
     * disk, which is also this app's default — that wouldn't have caught
     * the original Sprint 39 bug where every call site hardcoded
     * Storage::disk('local') regardless of FILESYSTEM_DISK. This proves
     * the upload/download/delete flow genuinely follows whatever disk is
     * configured, not just 'local' coincidentally.
     */
    public function test_attachment_flow_follows_the_configured_default_disk(): void
    {
        config(['filesystems.default' => 's3']);
        Storage::fake('s3');

        $owner = User::factory()->create();
        $entry = $this->entryFor($owner);

        $this->upload($owner, $entry, $this->pdf('receipt.pdf', '%PDF-1.4 hello sprint 44'))->assertStatus(201);
        $attachment = TimeEntryAttachment::sole();

        Storage::disk('s3')->assertExists($attachment->path);
        Storage::disk('local')->assertMissing($attachment->path);

        $download = $this->withAuth($owner)->get("/api/time-entries/{$entry->id}/attachments/{$attachment->id}/download");
        $download->assertOk();
        $this->assertSame('%PDF-1.4 hello sprint 44', $download->streamedContent());

        $this->withAuth($owner)
            ->deleteJson("/api/time-entries/{$entry->id}/attachments/{$attachment->id}")
            ->assertStatus(204);
        Storage::disk('s3')->assertMissing($attachment->path);
    }

    public function test_upload_rejects_bad_extension_mismatched_content_and_oversize(): void
    {
        $owner = User::factory()->create();
        $entry = $this->entryFor($owner);

        // Disallowed extension.
        $this->upload($owner, $entry, UploadedFile::fake()->create('run.exe', 10))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);

        // Allowed extension hiding a disallowed real content type. Built by
        // hand because UploadedFile::fake() derives its MIME from the file
        // NAME, which would defeat the content sniffing this asserts; a
        // plain UploadedFile over a real temp file goes through finfo.
        $tempPath = tempnam(sys_get_temp_dir(), 'timeforge');
        file_put_contents($tempPath, 'just plain text content');
        $mismatched = new UploadedFile($tempPath, 'notes.pdf', 'application/pdf', null, true);

        $this->upload($owner, $entry, $mismatched)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);

        // Over the locked 10MB cap.
        $this->upload($owner, $entry, $this->pdf('big.pdf', '%PDF-1.4 '.str_repeat('a', 10 * 1024 * 1024)))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['file']);

        $this->assertDatabaseCount('time_entry_attachments', 0);
    }

    public function test_upload_is_blocked_for_non_owners_and_locked_entries(): void
    {
        $owner = User::factory()->create();
        $colleague = User::factory()->create();

        $editable = $this->entryFor($owner, null, '2026-01-05');
        $submitted = $this->entryFor($owner, 'submitted', '2026-01-06');
        $revision = $this->entryFor($owner, 'revision_requested', '2026-01-07');

        $this->upload($colleague, $editable, $this->pdf())->assertStatus(403);
        $this->upload($owner, $submitted, $this->pdf())->assertStatus(403);
        // A revision request reopens the entry — attachments included.
        $this->upload($owner, $revision, $this->pdf())->assertStatus(201);
    }

    public function test_download_matrix_and_content_round_trip(): void
    {
        $department = Department::factory()->create();
        $otherDepartment = Department::factory()->create();
        $owner = User::factory()->create(['department_id' => $department->id]);
        $colleague = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);
        $otherSupervisor = User::factory()->supervisor()->create(['department_id' => $otherDepartment->id]);
        $admin = User::factory()->admin()->create();
        $hr = User::factory()->hrFinance()->create();

        $entry = $this->entryFor($owner);
        $this->upload($owner, $entry, $this->pdf('receipt.pdf', '%PDF-1.4 hello sprint 13'))->assertStatus(201);
        $attachment = TimeEntryAttachment::sole();
        $url = "/api/time-entries/{$entry->id}/attachments/{$attachment->id}/download";

        $ownerResponse = $this->withAuth($owner)->get($url);
        $ownerResponse->assertOk();
        $this->assertStringContainsString('attachment', $ownerResponse->headers->get('content-disposition'));
        $this->assertStringContainsString('receipt.pdf', $ownerResponse->headers->get('content-disposition'));
        $this->assertSame('%PDF-1.4 hello sprint 13', $ownerResponse->streamedContent());

        $this->withAuth($supervisor)->get($url)->assertOk();
        $this->withAuth($admin)->get($url)->assertOk();
        $this->withAuth($otherSupervisor)->get($url)->assertStatus(403);
        $this->withAuth($hr)->get($url)->assertStatus(403);
        $this->withAuth($colleague)->get($url)->assertStatus(403);
    }

    public function test_owner_can_delete_while_editable_but_not_once_locked(): void
    {
        $owner = User::factory()->create();
        $entry = $this->entryFor($owner);

        $this->upload($owner, $entry, $this->pdf())->assertStatus(201);
        $attachment = TimeEntryAttachment::sole();
        $path = $attachment->path;

        $this->withAuth($owner)
            ->deleteJson("/api/time-entries/{$entry->id}/attachments/{$attachment->id}")
            ->assertStatus(204);

        $this->assertDatabaseCount('time_entry_attachments', 0);
        Storage::disk('local')->assertMissing($path);

        // Re-upload, then lock the entry behind a submitted timesheet:
        // deletion must now be refused and the row/file untouched.
        $this->upload($owner, $entry, $this->pdf())->assertStatus(201);
        $locked = TimeEntryAttachment::sole();
        $timesheet = Timesheet::factory()->create(['user_id' => $owner->id, 'date' => $entry->date->toDateString()]);
        $entry->update(['timesheet_id' => $timesheet->id]);

        $this->withAuth($owner)
            ->deleteJson("/api/time-entries/{$entry->id}/attachments/{$locked->id}")
            ->assertStatus(403);

        $this->assertDatabaseCount('time_entry_attachments', 1);
        Storage::disk('local')->assertExists($locked->path);
    }

    public function test_deleting_an_entry_removes_attachment_rows_and_files(): void
    {
        $owner = User::factory()->create();
        $entry = $this->entryFor($owner);

        $this->upload($owner, $entry, $this->pdf('a.pdf'))->assertStatus(201);
        $this->upload($owner, $entry, $this->pdf('b.pdf'))->assertStatus(201);
        $paths = TimeEntryAttachment::pluck('path');

        $this->withAuth($owner)->deleteJson("/api/time-entries/{$entry->id}")->assertStatus(204);

        $this->assertDatabaseCount('time_entry_attachments', 0);
        foreach ($paths as $path) {
            Storage::disk('local')->assertMissing($path);
        }
    }

    public function test_attachment_bindings_are_scoped_to_their_entry(): void
    {
        $owner = User::factory()->create();
        $entryA = $this->entryFor($owner, null, '2026-01-05');
        $entryB = $this->entryFor($owner, null, '2026-01-06');

        $this->upload($owner, $entryA, $this->pdf())->assertStatus(201);
        $attachment = TimeEntryAttachment::sole();

        $this->withAuth($owner)
            ->get("/api/time-entries/{$entryB->id}/attachments/{$attachment->id}/download")
            ->assertStatus(404);

        $this->withAuth($owner)
            ->deleteJson("/api/time-entries/{$entryB->id}/attachments/{$attachment->id}")
            ->assertStatus(404);
    }

    public function test_attachments_are_embedded_without_path_in_entry_and_timesheet_responses(): void
    {
        $department = Department::factory()->create();
        $owner = User::factory()->create(['department_id' => $department->id]);
        $supervisor = User::factory()->supervisor()->create(['department_id' => $department->id]);

        $entry = $this->entryFor($owner);
        $this->upload($owner, $entry, $this->pdf())->assertStatus(201);

        $index = $this->withAuth($owner)->getJson('/api/time-entries');
        $index->assertOk();
        $this->assertSame('receipt.pdf', $index->json('0.attachments.0.original_name'));
        $this->assertArrayNotHasKey('path', $index->json('0.attachments.0'));

        // Reviewers see the same attachments on the timesheet they review.
        $timesheet = Timesheet::factory()->create(['user_id' => $owner->id, 'date' => $entry->date->toDateString()]);
        $entry->update(['timesheet_id' => $timesheet->id]);

        $show = $this->withAuth($supervisor)->getJson("/api/timesheets/{$timesheet->id}");
        $show->assertOk();
        $this->assertSame('receipt.pdf', $show->json('time_entries.0.attachments.0.original_name'));
        $this->assertArrayNotHasKey('path', $show->json('time_entries.0.attachments.0'));
    }
}
