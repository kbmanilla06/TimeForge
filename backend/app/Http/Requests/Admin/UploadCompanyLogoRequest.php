<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

/**
 * Mirrors UpdateProfilePictureRequest's allowlist (Sprint 44), gated by
 * the route's role:admin middleware group instead of a per-user check.
 */
class UploadCompanyLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'extensions:png,jpg,jpeg',
                File::types(['png', 'jpg', 'jpeg'])->max(2 * 1024),
            ],
        ];
    }
}
