<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Seeds exactly one active System Administrator so the system is usable
     * after a fresh install. Only admins can create further users (see
     * docs/DECISIONS.md), so this account is the required bootstrap step.
     *
     * Development-only credentials — see docs/SETUP.md.
     */
    public function run(): void
    {
        User::factory()->admin()->create([
            'name' => 'TimeForge Admin',
            'email' => 'admin@timeforge.test',
            'password' => 'Passw0rd123!',
        ]);
    }
}
