<?php

namespace Database\Factories;

use App\Enums\TimesheetStatus;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Timesheet>
 */
class TimesheetFactory extends Factory
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
            'status' => TimesheetStatus::Submitted,
            'submitted_at' => now(),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TimesheetStatus::Approved,
            'reviewed_by' => User::factory(),
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TimesheetStatus::Rejected,
            'reviewed_by' => User::factory(),
            'reviewed_at' => now(),
        ]);
    }

    public function revisionRequested(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TimesheetStatus::RevisionRequested,
            'reviewed_by' => User::factory(),
            'reviewed_at' => now(),
        ]);
    }
}
