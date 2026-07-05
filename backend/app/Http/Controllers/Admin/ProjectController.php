<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProjectRequest;
use App\Http\Requests\Admin\UpdateProjectRequest;
use App\Models\AuditLog;
use App\Models\Project;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Project::class);

        return response()->json(Project::with('client')->get());
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = Project::create($request->validated());

        AuditLog::record('project.created', $project, $request->validated());

        return response()->json($project, 201);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $project->update($request->validated());

        AuditLog::record('project.updated', $project, $request->validated());

        return response()->json($project->fresh('client'));
    }

    public function destroy(Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        AuditLog::record('project.deleted', $project, ['name' => $project->name]);

        return response()->json(status: 204);
    }
}
