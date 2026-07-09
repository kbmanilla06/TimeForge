<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AI Provider
    |--------------------------------------------------------------------------
    |
    | Which App\Ai\AiProvider implementation generates AI output. Per the
    | approved Sprint 11 decisions, only the deterministic local "stub"
    | provider exists: it makes no network calls, needs no credentials, and
    | derives its text strictly from stored TimeForge records. Real provider
    | selection (and the data-privacy rules that must accompany it) is
    | explicitly deferred — see docs/DECISIONS.md, Decisions Still Required.
    |
    */

    'provider' => env('AI_PROVIDER', 'stub'),
    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-1.5-pro'),
    ],

];
