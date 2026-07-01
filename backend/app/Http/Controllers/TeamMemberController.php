<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Minimal self-service directory so a Supervisor/Admin can pick an
 * assignee when creating a KPI assignment. Mirrors the scoping already
 * established by TimesheetController::teamIndex().
 */
class TeamMemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $query = User::query();
        } elseif ($user->isSupervisor() && $user->department_id) {
            $query = User::where('department_id', $user->department_id);
        } else {
            abort(403, 'You do not have a team to view.');
        }

        $members = $query->orderBy('name')->get(['id', 'name', 'department_id']);

        return response()->json($members);
    }
}
