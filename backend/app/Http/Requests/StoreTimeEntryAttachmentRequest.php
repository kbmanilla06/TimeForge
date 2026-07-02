<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

/**
 * Enforces the locked attachment rules (Sprint 13 / docs/DECISIONS.md):
 * the client filename's extension AND the server-detected content type
 * must both be in the allowlist (a ".pdf" that isn't really a PDF is
 * rejected), capped at 10MB per file. Ownership/lifecycle authorization
 * happens in the controller via TimeEntryPolicy.
 */
class StoreTimeEntryAttachmentRequest extends FormRequest
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
                'extensions:pdf,png,jpg,jpeg,docx,xlsx',
                File::types(['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx'])->max(10 * 1024),
            ],
        ];
    }
}
