<?php

namespace App\Http\Requests;

use App\Models\TimeEntry;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;

class StoreTimeEntryRequest extends FormRequest
{
    /**
     * Any active user may create their own time entries (enforced by
     * auth:sanctum + active route middleware); no per-record check applies.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date', 'before_or_equal:today'],
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'project_id' => ['nullable', 'exists:projects,id'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'task' => ['required', 'string', 'max:255'],
            'task_status' => ['nullable', 'string', 'max:255'],
            'work_category' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'reference_links' => ['nullable', 'array'],
            'reference_links.*' => ['string', 'max:2048'],
            'deliverables' => ['nullable', 'array'],
            'deliverables.*' => ['string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('start_time') || ! $this->filled('end_time')) {
                return;
            }

            $start = Carbon::parse($this->input('start_time'));
            $end = Carbon::parse($this->input('end_time'));

            if (TimeEntry::hasOverlap($this->user()->id, $start, $end)) {
                $validator->errors()->add('start_time', 'This time entry overlaps with an existing entry.');
            }
        });
    }
}
