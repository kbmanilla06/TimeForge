<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
    }

    public function test_returns_200_and_ok_when_every_dependency_is_healthy(): void
    {
        Redis::shouldReceive('connection')->once()->andReturnSelf();
        Redis::shouldReceive('ping')->once()->andReturn(true);

        $response = $this->getJson('/health');

        $response->assertOk();
        $response->assertJsonPath('status', 'ok');
        $response->assertJsonPath('checks.database.status', 'ok');
        $response->assertJsonPath('checks.redis.status', 'ok');
        $response->assertJsonPath('checks.storage.status', 'ok');
        $this->assertNotNull($response->json('timestamp'));
    }

    public function test_returns_503_when_redis_is_unreachable(): void
    {
        Redis::shouldReceive('connection')->once()->andThrow(new \RuntimeException('connection refused'));

        $response = $this->getJson('/health');

        $response->assertStatus(503);
        $response->assertJsonPath('status', 'error');
        $response->assertJsonPath('checks.redis.status', 'error');
        $response->assertJsonPath('checks.database.status', 'ok');
        $response->assertJsonPath('checks.storage.status', 'ok');
    }

    public function test_never_leaks_the_raw_exception_message(): void
    {
        Redis::shouldReceive('connection')->once()->andThrow(
            new \RuntimeException('redis://default:sup3r-secret-password@10.0.0.5:6379/0 unreachable')
        );

        $response = $this->getJson('/health');

        $body = $response->getContent();
        $this->assertStringNotContainsString('sup3r-secret-password', $body);
        $this->assertStringNotContainsString('10.0.0.5', $body);
        $this->assertStringNotContainsString('redis://', $body);
    }

    public function test_is_publicly_accessible_without_authentication(): void
    {
        Redis::shouldReceive('connection')->once()->andReturnSelf();
        Redis::shouldReceive('ping')->once()->andReturn(true);

        // No Authorization header at all.
        $this->getJson('/health')->assertOk();
    }

    public function test_health_check_requests_are_throttled_after_thirty_per_minute(): void
    {
        Redis::shouldReceive('connection')->andReturnSelf();
        Redis::shouldReceive('ping')->andReturn(true);

        for ($i = 0; $i < 30; $i++) {
            $this->getJson('/health')->assertStatus(200);
        }

        $this->getJson('/health')->assertStatus(429);
    }
}
