<?php

namespace Database\Factories;

use App\Models\DailyScrum;
use App\Models\ScrumComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScrumComment>
 */
class ScrumCommentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'daily_scrum_id' => DailyScrum::factory(),
            'author_id' => User::factory(),
            'comment' => fake()->sentence(),
        ];
    }
}
