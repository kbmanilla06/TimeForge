<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A single day's attendance for one user: Time In, at most one Pause/Resume
 * break window, and Time Out. Deliberately independent of TimeEntry/
 * Timesheet — informational/display-only, never read by Payroll (Sprint 22
 * decision). One row per user per day, enforced by a unique index.
 */
class AttendanceSession extends Model
{
    /** @use HasFactory<\Database\Factories\AttendanceSessionFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date',
        'time_in',
        'break_started_at',
        'break_resumed_at',
        'time_out',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'time_in' => 'datetime',
            'break_started_at' => 'datetime',
            'break_resumed_at' => 'datetime',
            'time_out' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isOnBreak(): bool
    {
        return $this->break_started_at !== null && $this->break_resumed_at === null;
    }

    public function hasUsedBreak(): bool
    {
        return $this->break_started_at !== null;
    }

    public function isTimedOut(): bool
    {
        return $this->time_out !== null;
    }

    /**
     * Minutes actually on break. Counts the running break if still active.
     */
    public function breakMinutes(): int
    {
        if ($this->break_started_at === null) {
            return 0;
        }

        $breakEnd = $this->break_resumed_at ?? Carbon::now();

        return max(0, (int) $this->break_started_at->diffInMinutes($breakEnd));
    }

    /**
     * Minutes clocked in but not counting break time. Counts the running
     * clock if still active (not yet timed out).
     */
    public function workingMinutes(): int
    {
        return max(0, $this->totalMinutes() - $this->breakMinutes());
    }

    /**
     * The full span from Time In to Time Out (or now, if still active) —
     * includes break time.
     */
    public function totalMinutes(): int
    {
        $end = $this->time_out ?? Carbon::now();

        return max(0, (int) $this->time_in->diffInMinutes($end));
    }
}
