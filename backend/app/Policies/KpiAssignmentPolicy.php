<?php

namespace App\Policies;

use App\Models\KpiAssignment;
use App\Models\User;

class KpiAssignmentPolicy
{
    /**
     * Own assignments (individual or shared department-level), a Supervisor's
     * department, or an Admin.
     */
    public function view(User $user, KpiAssignment $kpiAssignment): bool
    {
        if ($kpiAssignment->user_id === $user->id) {
            return true;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if ($user->isSupervisor()) {
            return $user->department_id !== null
                && $kpiAssignment->scopedDepartmentId() === $user->department_id;
        }

        // A plain employee additionally sees shared department-level
        // assignments for their own department (not another individual's).
        return $kpiAssignment->department_id !== null
            && $kpiAssignment->department_id === $user->department_id;
    }

    /**
     * Coarse gate only — Admin (any target) or Supervisor (their own
     * department only, enforced against the request payload in
     * StoreKpiAssignmentRequest since there is no existing model instance
     * to check the target against yet).
     */
    public function create(User $user): bool
    {
        return $user->isAdmin() || $user->isSupervisor();
    }

    /**
     * Admin (any) or Supervisor (only within their own department).
     */
    public function delete(User $user, KpiAssignment $kpiAssignment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isSupervisor()
            && $user->department_id !== null
            && $kpiAssignment->scopedDepartmentId() === $user->department_id;
    }
}
