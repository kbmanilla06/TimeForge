<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTimeEntryAttachmentRequest;
use App\Models\AuditLog;
use App\Models\TimeEntry;
use App\Models\TimeEntryAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TimeEntryAttachmentController extends Controller
{
    /**
     * Upload one attachment. Reuses the entry's "owner + not locked"
     * update rule (Sprint 13 lifecycle decision): possible only before the
     * timesheet is submitted, or again after a revision request/reopen.
     */
    public function store(StoreTimeEntryAttachmentRequest $request, TimeEntry $timeEntry): JsonResponse
    {
        $this->authorize('update', $timeEntry);

        $file = $request->file('file');
        $path = $file->store('time-entry-attachments/'.$timeEntry->id);

        $attachment = $timeEntry->attachments()->create([
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'uploaded_by' => $request->user()->id,
        ]);

        AuditLog::record('attachment.uploaded', $attachment, [
            'time_entry_id' => $timeEntry->id,
            'original_name' => $attachment->original_name,
        ]);

        return response()->json($attachment, 201);
    }

    /**
     * Stream the stored file with its original name. Allowed for the
     * owner, the owner's own-department Supervisor, and Admin only
     * (Sprint 13 download-permission decision).
     */
    public function download(TimeEntry $timeEntry, TimeEntryAttachment $attachment): StreamedResponse
    {
        $this->authorize('downloadAttachment', $timeEntry);

        AuditLog::record('attachment.downloaded', $attachment, [
            'time_entry_id' => $timeEntry->id,
            'original_name' => $attachment->original_name,
        ]);

        return Storage::download($attachment->path, $attachment->original_name);
    }

    /**
     * Remove one attachment (row + stored file, via the model's deleting
     * hook). Same owner + not-locked rule as upload.
     */
    public function destroy(TimeEntry $timeEntry, TimeEntryAttachment $attachment): JsonResponse
    {
        $this->authorize('update', $timeEntry);

        $attachment->delete();

        // $attachment stays a valid in-memory object after delete() (only
        // the DB row is gone), so subject_type/id still correctly
        // reference the now-deleted attachment for lookup purposes.
        AuditLog::record('attachment.deleted', $attachment, [
            'time_entry_id' => $timeEntry->id,
            'original_name' => $attachment->original_name,
        ]);

        return response()->json(status: 204);
    }
}
