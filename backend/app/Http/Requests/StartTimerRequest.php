<?php

namespace App\Http\Requests;

use App\Models\TimeEntry;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;

class StartTimerRequest extends FormRequest
{
    /**
     * Any active user may start a timer (enforced by auth:sanctum + active
     * route middleware); no per-record check applies.
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
            'project_id' => ['nullable', 'exists:projects,id'],
            'client_id' => ['nullable', 'exists:clients,id'],
            'task' => ['required', 'string', 'max:255'],
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
            $hasRunningTimer = TimeEntry::where('user_id', $this->user()->id)
                ->whereNull('end_time')
                ->exists();

            if ($hasRunningTimer) {
                $validator->errors()->add(
                    'timer',
                    'You already have a running timer. Stop it before starting a new one.'
                );
            }
        });
    }
}
