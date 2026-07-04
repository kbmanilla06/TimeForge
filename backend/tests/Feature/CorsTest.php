<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Sprint 43: config/cors.php replaced Laravel's wildcard CORS default
 * with an explicit allowlist. Confirmed live before this sprint that an
 * arbitrary origin received "Access-Control-Allow-Origin: *". These
 * tests pin a known allowed_origins value via config() rather than
 * relying on whatever FRONTEND_URL happens to be in this environment's
 * .env, so the test is deterministic regardless of local configuration.
 */
class CorsTest extends TestCase
{
    public function test_an_allowed_origin_receives_the_correct_cors_header(): void
    {
        config(['cors.allowed_origins' => ['https://app.example.com']]);

        $response = $this->withHeaders([
            'Origin' => 'https://app.example.com',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/login');

        $response->assertHeader('Access-Control-Allow-Origin', 'https://app.example.com');
    }

    /**
     * With exactly one configured origin (the default/common case — a
     * single FRONTEND_URL), the underlying fruitcake/php-cors library
     * always echoes that one configured value rather than gating
     * per-request — this is safe because the browser itself enforces
     * the same-origin match against the header before exposing the
     * response to JS, and confirms the real security property: the
     * server never reflects an arbitrary attacker-supplied Origin back
     * (it must be this configured value, not the request's own origin).
     */
    public function test_a_single_configured_origin_is_never_reflected_from_an_arbitrary_request_origin(): void
    {
        config(['cors.allowed_origins' => ['https://app.example.com']]);

        $response = $this->withHeaders([
            'Origin' => 'https://evil.example.com',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/login');

        $response->assertHeader('Access-Control-Allow-Origin', 'https://app.example.com');
        $this->assertNotSame('https://evil.example.com', $response->headers->get('Access-Control-Allow-Origin'));
    }

    /**
     * With more than one configured origin (the CORS_ALLOWED_ORIGINS
     * multi-environment case), the library switches to genuine
     * per-request gating: a listed origin is reflected, an unlisted one
     * gets no header at all.
     */
    public function test_with_multiple_configured_origins_an_unlisted_origin_receives_no_header(): void
    {
        config(['cors.allowed_origins' => ['https://staging.example.com', 'https://app.example.com']]);

        $allowed = $this->withHeaders([
            'Origin' => 'https://app.example.com',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/login');
        $allowed->assertHeader('Access-Control-Allow-Origin', 'https://app.example.com');

        $unlisted = $this->withHeaders([
            'Origin' => 'https://evil.example.com',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/login');
        $unlisted->assertHeaderMissing('Access-Control-Allow-Origin');
    }

    /**
     * Uses whatever config/cors.php actually resolves to at boot (not an
     * overridden value) — proves the real default is a real allowlist,
     * never a wildcard, regardless of what FRONTEND_URL is set to.
     */
    public function test_the_configured_allowed_origins_are_never_a_wildcard(): void
    {
        $this->assertNotContains('*', config('cors.allowed_origins'));
    }
}
