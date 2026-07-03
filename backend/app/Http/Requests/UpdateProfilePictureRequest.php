<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

/**
 * Mirrors StoreTimeEntryAttachmentRequest's allowlist style (Sprint 13),
 * narrowed to images and a smaller cap appropriate for an avatar rather
 * than a document.
 */
class UpdateProfilePictureRequest extends FormRequest
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
