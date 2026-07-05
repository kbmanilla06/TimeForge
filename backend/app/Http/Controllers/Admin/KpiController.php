<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreKpiRequest;
use App\Models\AuditLog;
use App\Models\Kpi;
use Illuminate\Http\JsonResponse;

class KpiController extends Controller
{
    public function store(StoreKpiRequest $request): JsonResponse
    {
        $kpi = Kpi::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        AuditLog::record('kpi.created', $kpi, $request->validated());

        return response()->json($kpi, 201);
    }
}
