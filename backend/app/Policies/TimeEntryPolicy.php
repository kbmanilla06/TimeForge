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
     * Only the owner may update their entry.
     */
    public function update(User $user, TimeEntry $timeEntry): bool
    {
        return $timeEntry->user_id === $user->id;
    }

    /**
     * Only the owner may delete their entry.
     */
    public function delete(User $user, TimeEntry $timeEntry): bool
    {
        return $timeEntry->user_id === $user->id;
    }
}
