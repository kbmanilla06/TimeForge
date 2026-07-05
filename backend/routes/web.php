<?php

use App\Support\HealthCheck;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
    ]);
});

/**
 * Production health check (Sprint 52) — public and unauthenticated, per
 * standard monitoring/load-balancer convention (these tools generally
 * can't authenticate); throttle:lookup (Sprint 19) applies as
 * defense-in-depth since this is a harmless, non-brute-forceable public
 * read. 200 if every dependency check passes, 503 if any fails, so a
 * monitor can act on the status code alone without parsing the body.
 */
Route::middleware('throttle:lookup')->get('/health', function () {
    $result = HealthCheck::run();

    return response()->json($result, $result['status'] === 'ok' ? 200 : 503);
});
