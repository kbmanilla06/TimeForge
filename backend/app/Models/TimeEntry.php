<?php

namespace App\Models;

use App\Enums\TimesheetStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class TimeEntry extends Model
{
    /** @use HasFactory<\Database\Factories\TimeEntryFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'project_id',
        'client_id',
        'department_id',
        'timesheet_id',
        'date',
        'start_time',
        'end_time',
        'task',
        'task_status',
        'work_category',
        'description',
        'reference_links',
        'deliverables',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'reference_links' => 'array',
            'deliverables' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (TimeEntry $timeEntry): void {
            $timeEntry->duration_minutes = $timeEntry->end_time
                ? $timeEntry->start_time->diffInMinutes($timeEntry->end_time)
                : null;
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(Timesheet::class);
    }

    /**
     * An entry is locked once its timesheet exists and isn't back in a
     * revision-requested (editable) state.
     */
    public function isLocked(): bool
    {
        return $this->timesheet !== null
            && $this->timesheet->status !== TimesheetStatus::RevisionRequested;
    }

    /**
     * Whether the given user already has a stored entry overlapping [start, end].
     * A running entry (null end_time) is treated as ongoing until now().
     */
    public static function hasOverlap(int $userId, Carbon $start, Carbon $end, ?int $excludeId = null): bool
    {
        return static::where('user_id', $userId)
            ->when($excludeId, fn ($query) => $query->where('id', '!=', $excludeId))
            ->where('start_time', '<', $end)
            ->where(function ($query) use ($start) {
                $query->whereNull('end_time')->orWhere('end_time', '>', $start);
            })
            ->exists();
    }
}
