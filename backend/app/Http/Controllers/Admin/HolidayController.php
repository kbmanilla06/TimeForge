<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreHolidayRequest;
use App\Http\Requests\Admin\UpdateHolidayRequest;
use App\Models\AuditLog;
use App\Models\Holiday;
use Illuminate\Http\JsonResponse;

class HolidayController extends Controller
{
    public function store(StoreHolidayRequest $request): JsonResponse
    {
        $holiday = Holiday::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        AuditLog::record('holiday.created', $holiday, $request->validated());

        return response()->json($holiday, 201);
    }

    public function update(UpdateHolidayRequest $request, Holiday $holiday): JsonResponse
    {
        $holiday->update($request->validated());

        AuditLog::record('holiday.updated', $holiday, $request->validated());

        return response()->json($holiday);
    }

    public function destroy(Holiday $holiday): JsonResponse
    {
        $holiday->delete();

        AuditLog::record('holiday.deleted', $holiday, ['name' => $holiday->name]);

        return response()->json(status: 204);
    }
}
