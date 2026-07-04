<?php

namespace App\Support;

/**
 * Fixed parameters for registration email-OTP verification (Sprint 36
 * approved decisions). Not user-configurable — a single, deterministic
 * policy, same spirit as PayrollPeriod's fixed semi-monthly rule.
 */
final class OtpPolicy
{
    public const CODE_LENGTH = 6;

    public const TTL_MINUTES = 10;

    public const RESEND_COOLDOWN_SECONDS = 60;

    public const MAX_ATTEMPTS = 5;

    /**
     * A zero-padded, fixed-length numeric code (e.g. "042613"), so every
     * code is exactly CODE_LENGTH digits — never shorter.
     */
    public static function generateCode(): string
    {
        $max = (10 ** self::CODE_LENGTH) - 1;

        return str_pad((string) random_int(0, $max), self::CODE_LENGTH, '0', STR_PAD_LEFT);
    }
}
