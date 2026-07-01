<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;

/**
 * Read-only, self-service listing for any active user (e.g. to populate a
 * project selector when logging time). Full CRUD remains admin-only via
 * App\Http\Controllers\Admin\ProjectController.
 */
class ProjectController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Project::with('client')->get());
    }
}
