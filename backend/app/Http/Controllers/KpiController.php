<?php

namespace App\Http\Controllers;

use App\Models\Kpi;
use Illuminate\Http\JsonResponse;

/**
 * Read-only, self-service catalog for any active user (e.g. so a Supervisor
 * or Admin can pick from it when creating an assignment). Creation remains
 * admin-only via App\Http\Controllers\Admin\KpiController.
 */
class KpiController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Kpi::all());
    }
}
