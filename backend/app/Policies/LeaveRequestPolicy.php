<?php

namespace App\Policies;

use App\Models\LeaveRequest;
use App\Models\User;

/**
 * Mirrors TimesheetPolicy exactly (Sprint 49) — the owner's department
 * Supervisor or an Admin may review, never the owner themselves.
 */
class LeaveRequestPolicy
{
    /**
     * Any active user may list their own leave requests (index scopes to
     * owner); the team index is scoped separately in the controller.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * The owner, their department Supervisor, or an Admin may view it.
     */
    public function view(User $user, LeaveRequest $leaveRequest): bool
    {
        return $leaveRequest->user_id === $user->id || $this->isReviewerFor($user, $leaveRequest);
    }

    /**
     * Any active user may submit their own leave request.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Approve or reject: the owner's department Supervisor or an Admin,
     * but never the owner themselves.
     */
    public function review(User $user, LeaveRequest $leaveRequest): bool
    {
        if ($leaveRequest->user_id === $user->id) {
            return false;
        }

        return $this->isReviewerFor($user, $leaveRequest);
    }

    private function isReviewerFor(User $user, LeaveRequest $leaveRequest): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isSupervisor()
            && $leaveRequest->user->department_id !== null
            && $leaveRequest->user->department_id === $user->department_id;
    }
}
