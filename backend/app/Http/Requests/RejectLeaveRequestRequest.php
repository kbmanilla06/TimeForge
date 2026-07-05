<?php

namespace App\Http\Requests;

use App\Enums\LeaveStatus;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class RejectLeaveRequestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('review', $this->route('leaveRequest'));
    }

    /**
     * Rejection reason is optional, same as account request rejection
     * (Sprint 17) — unlike timesheet rejection, which requires a comment.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->route('leaveRequest')->status !== LeaveStatus::Pending) {
                $validator->errors()->add('status', 'Only a pending leave request can be rejected.');
            }
        });
    }
}
