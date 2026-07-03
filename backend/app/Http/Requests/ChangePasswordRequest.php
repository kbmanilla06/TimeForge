<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * current_password's actual verification happens in the controller via
 * Hash::check() against $request->user() — not Laravel's built-in
 * "current_password" rule, which resolves against config('auth.defaults
 * .guard') ("web", session-based) and would silently check the wrong
 * thing for this app's stateless Sanctum bearer-token auth.
 */
class ChangePasswordRequest extends FormRequest
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
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }
}
