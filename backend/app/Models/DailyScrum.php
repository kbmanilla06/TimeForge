<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DailyScrum extends Model
{
    /** @use HasFactory<\Database\Factories\DailyScrumFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'date',
        'previous_work',
        'planned_work',
        'blockers',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(ScrumComment::class)->latest();
    }

    /**
     * "Editable before supervisor review": the entry locks the moment it
     * has its first comment, derived rather than stored (same pattern as
     * TimeEntry::isLocked()).
     */
    public function isLocked(): bool
    {
        return $this->comments()->exists();
    }
}
