<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression coverage for the demo dataset (docs/DEMO.md). The seeder had
 * never run against a real database before the 2026-07-03 QA pass, which
 * uncovered that every demo user was created with the default `pending`
 * status and could not log in (QA run defect D-2).
 */
class DemoDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_all_demo_users_are_active_and_can_log_in(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DemoDataSeeder::class);

        $emails = [
            'admin@timeforge.test',
            'supervisor@timeforge.test',
            'employee@timeforge.test',
            'intern@timeforge.test',
            'marketer@timeforge.test',
            'hr@timeforge.test',
        ];

        foreach ($emails as $email) {
            $user = User::where('email', $email)->first();
            $this->assertNotNull($user, "$email was not seeded");
            $this->assertSame(UserStatus::Active, $user->status, "$email is not active");

            $this->postJson('/api/login', [
                'email' => $email,
                'password' => 'password',
            ])->assertOk()->assertJsonStructure(['user', 'token']);
        }
    }
}
