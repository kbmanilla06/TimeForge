<?php

namespace App\Models;

use App\Support\OtpPolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * One row per email, verifying registration ownership before an
 * AccountRequest becomes visible to Admins (Sprint 36). Deliberately
 * separate from User/AccountRequest — this is a short-lived, self-service
 * verification artifact, not a permanent record. code_hash is hashed at
 * rest like a password; the plain code only ever exists in the outgoing
 * email and the requester's own input.
 */
class RegistrationOtp extends Model
{
    /** @use HasFactory<\Database\Factories\RegistrationOtpFactory> */
    use HasFactory;

    protected $table = 'email_otps';

    protected $fillable = [
        'email',
        'code_hash',
        'expires_at',
        'last_sent_at',
        'attempts',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    /**
     * Creates or overwrites this email's OTP with a freshly generated code,
     * resetting attempts. Returns the plain code so the caller can email it
     * — it is never persisted or returned again after this.
     */
    public static function issueFor(string $email): string
    {
        $code = OtpPolicy::generateCode();
        $now = Carbon::now();

        static::updateOrCreate(
            ['email' => $email],
            [
                'code_hash' => Hash::make($code),
                'expires_at' => $now->copy()->addMinutes(OtpPolicy::TTL_MINUTES),
                'last_sent_at' => $now,
                'attempts' => 0,
                'consumed_at' => null,
            ]
        );

        return $code;
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isConsumed(): bool
    {
        return $this->consumed_at !== null;
    }

    public function hasExceededAttempts(): bool
    {
        return $this->attempts >= OtpPolicy::MAX_ATTEMPTS;
    }

    public function matches(string $code): bool
    {
        return Hash::check($code, $this->code_hash);
    }

    public function secondsUntilResendAllowed(): int
    {
        $availableAt = $this->last_sent_at->copy()->addSeconds(OtpPolicy::RESEND_COOLDOWN_SECONDS);

        return max(0, (int) Carbon::now()->diffInSeconds($availableAt, false));
    }

    public function canResend(): bool
    {
        return $this->secondsUntilResendAllowed() === 0;
    }

    public function markConsumed(): void
    {
        $this->update(['consumed_at' => Carbon::now()]);
    }

    public function incrementAttempts(): void
    {
        $this->increment('attempts');
    }
}
