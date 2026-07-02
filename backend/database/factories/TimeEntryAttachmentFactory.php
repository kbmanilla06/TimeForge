<?php

namespace Database\Factories;

use App\Models\TimeEntry;
use App\Models\TimeEntryAttachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimeEntryAttachment>
 */
class TimeEntryAttachmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'time_entry_id' => TimeEntry::factory(),
            'original_name' => fake()->word().'.pdf',
            'path' => 'time-entry-attachments/'.fake()->uuid().'.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => fake()->numberBetween(1_000, 100_000),
            'uploaded_by' => User::factory(),
        ];
    }
}
