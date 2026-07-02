<?php

namespace App\Http\Requests;

use App\Enums\AiOutputType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shared validation for listing and generating AI outputs (both endpoints
 * take the same type + date + subject shape). Role scoping happens in
 * AiOutputController, mirroring the Dashboard/Team-Hours precedent.
 */
class AiOutputRequest extends FormRequest
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
        $blockers = AiOutputType::RecurringBlockers->value;

        return [
            'type' => ['required', 'string', Rule::enum(AiOutputType::class)],
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'user_id' => [
                'required_unless:type,'.$blockers,
                'prohibited_if:type,'.$blockers,
                'integer',
                'exists:users,id',
            ],
            'department_id' => [
                'required_if:type,'.$blockers,
                'prohibited_unless:type,'.$blockers,
                'integer',
                'exists:departments,id',
            ],
        ];
    }
}
