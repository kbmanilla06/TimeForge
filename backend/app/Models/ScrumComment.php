<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScrumComment extends Model
{
    /** @use HasFactory<\Database\Factories\ScrumCommentFactory> */
    use HasFactory;

    protected $fillable = [
        'daily_scrum_id',
        'author_id',
        'comment',
    ];

    public function dailyScrum(): BelongsTo
    {
        return $this->belongsTo(DailyScrum::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
