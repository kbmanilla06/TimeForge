<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Self-service profile edit (Sprint 24). Deliberately narrow: only
 * Contact Number and Position are self-editable per the approved
 * decision — Name and role/department stay Admin-only, via
 * Admin\UserController, untouched by this request.
 */
class UpdateProfileRequest extends FormRequest
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
            'contact_number' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
        ];
    }
}
