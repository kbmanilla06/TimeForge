<?php

namespace Database\Factories;

use App\Models\RegistrationOtp;
use App\Support\OtpPolicy;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<RegistrationOtp>
 */
class RegistrationOtpFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'email' => $this->faker->unique()->safeEmail(),
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(OtpPolicy::TTL_MINUTES),
            'last_sent_at' => now(),
            'attempts' => 0,
            'consumed_at' => null,
        ];
    }

    public function expired(): static
    {
        return $this->state(['expires_at' => now()->subMinute()]);
    }

    public function consumed(): static
    {
        return $this->state(['consumed_at' => now()]);
    }
}
