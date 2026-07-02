<?php

namespace App\Policies;

use App\Models\TimeEntry;
use App\Models\User;

class TimeEntryPolicy
{
    /**
     * Any active user may list their own entries (index scopes to owner).
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Only the owner may view a specific entry.
     */
    public function view(User $user, TimeEntry $timeEntry): bool
    {
        return $timeEntry->user_id === $user->id;
    }

    /**
     * Any active user may create their own time entries.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Only the owner may update their entry, and only while it isn't
     * locked by a submitted/approved/rejected timesheet (Sprint 5).
     */
    public function update(User $user, TimeEntry $timeEntry): bool
    {
        return $timeEntry->user_id === $user->id && ! $timeEntry->isLocked();
    }

    /**
     * Only the owner may delete their entry, and only while it isn't
     * locked by a submitted/approved/rejected timesheet (Sprint 5).
     */
    public function delete(User $user, TimeEntry $timeEntry): bool
    {
        return $timeEntry->user_id === $user->id && ! $timeEntry->isLocked();
    }

    /**
     * Sprint 13 download matrix: the owner, the owner's own-department
     * Supervisor (who reviews the timesheet this entry belongs to), and
     * Admin. HR/Finance never reaches raw entry attachments, consistent
     * with the standing raw-records rule (Sprints 5/8).
     */
    public function downloadAttachment(User $user, TimeEntry $timeEntry): bool
    {
        if ($user->isAdmin() || $timeEntry->user_id === $user->id) {
            return true;
        }

        return $user->isSupervisor()
            && $user->department_id !== null
            && $user->department_id === $timeEntry->user->department_id;
    }
}
