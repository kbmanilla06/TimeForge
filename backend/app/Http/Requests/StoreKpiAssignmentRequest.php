<?php

namespace App\Http\Requests;

use App\Models\KpiAssignment;
use App\Models\User;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StoreKpiAssignmentRequest extends FormRequest
{
    /**
     * Coarse gate (Admin or Supervisor); the specific target is scoped
     * further in withValidator() below, since a Supervisor may only target
     * their own department or its members.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', KpiAssignment::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'kpi_id' => ['required', 'exists:kpis,id'],
            'user_id' => ['nullable', 'required_without:department_id', 'exists:users,id'],
            'department_id' => ['nullable', 'required_without:user_id', 'exists:departments,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $userId = $this->input('user_id');
            $departmentId = $this->input('department_id');

            if ($userId && $departmentId) {
                $validator->errors()->add('user_id', 'Assign to either a user or a department, not both.');

                return;
            }

            $actor = $this->user();

            if ($actor->isAdmin()) {
                return;
            }

            if ($departmentId && (int) $departmentId !== $actor->department_id) {
                $validator->errors()->add('department_id', 'You may only assign KPIs within your own department.');
            }

            if ($userId) {
                $targetUser = User::find($userId);
                if (! $targetUser || $targetUser->department_id !== $actor->department_id) {
                    $validator->errors()->add('user_id', 'You may only assign KPIs to users in your own department.');
                }
            }
        });
    }
}
