<?php

namespace Database\Factories;

use App\Models\Department;
use App\Models\Kpi;
use App\Models\KpiAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<KpiAssignment>
 */
class KpiAssignmentFactory extends Factory
{
    /**
     * Define the model's default state: an individual assignment.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'kpi_id' => Kpi::factory(),
            'user_id' => User::factory(),
            'department_id' => null,
            'progress_value' => 0,
        ];
    }

    public function forDepartment(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => null,
            'department_id' => Department::factory(),
        ]);
    }
}
