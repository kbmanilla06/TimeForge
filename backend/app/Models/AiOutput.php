<?php

namespace App\Models;

use App\Enums\AiOutputType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A permanently stored, append-only AI generation. Rows are never updated
 * or deleted (no route exists for either); regeneration inserts a new row.
 * All attributes are set server-side by AiSummaryService — request input is
 * never mass-assigned into this model.
 */
class AiOutput extends Model
{
    /** @use HasFactory<\Database\Factories\AiOutputFactory> */
    use HasFactory;

    protected $fillable = [
        'type',
        'user_id',
        'department_id',
        'period_start',
        'period_end',
        'source_data',
        'content',
        'provider',
        'prompt_version',
        'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => AiOutputType::class,
            'period_start' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
            'source_data' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
