<?php

namespace App\Http\Controllers\Auth;

use App\Enums\AccountRequestStatus;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\AccountRequest;
use App\Models\Department;
use App\Models\User;
use App\Notifications\NewAccountRequestSubmitted;
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
     * RegisterRequest's validation rules. Access begins only once an
     * Admin approves the request (a later sprint).
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

        // Notified after the transaction commits, so a mail failure can
        // never roll back an otherwise-successful registration.
        $user->notify(new RegistrationReceived());

        $admins = User::where('role', UserRole::Admin)->where('status', UserStatus::Active)->get();
        Notification::send($admins, new NewAccountRequestSubmitted($user->accountRequest));

        return response()->json([
            'message' => 'Your registration has been received and is pending administrator approval.',
        ], 201);
    }
}
