<?php

namespace App\Http\Requests\Admin;

use DateTimeZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Gated by the route's role:admin middleware group (Sprint 48) — no
 * per-resource ownership check makes sense for a singleton settings row.
 */
class UpdateCompanySettingsRequest extends FormRequest
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
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'contact_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'default_timezone' => ['sometimes', 'nullable', Rule::in(DateTimeZone::listIdentifiers())],
        ];
    }
}
