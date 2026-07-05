<?php

namespace App\Http\Controllers;

use App\Models\Holiday;
use Illuminate\Http\JsonResponse;

/**
 * Read access for any authenticated user (Sprint 49) — holidays need to
 * be visible for attendance/reporting display context, not just Admin.
 * Editing stays admin-only; see Admin\HolidayController.
 */
class HolidayController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Holiday::orderBy('date')->get());
    }
}
