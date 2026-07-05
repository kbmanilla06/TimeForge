<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Rules\ValidCaptcha;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            AuditLog::record('login.failed', $user, ['email' => $credentials['email']]);

            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! $user->isActive()) {
            AuditLog::record('login.failed', $user, ['email' => $credentials['email'], 'reason' => 'inactive']);

            throw ValidationException::withMessages([
                'email' => ['Your account is not active yet. Contact your administrator.'],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        AuditLog::record('login.success', $user, actor: $user);

        return response()->json([
            'user' => $user->load('department'),
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        AuditLog::record('logout', $request->user());

        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->load('department')]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
            'captcha_token' => $this->captchaRules(),
        ]);

        // Sprint 18 hardening: always respond identically (200, same message)
        // regardless of whether the email exists, whether a link was
        // actually sent, or whether the broker's own request is throttled.
        // Anything status-dependent here would let an unauthenticated
        // caller enumerate which emails have accounts. Sprint 45: this
        // includes a broken mail provider — without the try/catch, a real
        // email hitting a genuine send attempt (unlike a fake email, which
        // the broker never attempts to mail at all) would throw and return
        // a distinguishable 500, defeating the whole guarantee above.
        try {
            Password::sendResetLink($request->only('email'));
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'captcha_token' => $this->captchaRules(),
        ]);

        $resetUser = null;

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) use (&$resetUser): void {
                $user->forceFill(['password' => $password])->save();
                $resetUser = $user;

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET && $resetUser) {
            // The user has no live Bearer token at this point, but their
            // identity is proven by possession of a valid reset token —
            // reasonable to record them as both subject and actor.
            AuditLog::record('password.reset', $resetUser, actor: $resetUser);
        }

        return $status === Password::PASSWORD_RESET
            ? response()->json(['message' => __($status)])
            : response()->json(['message' => __($status)], 422);
    }

    /**
     * Sprint 37: captcha_token is genuinely required — not just validated
     * if present — whenever captcha.enabled is true. requiredIf's
     * condition is implicit, so (unlike a plain custom rule alone) an
     * entirely absent field still fails validation instead of silently
     * skipping the check. bail stops at the first failure so a missing
     * token doesn't also trigger ValidCaptcha's own message.
     *
     * @return array<int, mixed>
     */
    private function captchaRules(): array
    {
        return [
            'bail',
            Rule::requiredIf(fn () => (bool) config('captcha.enabled')),
            'nullable',
            'string',
            new ValidCaptcha,
        ];
    }
}
