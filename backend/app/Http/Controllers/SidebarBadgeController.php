<?php

namespace App\Http\Controllers;

use App\Enums\AccountRequestStatus;
use App\Models\AccountRequest;
use App\Models\DailyScrum;
use App\Models\Timesheet;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * One aggregated, role-scoped endpoint powering both the sidebar's
 * per-module unread badges and the notification bell's count — polled on
 * an interval by the frontend (Sprint 23 decision: polling, not
 * broadcasting). Only counts with an existing, unambiguous "needs
 * attention" meaning are included; KPI has none yet, so it's omitted
 * rather than inventing one.
 */
class SidebarBadgeController extends Controller
{
    /**
     * Same team scope as TimesheetController::teamIndex() and
     * DailyScrumController::teamIndex(): admin sees everyone, a
     * supervisor sees their own department, anyone else has no team.
     */
    private function teamScope(User $user, Builder $query): ?Builder
    {
        if ($user->isAdmin()) {
            return $query;
        }

        if ($user->isSupervisor() && $user->department_id) {
            return $query->whereHas('user', fn ($q) => $q->where('department_id', $user->department_id));
        }

        return null;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $counts = [
            'notifications' => $user->unreadNotifications()->count(),
        ];

        if ($teamTimesheets = $this->teamScope($user, Timesheet::where('status', 'submitted'))) {
            $counts['team_timesheets'] = $teamTimesheets->count();
        }

        if ($teamScrum = $this->teamScope($user, DailyScrum::whereDoesntHave('comments'))) {
            $counts['team_scrum'] = $teamScrum->count();
        }

        if ($user->isAdmin()) {
            // Sprint 36 hides a still-submitted request from the Account
            // Approvals list until its applicant verifies their email —
            // this count must match, or the badge promises more than the
            // list actually shows.
            $counts['account_approvals'] = AccountRequest::where('status', AccountRequestStatus::Submitted)
                ->whereHas('user', fn ($query) => $query->whereNotNull('email_verified_at'))
                ->count();
        }

        return response()->json($counts);
    }
}
