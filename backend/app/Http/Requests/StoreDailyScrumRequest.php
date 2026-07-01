<?php

namespace App\Http\Requests;

use App\Models\DailyScrum;
use Illuminate\Foundation\Http\FormRequest;

class StoreDailyScrumRequest extends FormRequest
{
    /**
     * Any active user may submit their own entry (the "already locked"
     * check happens in the controller, since it depends on looking up the
     * existing row for this date — same pattern as SubmitTimesheetRequest).
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', DailyScrum::class);
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
            'previous_work' => ['required', 'string'],
            'planned_work' => ['required', 'string'],
            'blockers' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
