<?php

namespace App\Http\Requests\Concerns;

use App\Models\KpiAssignment;
use Illuminate\Contracts\Validation\Validator;

/**
 * Shared by StoreTimeEntryRequest, UpdateTimeEntryRequest, and
 * StartTimerRequest: an employee may optionally report progress against
 * one of their own KPI assignments (individual or their department's).
 */
trait ValidatesKpiAssignment
{
    /**
     * @return array<string, mixed>
     */
    protected function kpiAssignmentRules(): array
    {
        return [
            'kpi_assignment_id' => ['nullable', 'required_with:kpi_progress_value', 'exists:kpi_assignments,id'],
            'kpi_progress_value' => ['nullable', 'required_with:kpi_assignment_id', 'numeric', 'min:0'],
        ];
    }

    protected function validateKpiAssignmentVisibility(Validator $validator): void
    {
        $assignmentId = $this->input('kpi_assignment_id');

        if (! $assignmentId) {
            return;
        }

        $assignment = KpiAssignment::find($assignmentId);

        if (! $assignment || $this->user()->cannot('view', $assignment)) {
            $validator->errors()->add('kpi_assignment_id', 'You are not assigned to this KPI.');
        }
    }
}
