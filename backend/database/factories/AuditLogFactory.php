<?php

namespace Database\Factories;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditLog>
 */
class AuditLogFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'actor_id' => User::factory(),
            'action' => 'user.activated',
            'subject_type' => User::class,
            'subject_id' => $this->faker->numberBetween(1, 1000),
            'metadata' => [],
            'ip_address' => $this->faker->ipv4(),
            'created_at' => now(),
        ];
    }
}
