<?php

namespace App\Captcha;

/**
 * Behind an interface so the provider is a config choice, not hardcoded
 * (same swappable-provider shape as App\Ai\AiProvider, Sprint 11).
 */
interface CaptchaVerifier
{
    public function verify(string $token): bool;
}
