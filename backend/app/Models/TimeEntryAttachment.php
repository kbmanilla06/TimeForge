<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A file attached to a time entry (PRD §7.1), stored on the app's
 * configured default disk (Sprint 13 decisions; Sprint 39 made the disk
 * itself configurable via FILESYSTEM_DISK instead of hardcoded 'local').
 * The physical storage path is hidden from every serialization — clients
 * only ever see metadata and retrieve content through the authorized
 * download endpoint.
 */
class TimeEntryAttachment extends Model
{
    /** @use HasFactory<\Database\Factories\TimeEntryAttachmentFactory> */
    use HasFactory;

    protected $fillable = [
        'time_entry_id',
        'original_name',
        'path',
        'mime_type',
        'size_bytes',
        'uploaded_by',
    ];

    protected $hidden = ['path'];

    protected static function booted(): void
    {
        // A DB cascade can't remove disk files, so cleanup rides the model
        // event; TimeEntry's own deleting hook removes attachments through
        // Eloquent for the same reason.
        static::deleting(function (TimeEntryAttachment $attachment): void {
            Storage::delete($attachment->path);
        });
    }

    public function timeEntry(): BelongsTo
    {
        return $this->belongsTo(TimeEntry::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
