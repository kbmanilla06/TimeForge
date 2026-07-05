<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateCompanySettingsRequest;
use App\Http\Requests\Admin\UploadCompanyLogoRequest;
use App\Models\AuditLog;
use App\Models\CompanySetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class CompanySettingController extends Controller
{
    public function update(UpdateCompanySettingsRequest $request): JsonResponse
    {
        $settings = CompanySetting::current();
        $settings->update($request->validated());

        // Exclude updated_at — it always changes on save and would
        // otherwise falsely trigger this on a no-op request and pollute
        // the metadata with a timestamp that isn't a real field change.
        $changes = collect($settings->getChanges())->except('updated_at')->all();

        if (! empty($changes)) {
            AuditLog::record('company_settings.updated', $settings, $changes);
        }

        return response()->json($settings->toDisplayArray());
    }

    public function uploadLogo(UploadCompanyLogoRequest $request): JsonResponse
    {
        $settings = CompanySetting::current();
        $replaced = (bool) $settings->logo_path;

        if ($settings->logo_path) {
            Storage::delete($settings->logo_path);
        }

        $path = $request->file('file')->store('company-logo');
        $settings->update(['logo_path' => $path]);

        AuditLog::record('company_settings.logo_uploaded', $settings, ['replaced' => $replaced]);

        return response()->json(['message' => 'Company logo updated.']);
    }
}
