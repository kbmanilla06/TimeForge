<?php

namespace App\Policies;

use App\Models\Kpi;
use App\Models\User;

class KpiPolicy
{
    /**
     * The KPI catalog is readable by any active user, so Supervisors/Admins
     * can pick from it when creating an assignment.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Kpi $kpi): bool
    {
        return true;
    }

    /**
     * Only System Administrators define KPIs.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }
}
