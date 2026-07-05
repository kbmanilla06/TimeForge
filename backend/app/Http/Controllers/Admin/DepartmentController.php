<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDepartmentRequest;
use App\Http\Requests\Admin\UpdateDepartmentRequest;
use App\Models\AuditLog;
use App\Models\Department;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Department::class);

        return response()->json(Department::withCount('users')->get());
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $department = Department::create($request->validated());

        AuditLog::record('department.created', $department, $request->validated());

        return response()->json($department, 201);
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $department->update($request->validated());

        AuditLog::record('department.updated', $department, $request->validated());

        return response()->json($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        $this->authorize('delete', $department);

        $department->delete();

        // The in-memory object's attributes remain readable after
        // delete() (only the DB row is gone), so this only records once
        // the deletion has actually succeeded.
        AuditLog::record('department.deleted', $department, ['name' => $department->name]);

        return response()->json(status: 204);
    }
}
