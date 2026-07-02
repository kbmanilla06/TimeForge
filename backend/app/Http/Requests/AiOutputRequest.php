<?php

namespace App\Http\Requests;

use App\Enums\AiOutputType;
use App\Enums\AiSubjectShape;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Shared validation for listing and generating AI outputs (both endpoints
 * take the same type + date + subject shape). The subject field required
 * (and the others prohibited) follows the type's subject shape; the
 * organization shape takes no subject at all. Role scoping happens in
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
        $shape = AiOutputType::tryFrom((string) $this->input('type'))?->subjectShape();

        return [
            'type' => ['required', 'string', Rule::enum(AiOutputType::class)],
            'date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'user_id' => [
                match ($shape) {
                    AiSubjectShape::User => 'required',
                    null => 'nullable',
                    default => 'prohibited',
                },
                'integer',
                'exists:users,id',
            ],
            'department_id' => [
                match ($shape) {
                    AiSubjectShape::Department => 'required',
                    null => 'nullable',
                    default => 'prohibited',
                },
                'integer',
                'exists:departments,id',
            ],
        ];
    }
}
