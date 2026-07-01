<?php

namespace App\Policies;

use App\Models\Timesheet;
use App\Models\User;

class TimesheetPolicy
{
    /**
     * Any active user may list their own timesheets (index scopes to owner);
     * the team index is scoped separately in the controller.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * The owner, their department Supervisor, or an Admin may view it.
     */
    public function view(User $user, Timesheet $timesheet): bool
    {
        return $timesheet->user_id === $user->id || $this->isReviewerFor($user, $timesheet);
    }

    /**
     * Any active user may submit their own timesheet.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Approve, reject, or request revision: the owner's department
     * Supervisor or an Admin, but never the owner themselves.
     */
    public function review(User $user, Timesheet $timesheet): bool
    {
        if ($timesheet->user_id === $user->id) {
            return false;
        }

        return $this->isReviewerFor($user, $timesheet);
    }

    /**
     * Reopening a finally-approved timesheet is Admin-only, and not on
     * the Admin's own timesheet.
     */
    public function reopen(User $user, Timesheet $timesheet): bool
    {
        return $user->isAdmin() && $timesheet->user_id !== $user->id;
    }

    private function isReviewerFor(User $user, Timesheet $timesheet): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isSupervisor()
            && $timesheet->user->department_id !== null
            && $timesheet->user->department_id === $user->department_id;
    }
}
