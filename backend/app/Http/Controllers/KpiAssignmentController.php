<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreKpiAssignmentRequest;
use App\Models\KpiAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KpiAssignmentController extends Controller
{
    private const RELATIONS = ['kpi', 'user', 'department'];

    public function mine(Request $request): JsonResponse
    {
        $user = $request->user();

        $assignments = KpiAssignment::where('user_id', $user->id)
            ->when(
                $user->department_id,
                fn ($query) => $query->orWhere('department_id', $user->department_id)
            )
            ->with(self::RELATIONS)
            ->get();

        return response()->json($assignments);
    }

    public function team(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $query = KpiAssignment::query();
        } elseif ($user->isSupervisor() && $user->department_id) {
            $departmentId = $user->department_id;
            $query = KpiAssignment::where('department_id', $departmentId)
                ->orWhereHas('user', fn ($q) => $q->where('department_id', $departmentId));
        } else {
            abort(403, 'You do not have a team to view.');
        }

        return response()->json($query->with(self::RELATIONS)->get());
    }

    public function store(StoreKpiAssignmentRequest $request): JsonResponse
    {
        $assignment = KpiAssignment::create($request->validated());

        return response()->json($assignment->load(self::RELATIONS), 201);
    }

    public function destroy(KpiAssignment $kpiAssignment): JsonResponse
    {
        $this->authorize('delete', $kpiAssignment);

        $kpiAssignment->delete();

        return response()->json(status: 204);
    }
}
