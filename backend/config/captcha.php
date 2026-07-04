<?php

return [

    /*
    |--------------------------------------------------------------------------
    | CAPTCHA (Sprint 37)
    |--------------------------------------------------------------------------
    |
    | Gates forgot-password/reset-password only (not login, not the
    | authenticated in-app Change Password form). Disabled by default in
    | testing (see phpunit.xml) so the existing password-reset test suite
    | is unaffected; a dedicated test file re-enables it with Http::fake()
    | to exercise the real verification logic.
    |
    */

    'enabled' => env('CAPTCHA_ENABLED', true),

    'provider' => env('CAPTCHA_PROVIDER', 'turnstile'),

    // Cloudflare's own published "always passes" test key pair — safe
    // defaults for local dev, swap for real keys before production:
    // https://developers.cloudflare.com/turnstile/troubleshooting/testing/
    'site_key' => env('TURNSTILE_SITE_KEY', '1x00000000000000000000AA'),
    'secret_key' => env('TURNSTILE_SECRET_KEY', '1x0000000000000000000000000000000AA'),

];
