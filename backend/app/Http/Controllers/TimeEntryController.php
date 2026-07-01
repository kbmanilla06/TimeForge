<?php

namespace App\Http\Controllers;

use App\Http\Requests\StartTimerRequest;
use App\Http\Requests\StoreTimeEntryRequest;
use App\Http\Requests\UpdateTimeEntryRequest;
use App\Models\TimeEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class TimeEntryController extends Controller
{
    private const RELATIONS = ['project', 'client', 'department'];

    public function index(Request $request): JsonResponse
    {
        $entries = TimeEntry::where('user_id', $request->user()->id)
            ->with(self::RELATIONS)
            ->orderByDesc('start_time')
            ->get();

        return response()->json($entries);
    }

    public function show(TimeEntry $timeEntry): JsonResponse
    {
        $this->authorize('view', $timeEntry);

        return response()->json($timeEntry->load(self::RELATIONS));
    }

    public function store(StoreTimeEntryRequest $request): JsonResponse
    {
        $timeEntry = TimeEntry::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'department_id' => $request->user()->department_id,
        ]);

        return response()->json($timeEntry->load(self::RELATIONS), 201);
    }

    public function update(UpdateTimeEntryRequest $request, TimeEntry $timeEntry): JsonResponse
    {
        $timeEntry->update($request->validated());

        return response()->json($timeEntry->fresh(self::RELATIONS));
    }

    public function destroy(TimeEntry $timeEntry): JsonResponse
    {
        $this->authorize('delete', $timeEntry);

        $timeEntry->delete();

        return response()->json(status: 204);
    }

    public function startTimer(StartTimerRequest $request): JsonResponse
    {
        $now = now();

        $timeEntry = TimeEntry::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'department_id' => $request->user()->department_id,
            'date' => $now->toDateString(),
            'start_time' => $now,
            'end_time' => null,
        ]);

        return response()->json($timeEntry->load(self::RELATIONS), 201);
    }

    public function stopTimer(TimeEntry $timeEntry): JsonResponse
    {
        $this->authorize('update', $timeEntry);

        if ($timeEntry->end_time !== null) {
            abort(422, 'This time entry is not currently running.');
        }

        $timeEntry->update(['end_time' => now()]);

        return response()->json($timeEntry->fresh(self::RELATIONS));
    }

    public function summary(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $today = Carbon::today();
        [$periodStart, $periodEnd] = $this->currentPayrollPeriod($today);

        $sumMinutes = fn (Carbon $from, Carbon $to) => (int) TimeEntry::where('user_id', $userId)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->sum('duration_minutes');

        return response()->json([
            'today_minutes' => $sumMinutes($today, $today),
            'week_minutes' => $sumMinutes($today->copy()->startOfWeek(), $today->copy()->endOfWeek()),
            'month_minutes' => $sumMinutes($today->copy()->startOfMonth(), $today->copy()->endOfMonth()),
            'payroll_period_minutes' => $sumMinutes($periodStart, $periodEnd),
            'payroll_period_start' => $periodStart->toDateString(),
            'payroll_period_end' => $periodEnd->toDateString(),
        ]);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function currentPayrollPeriod(Carbon $date): array
    {
        if ($date->day <= 15) {
            return [$date->copy()->startOfMonth(), $date->copy()->setDay(15)];
        }

        return [$date->copy()->setDay(16), $date->copy()->endOfMonth()];
    }
}
