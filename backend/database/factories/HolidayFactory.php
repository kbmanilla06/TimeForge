<?php

namespace Database\Factories;

use App\Models\Holiday;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Holiday>
 */
class HolidayFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'date' => $this->faker->unique()->dateTimeBetween('now', '+1 year')->format('Y-m-d'),
            'name' => $this->faker->words(2, true),
            'created_by' => User::factory(),
        ];
    }
}
