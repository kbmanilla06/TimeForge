<?php

namespace App\Policies;

use App\Models\DailyScrum;
use App\Models\User;

class DailyScrumPolicy
{
    /**
     * Any active user may list their own entries (index scopes to owner);
     * the team index is scoped separately in the controller.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * The owner, their department Supervisor, or an Admin may view it.
     */
    public function view(User $user, DailyScrum $dailyScrum): bool
    {
        return $dailyScrum->user_id === $user->id || $this->isReviewerFor($user, $dailyScrum);
    }

    /**
     * Any active user may submit their own entry.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Only the owner may edit it, and only until it has been commented on.
     */
    public function update(User $user, DailyScrum $dailyScrum): bool
    {
        return $dailyScrum->user_id === $user->id && ! $dailyScrum->isLocked();
    }

    /**
     * Comment: the owner's department Supervisor or an Admin, but never
     * the owner themselves — employees do not comment on their own entries.
     */
    public function comment(User $user, DailyScrum $dailyScrum): bool
    {
        if ($dailyScrum->user_id === $user->id) {
            return false;
        }

        return $this->isReviewerFor($user, $dailyScrum);
    }

    private function isReviewerFor(User $user, DailyScrum $dailyScrum): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isSupervisor()
            && $dailyScrum->user->department_id !== null
            && $dailyScrum->user->department_id === $user->department_id;
    }
}
