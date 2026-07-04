<?php

namespace App\Rules;

use App\Captcha\CaptchaVerifier;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Requires and verifies a CAPTCHA token, but only when captcha.enabled is
 * true (Sprint 37) — the required-ness lives inside the rule itself
 * rather than a separate 'required' validation entry, so disabling
 * captcha.enabled (test/local default off in phpunit.xml) makes the
 * field fully optional with zero changes needed to unrelated callers.
 */
class ValidCaptcha implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! config('captcha.enabled')) {
            return;
        }

        if (! is_string($value) || $value === '') {
            $fail('Please complete the CAPTCHA challenge.');

            return;
        }

        if (! app(CaptchaVerifier::class)->verify($value)) {
            $fail('CAPTCHA verification failed. Please try again.');
        }
    }
}
