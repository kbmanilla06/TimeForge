<?php

namespace Database\Factories;

use App\Models\AttendanceSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<AttendanceSession>
 */
class AttendanceSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $timeIn = Carbon::today()->setTime(9, 0);

        return [
            'user_id' => User::factory(),
            'date' => Carbon::today()->toDateString(),
            'time_in' => $timeIn,
        ];
    }

    public function onBreak(): static
    {
        return $this->state(fn (array $attributes) => [
            'break_started_at' => Carbon::parse($attributes['time_in'])->addHours(3),
        ]);
    }

    public function breakCompleted(): static
    {
        return $this->state(fn (array $attributes) => [
            'break_started_at' => Carbon::parse($attributes['time_in'])->addHours(3),
            'break_resumed_at' => Carbon::parse($attributes['time_in'])->addHours(3)->addMinutes(30),
        ]);
    }

    public function timedOut(): static
    {
        return $this->breakCompleted()->state(fn (array $attributes) => [
            'time_out' => Carbon::parse($attributes['time_in'])->addHours(8)->addMinutes(30),
        ]);
    }
}
