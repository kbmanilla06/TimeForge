<?php

namespace App\Models;

use App\Enums\TimesheetCommentAction;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimesheetComment extends Model
{
    /** @use HasFactory<\Database\Factories\TimesheetCommentFactory> */
    use HasFactory;

    protected $fillable = [
        'timesheet_id',
        'author_id',
        'action',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'action' => TimesheetCommentAction::class,
        ];
    }

    public function timesheet(): BelongsTo
    {
        return $this->belongsTo(Timesheet::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
