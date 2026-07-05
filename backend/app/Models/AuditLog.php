<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use LogicException;

/**
 * Append-only record of sensitive actions (Sprint 46) — login
 * success/failure, account approval/rejection, role/department changes,
 * timesheet review actions, payroll/report exports, attachment and
 * profile-picture activity, password changes, and department/client/
 * project/KPI catalog changes. Never stores passwords, OTP codes,
 * tokens, or other secrets.
 */
class AuditLog extends Model
{
    use HasFactory;

    /**
     * No updated_at column exists — nothing about an audit entry is ever
     * updated. created_at is still auto-set on creation.
     */
    const UPDATED_AT = null;

    protected $fillable = [
        'actor_id',
        'action',
        'subject_type',
        'subject_id',
        'metadata',
        'ip_address',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::updating(function () {
            throw new LogicException('Audit logs are append-only and cannot be updated.');
        });

        static::deleting(function () {
            throw new LogicException('Audit logs are append-only and cannot be deleted.');
        });
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Records one audit entry in a single line from any call site. actor
     * defaults to the current authenticated user — pass null explicitly
     * for actions with no authenticated actor yet (e.g. a failed login).
     * ip_address is captured automatically. Recording is best-effort: a
     * failure here is logged via report() but never allowed to break the
     * underlying action it's describing, the same resilience principle
     * used for notifications (Sprint 45).
     *
     * Never pass a password, OTP code, token, or other secret in
     * $metadata.
     *
     * @param  array<string, mixed>  $metadata
     */
    public static function record(string $action, ?Model $subject = null, array $metadata = [], ?User $actor = null): void
    {
        try {
            static::create([
                'actor_id' => $actor?->id ?? auth()->id(),
                'action' => $action,
                'subject_type' => $subject?->getMorphClass(),
                'subject_id' => $subject?->getKey(),
                'metadata' => $metadata,
                'ip_address' => request()->ip(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
