<?php

namespace App\Http\Requests;

use App\Enums\TimesheetStatus;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class ReopenTimesheetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('reopen', $this->route('timesheet'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'comment' => ['nullable', 'string'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->route('timesheet')->status !== TimesheetStatus::Approved) {
                $validator->errors()->add('status', 'Only an approved timesheet can be reopened.');
            }
        });
    }
}
