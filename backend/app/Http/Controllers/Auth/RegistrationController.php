<?php

namespace App\Http\Controllers\Auth;

use App\Enums\AccountRequestStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResendRegistrationOtpRequest;
use App\Http\Requests\Auth\VerifyRegistrationOtpRequest;
use App\Models\AccountRequest;
use App\Models\Department;
use App\Models\RegistrationOtp;
use App\Models\User;
use App\Notifications\NewAccountRequestSubmitted;
use App\Notifications\RegistrationOtpIssued;
use App\Notifications\RegistrationReceived;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class RegistrationController extends Controller
{
    /**
     * Public, unauthenticated list of departments (id + name only) so the
     * registration form can offer a real department picker without
     * exposing the Admin-only department management endpoints.
     */
    public function departments(): JsonResponse
    {
        return response()->json(
            Department::query()->select('id', 'name')->orderBy('name')->get()
        );
    }

    /**
     * Create a pending account request. The applicant is never granted a
     * token here — role is always Employee and status is always Pending,
     * regardless of request input, since neither field is accepted by
     * RegisterRequest's validation rules. Access begins only once an Admin
     * approves the request, which itself only becomes possible after the
     * applicant verifies their email via OTP (Sprint 36) — no
     * RegistrationReceived/NewAccountRequestSubmitted notification fires
     * here; only the OTP email does.
     */
    public function store(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        $name = trim(implode(' ', array_filter([
            $data['first_name'],
            $data['middle_name'] ?? null,
            $data['last_name'],
        ])));

        $user = DB::transaction(function () use ($data, $name) {
            $user = User::create([
                'name' => $name,
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => UserRole::Employee,
                'status' => UserStatus::Pending,
                'department_id' => $data['department_id'],
                'employee_id' => $data['employee_id'] ?? null,
                'position' => $data['position'] ?? null,
                'contact_number' => $data['contact_number'] ?? null,
            ]);

            AccountRequest::create([
                'user_id' => $user->id,
                'status' => AccountRequestStatus::Submitted,
                'terms_accepted_at' => now(),
            ]);

            return $user;
        });

        // Issued after the transaction commits, so a mail failure can never
        // roll back an otherwise-successful registration.
        $code = RegistrationOtp::issueFor($user->email);
        $user->notify(new RegistrationOtpIssued($code));

        return response()->json([
            'message' => 'Check your email for a verification code to continue your registration.',
            'email' => $user->email,
        ], 201);
    }

    /**
     * Verify the emailed code. On success, marks the applicant's email
     * verified and — only now — sends RegistrationReceived to the
     * applicant and NewAccountRequestSubmitted to every active Admin,
     * matching the approved flow: Registration → Email OTP → OTP
     * Verification → Admin Approval.
     */
    public function verifyOtp(VerifyRegistrationOtpRequest $request): JsonResponse
    {
        $email = $request->validated('email');
        $code = $request->validated('code');
        $genericError = 'Invalid or expired code.';

        $otp = RegistrationOtp::where('email', $email)->first();

        if ($otp === null || $otp->isConsumed() || $otp->isExpired() || $otp->hasExceededAttempts()) {
            abort(422, $genericError);
        }

        if (! $otp->matches($code)) {
            $otp->incrementAttempts();
            abort(422, $genericError);
        }

        $otp->markConsumed();

        $user = User::where('email', $email)->first();

        if ($user === null || $user->accountRequest === null) {
            abort(422, $genericError);
        }

        // email_verified_at is intentionally excluded from User::$fillable
        // (it must never be user-settable), so a mass-assignment update()
        // here would silently no-op — same fix already used for
        // TimeEntry::kpi_progress_applied_at.
        $user->forceFill(['email_verified_at' => now()])->save();

        $user->notify(new RegistrationReceived());

        $admins = User::where('role', UserRole::Admin)->where('status', UserStatus::Active)->get();
        Notification::send($admins, new NewAccountRequestSubmitted($user->accountRequest));

        return response()->json([
            'message' => 'Your email has been verified. Your registration is now pending administrator approval.',
        ]);
    }

    /**
     * Issue a fresh code, subject to the resend cooldown. Mirrors
     * forgot-password's anti-enumeration shape (Sprint 18 decision): an
     * email with no pending OTP gets the same generic response as a real
     * resend, so this can't be used to probe which emails registered.
     */
    public function resendOtp(ResendRegistrationOtpRequest $request): JsonResponse
    {
        $email = $request->validated('email');
        $generic = ['message' => 'If a pending registration exists for that email, a new verification code has been sent.'];

        $otp = RegistrationOtp::where('email', $email)->first();

        if ($otp === null || $otp->isConsumed()) {
            return response()->json($generic);
        }

        if (! $otp->canResend()) {
            abort(422, "Please wait {$otp->secondsUntilResendAllowed()} seconds before requesting a new code.");
        }

        $code = RegistrationOtp::issueFor($email);
        User::where('email', $email)->first()?->notify(new RegistrationOtpIssued($code));

        return response()->json($generic);
    }
}
