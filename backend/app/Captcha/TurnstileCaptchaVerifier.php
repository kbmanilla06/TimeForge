<?php

namespace App\Captcha;

use Illuminate\Support\Facades\Http;

/**
 * Verifies a Cloudflare Turnstile token server-side. The token is only
 * ever produced client-side by the widget; verification always happens
 * here, never trusted from the client alone.
 */
final class TurnstileCaptchaVerifier implements CaptchaVerifier
{
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function verify(string $token): bool
    {
        $response = Http::asForm()->post(self::VERIFY_URL, [
            'secret' => config('captcha.secret_key'),
            'response' => $token,
        ]);

        return $response->successful() && $response->json('success') === true;
    }
}
