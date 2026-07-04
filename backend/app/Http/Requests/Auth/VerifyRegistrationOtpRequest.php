<?php

namespace App\Http\Requests\Auth;

use App\Support\OtpPolicy;
use Illuminate\Foundation\Http\FormRequest;

class VerifyRegistrationOtpRequest extends FormRequest
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
            'email' => ['required', 'email'],
            'code' => ['required', 'string', 'size:'.OtpPolicy::CODE_LENGTH],
        ];
    }
}
