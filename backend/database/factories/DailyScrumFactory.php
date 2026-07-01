<?php

namespace Database\Factories;

use App\Models\DailyScrum;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DailyScrum>
 */
class DailyScrumFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'date' => now()->toDateString(),
            'previous_work' => fake()->sentence(),
            'planned_work' => fake()->sentence(),
            'blockers' => null,
            'notes' => null,
        ];
    }
}
