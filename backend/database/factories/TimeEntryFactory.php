<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Department;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<TimeEntry>
 */
class TimeEntryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = Carbon::today();
        $start = $date->copy()->setTime(9, 0);
        $end = $date->copy()->setTime(10, 0);

        return [
            'user_id' => User::factory(),
            'project_id' => null,
            'client_id' => null,
            'department_id' => null,
            'date' => $date->toDateString(),
            'start_time' => $start,
            'end_time' => $end,
            'task' => fake()->sentence(3),
            'work_category' => fake()->randomElement(['Development', 'Design', 'Meeting', 'Documentation']),
            'description' => fake()->sentence(),
            'reference_links' => null,
            'deliverables' => null,
        ];
    }

    public function running(): static
    {
        return $this->state(fn (array $attributes) => [
            'end_time' => null,
        ]);
    }

    public function forProject(Project $project): static
    {
        return $this->state(fn (array $attributes) => [
            'project_id' => $project->id,
        ]);
    }

    public function forClient(Client $client): static
    {
        return $this->state(fn (array $attributes) => [
            'client_id' => $client->id,
        ]);
    }

    public function forDepartment(Department $department): static
    {
        return $this->state(fn (array $attributes) => [
            'department_id' => $department->id,
        ]);
    }
}
