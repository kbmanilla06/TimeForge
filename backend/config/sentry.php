<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sentry DSN
    |--------------------------------------------------------------------------
    |
    | The DSN (Data Source Name) tells the Sentry SDK where to send events.
    | If this is null or empty, Sentry will be completely disabled.
    |
    */
    'dsn' => env('SENTRY_LARAVEL_DSN'),

    /*
    |--------------------------------------------------------------------------
    | Environment
    |--------------------------------------------------------------------------
    |
    | The environment designation. By default, it will match Laravel's environment.
    |
    */
    'environment' => env('APP_ENV'),

    /*
    |--------------------------------------------------------------------------
    | Breadcrumbs & Log Integrations
    |--------------------------------------------------------------------------
    |
    | Configurations for what breadcrumbs and logs are automatically captured.
    |
    */
    'breadcrumbs' => [
        'logs' => true,
        'sql_queries' => false, // Set to false to avoid sql injection parameters leakage
        'sql_bindings' => false, // Ensure query parameters are never leaked
        'queue_info' => true,
        'command_info' => true,
    ],

    /*
    |--------------------------------------------------------------------------
    | PII & Sensitive Data Scrubbing
    |--------------------------------------------------------------------------
    |
    | Safeguard privacy by preventing Sentry from sending raw PII or sensitive keys.
    |
    */
    'send_default_pii' => false, // Never send request bodies, cookies, IP, or user details automatically

    /*
    |--------------------------------------------------------------------------
    | Performance Monitoring & Sample Rates
    |--------------------------------------------------------------------------
    |
    | Sample rates for tracing and profiling. Gated by environment variables.
    |
    */
    'traces_sample_rate' => (float) env('SENTRY_TRACES_SAMPLE_RATE', 0.0),
    'profiles_sample_rate' => 0.0,

];
