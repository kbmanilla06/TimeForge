<?php

namespace Database\Factories;

use App\Enums\TimesheetCommentAction;
use App\Models\Timesheet;
use App\Models\TimesheetComment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimesheetComment>
 */
class TimesheetCommentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'timesheet_id' => Timesheet::factory(),
            'author_id' => User::factory(),
            'action' => TimesheetCommentAction::Approved,
            'comment' => fake()->sentence(),
        ];
    }
}
