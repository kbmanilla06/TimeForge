<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Gated by the route's role:admin middleware group (Sprint 49) — no
 * dedicated HolidayPolicy, matching Department/Client/Project's
 * existing convention.
 */
class UpdateHolidayRequest extends FormRequest
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
            'date' => ['sometimes', 'required', 'date_format:Y-m-d', Rule::unique('holidays', 'date')->ignore($this->route('holiday'))],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
        ];
    }
}
