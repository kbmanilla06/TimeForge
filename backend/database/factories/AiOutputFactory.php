<?php

namespace Database\Factories;

use App\Enums\AiOutputType;
use App\Models\AiOutput;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<AiOutput>
 */
class AiOutputFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = Carbon::today();

        return [
            'type' => AiOutputType::DailyWorkSummary,
            'user_id' => User::factory(),
            'department_id' => null,
            'period_start' => $date->toDateString(),
            'period_end' => $date->toDateString(),
            'source_data' => [],
            'content' => fake()->paragraph(),
            'provider' => 'stub',
            'prompt_version' => AiOutputType::DailyWorkSummary->promptVersion(),
            'generated_by' => User::factory(),
        ];
    }
}
