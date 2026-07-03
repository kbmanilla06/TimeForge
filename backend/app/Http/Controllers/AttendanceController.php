<?php

namespace App\Http\Controllers;

use App\Models\AttendanceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Self-only: every endpoint operates on the authenticated user's own
 * session for "today" — there is at most one, so no id is ever needed in
 * the URL. Informational only; never read by Payroll (Sprint 22 decision).
 */
class AttendanceController extends Controller
{
    /**
     * @return array<string, mixed>
     */
    private function present(AttendanceSession $session): array
    {
        return [
            'id' => $session->id,
            'date' => $session->date->toDateString(),
            'time_in' => $session->time_in->toIso8601String(),
            'break_started_at' => $session->break_started_at?->toIso8601String(),
            'break_resumed_at' => $session->break_resumed_at?->toIso8601String(),
            'time_out' => $session->time_out?->toIso8601String(),
            'is_on_break' => $session->isOnBreak(),
            'has_used_break' => $session->hasUsedBreak(),
            'is_timed_out' => $session->isTimedOut(),
            'working_minutes' => $session->workingMinutes(),
            'break_minutes' => $session->breakMinutes(),
            'total_minutes' => $session->totalMinutes(),
        ];
    }

    private function todaysSession(Request $request): ?AttendanceSession
    {
        return AttendanceSession::where('user_id', $request->user()->id)
            ->where('date', Carbon::today()->toDateString())
            ->first();
    }

    public function today(Request $request): JsonResponse
    {
        $session = $this->todaysSession($request);

        // Wrapped in an envelope rather than a bare payload: Laravel's
        // response()->json(null) encodes to "{}", not the JSON literal
        // null, which would make "no session yet" indistinguishable from
        // a malformed response on the frontend.
        return response()->json(['session' => $session ? $this->present($session) : null]);
    }

    public function timeIn(Request $request): JsonResponse
    {
        if ($this->todaysSession($request) !== null) {
            abort(422, 'You have already clocked in today.');
        }

        $session = AttendanceSession::create([
            'user_id' => $request->user()->id,
            'date' => Carbon::today()->toDateString(),
            'time_in' => Carbon::now(),
        ]);

        return response()->json($this->present($session), 201);
    }

    public function pause(Request $request): JsonResponse
    {
        $session = $this->todaysSession($request);

        if ($session === null || $session->isTimedOut()) {
            abort(422, 'You are not currently clocked in.');
        }

        if ($session->hasUsedBreak()) {
            abort(422, 'Only one break is allowed per day.');
        }

        $session->update(['break_started_at' => Carbon::now()]);

        return response()->json($this->present($session->fresh()));
    }

    public function resume(Request $request): JsonResponse
    {
        $session = $this->todaysSession($request);

        if ($session === null || ! $session->isOnBreak()) {
            abort(422, 'You are not currently on a break.');
        }

        $session->update(['break_resumed_at' => Carbon::now()]);

        return response()->json($this->present($session->fresh()));
    }

    public function timeOut(Request $request): JsonResponse
    {
        $session = $this->todaysSession($request);

        if ($session === null || $session->isTimedOut()) {
            abort(422, 'You are not currently clocked in.');
        }

        $now = Carbon::now();

        // If a break was started but never explicitly resumed, Time Out
        // resumes it first (approved Sprint 21 decision) rather than
        // blocking the action.
        $session->update([
            'break_resumed_at' => $session->isOnBreak() ? $now : $session->break_resumed_at,
            'time_out' => $now,
        ]);

        return response()->json($this->present($session->fresh()));
    }
}
