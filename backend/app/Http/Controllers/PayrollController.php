<?php

namespace App\Http\Controllers;

use App\Enums\TimesheetStatus;
use App\Enums\UserStatus;
use App\Models\TimeEntry;
use App\Models\User;
use App\Support\PayrollPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PayrollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! ($user->isAdmin() || $user->isHrFinance())) {
            abort(403, 'You are not authorized to view payroll data.');
        }

        $referenceDate = $request->filled('date') ? Carbon::parse($request->query('date')) : Carbon::today();
        [$periodStart, $periodEnd] = PayrollPeriod::resolve($referenceDate);

        $entriesByUser = TimeEntry::with('timesheet')
            ->whereBetween('date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->get()
            ->groupBy('user_id');

        $overtimeMultiplier = (float) config('payroll.overtime_multiplier');

        $summaries = User::where('status', UserStatus::Active)
            ->with('department')
            ->get()
            ->map(function (User $employee) use ($entriesByUser, $overtimeMultiplier, $periodStart, $periodEnd) {
                return $this->summarizeForEmployee(
                    $employee,
                    $entriesByUser->get($employee->id, collect()),
                    $overtimeMultiplier,
                    $periodStart,
                    $periodEnd,
                );
            });

        return response()->json($summaries->values());
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TimeEntry>  $entries
     * @return array<string, mixed>
     */
    private function summarizeForEmployee(
        User $employee,
        $entries,
        float $overtimeMultiplier,
        Carbon $periodStart,
        Carbon $periodEnd
    ): array {
        $byDate = $entries->groupBy(fn (TimeEntry $entry) => $entry->date->toDateString());

        $regularMinutes = 0;
        $overtimeMinutes = 0;
        $pendingMinutes = 0;
        $rejectedMinutes = 0;

        foreach ($byDate as $dateEntries) {
            $dailyMinutes = (int) $dateEntries->sum('duration_minutes');
            $timesheet = $dateEntries->first()->timesheet;

            if ($timesheet === null) {
                continue;
            }

            if ($timesheet->status === TimesheetStatus::Approved) {
                $regularMinutes += min($dailyMinutes, 480);
                $overtimeMinutes += max(0, $dailyMinutes - 480);
            } elseif (in_array($timesheet->status, [TimesheetStatus::Submitted, TimesheetStatus::RevisionRequested], true)) {
                $pendingMinutes += $dailyMinutes;
            } elseif ($timesheet->status === TimesheetStatus::Rejected) {
                $rejectedMinutes += $dailyMinutes;
            }
        }

        $hourlyRate = $employee->hourly_rate !== null ? (float) $employee->hourly_rate : null;
        $regularHours = $regularMinutes / 60;
        $overtimeHours = $overtimeMinutes / 60;

        $estimatedPayroll = $hourlyRate !== null
            ? round(($regularHours * $hourlyRate) + ($overtimeHours * $hourlyRate * $overtimeMultiplier), 2)
            : null;

        return [
            'user_id' => $employee->id,
            'name' => $employee->name,
            'department' => $employee->department?->name,
            'hourly_rate' => $hourlyRate,
            'approved_minutes' => $regularMinutes + $overtimeMinutes,
            'regular_minutes' => $regularMinutes,
            'overtime_minutes' => $overtimeMinutes,
            'pending_minutes' => $pendingMinutes,
            'rejected_minutes' => $rejectedMinutes,
            'attendance_days' => $byDate->count(),
            'estimated_payroll' => $estimatedPayroll,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
        ];
    }
}
