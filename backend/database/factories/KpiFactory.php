<?php

namespace Database\Factories;

use App\Models\Kpi;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Kpi>
 */
class KpiFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true),
            'target_value' => 10,
            'unit' => 'items',
            'created_by' => User::factory(),
        ];
    }
}
