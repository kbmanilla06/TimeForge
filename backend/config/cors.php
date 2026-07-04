<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Sprint 43: explicit allowlist instead of Laravel's wildcard default.
    | This app is Bearer-token-only (no stateful/cookie Sanctum auth, no
    | credentials sent by the frontend), so a wildcard origin isn't a
    | CSRF risk here, but it does let any origin read API responses
    | cross-origin if a token ever leaked into that page's JS context —
    | worth closing as defense-in-depth.
    |
    | Defaults to FRONTEND_URL (the single-SPA case). Set
    | CORS_ALLOWED_ORIGINS (comma-separated) instead if multiple frontend
    | origins need access — e.g. staging + production sharing one
    | backend. Never hardcode a real domain here.
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', env('FRONTEND_URL', 'http://localhost:5173')))
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
