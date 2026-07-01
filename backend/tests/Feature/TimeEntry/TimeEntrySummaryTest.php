<?php

namespace Tests\Feature\TimeEntry;

use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class TimeEntrySummaryTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function tokenFor(User $user): string
    {
        return $user->createToken('api')->plainTextToken;
    }

    public function test_summary_correctly_separates_today_and_this_week(): void
    {
        // Travel to a day guaranteed to be 2 days after its own week start,
        // so "today" and "start of this week" are never the same date,
        // regardless of the real calendar date when the suite runs.
        $this->travelTo(Carbon::now()->startOfWeek()->addDays(2));

        $user = User::factory()->create();
        $token = $this->tokenFor($user);
        $today = Carbon::today();
        $weekStart = $today->copy()->startOfWeek();

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $today->toDateString(),
            'start_time' => $today->copy()->setTime(9, 0),
            'end_time' => $today->copy()->setTime(10, 0),
        ]);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $weekStart->toDateString(),
            'start_time' => $weekStart->copy()->setTime(9, 0),
            'end_time' => $weekStart->copy()->setTime(9, 30),
        ]);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $weekStart->copy()->subDay()->toDateString(),
            'start_time' => $weekStart->copy()->subDay()->setTime(9, 0),
            'end_time' => $weekStart->copy()->subDay()->setTime(20, 0),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/time-entries/summary');

        $response->assertOk();
        $this->assertSame(60, $response->json('today_minutes'));
        $this->assertSame(90, $response->json('week_minutes'));
    }

    public function test_summary_correctly_separates_month_and_payroll_period(): void
    {
        // Day 7 of the month: always within the 1st-15th payroll period,
        // regardless of the real calendar date when the suite runs.
        $this->travelTo(Carbon::now()->startOfMonth()->addDays(6));

        $user = User::factory()->create();
        $token = $this->tokenFor($user);
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $today->toDateString(),
            'start_time' => $today->copy()->setTime(9, 0),
            'end_time' => $today->copy()->setTime(10, 0),
        ]);

        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $monthStart->toDateString(),
            'start_time' => $monthStart->copy()->setTime(9, 0),
            'end_time' => $monthStart->copy()->setTime(9, 45),
        ]);

        // 20th of the month: same month, but the second payroll period.
        $secondPeriodDay = $monthStart->copy()->addDays(19);
        TimeEntry::factory()->create([
            'user_id' => $user->id,
            'date' => $secondPeriodDay->toDateString(),
            'start_time' => $secondPeriodDay->copy()->setTime(9, 0),
            'end_time' => $secondPeriodDay->copy()->setTime(9, 20),
        ]);

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/time-entries/summary');

        $response->assertOk();
        $this->assertSame(125, $response->json('month_minutes'));
        $this->assertSame(105, $response->json('payroll_period_minutes'));
        $this->assertSame($monthStart->toDateString(), $response->json('payroll_period_start'));
        $this->assertSame($monthStart->copy()->setDay(15)->toDateString(), $response->json('payroll_period_end'));
    }
}
