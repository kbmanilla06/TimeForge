<?php

namespace App\Models;

use App\Enums\AccountRequestStatus;
use Database\Factories\AccountRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountRequest extends Model
{
    /** @use HasFactory<AccountRequestFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'status',
        'terms_accepted_at',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'status' => AccountRequestStatus::class,
            'terms_accepted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
