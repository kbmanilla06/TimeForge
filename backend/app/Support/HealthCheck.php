<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Production health check (Sprint 52) — cheap, safe connectivity checks
 * for the three external dependencies this app relies on: database,
 * Redis (queue/Horizon), and the configured storage disk (local or
 * Supabase Storage). Never returns hostnames, credentials, DSNs, or raw
 * exception messages — a failure is reported via report() (so it still
 * reaches logs/whatever error monitoring is wired up) and the public
 * response only ever says "error", nothing more specific.
 */
final class HealthCheck
{
    /**
     * @return array{status: string, checks: array<string, array{status: string}>, timestamp: string}
     */
    public static function run(): array
    {
        $checks = [
            'database' => self::checkDatabase(),
            'redis' => self::checkRedis(),
            'storage' => self::checkStorage(),
        ];

        $allOk = collect($checks)->every(fn (array $check) => $check['status'] === 'ok');

        return [
            'status' => $allOk ? 'ok' : 'error',
            'checks' => $checks,
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * @return array{status: string}
     */
    private static function checkDatabase(): array
    {
        try {
            DB::select('select 1');

            return ['status' => 'ok'];
        } catch (\Throwable $e) {
            report($e);

            return ['status' => 'error'];
        }
    }

    /**
     * @return array{status: string}
     */
    private static function checkRedis(): array
    {
        try {
            Redis::connection()->ping();

            return ['status' => 'ok'];
        } catch (\Throwable $e) {
            report($e);

            return ['status' => 'error'];
        }
    }

    /**
     * A real put/read/delete round-trip against a small marker file —
     * the only check that works identically regardless of whether the
     * configured default disk is local or S3-compatible (Supabase
     * Storage), which have no shared "is the directory writable"
     * primitive.
     *
     * @return array{status: string}
     */
    private static function checkStorage(): array
    {
        $path = 'health-check/'.Str::random(12).'.txt';

        try {
            Storage::put($path, 'ok');
            $readBack = Storage::get($path);
            Storage::delete($path);

            return ['status' => $readBack === 'ok' ? 'ok' : 'error'];
        } catch (\Throwable $e) {
            report($e);

            return ['status' => 'error'];
        }
    }
}
