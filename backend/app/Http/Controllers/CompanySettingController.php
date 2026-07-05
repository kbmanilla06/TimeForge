<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Read access for any authenticated user (Sprint 48) — company
 * name/logo are shown in the sidebar for every role, not just Admin.
 * Editing stays admin-only; see Admin\CompanySettingController.
 */
class CompanySettingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(CompanySetting::current()->toDisplayArray());
    }

    public function logo(): StreamedResponse
    {
        $settings = CompanySetting::current();

        if (! $settings->logo_path) {
            abort(404, 'No company logo set.');
        }

        return Storage::response($settings->logo_path);
    }
}
