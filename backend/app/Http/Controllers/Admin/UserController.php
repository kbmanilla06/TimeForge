<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        return response()->json(User::with('department')->get()->each->makeVisible('hourly_rate'));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create([
            ...$request->validated(),
            'status' => UserStatus::Pending,
        ]);

        return response()->json($user->makeVisible('hourly_rate'), 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $oldRole = $user->role;
        $oldDepartmentId = $user->department_id;

        $user->update($request->validated());

        // Sprint 46: only these two fields are audited as "sensitive" —
        // role and department govern access/scope. Captured before
        // update() rather than relying on Eloquent's post-save original-
        // attribute tracking, to avoid any ambiguity over whether that
        // tracking applies casts consistently.
        if ($user->role !== $oldRole) {
            AuditLog::record('user.role_changed', $user, ['old' => $oldRole->value, 'new' => $user->role->value]);
        }

        if ($user->department_id !== $oldDepartmentId) {
            AuditLog::record('user.department_changed', $user, ['old' => $oldDepartmentId, 'new' => $user->department_id]);
        }

        return response()->json($user->fresh('department')->makeVisible('hourly_rate'));
    }

    public function activate(User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $user->update(['status' => UserStatus::Active]);

        AuditLog::record('user.activated', $user);

        return response()->json($user->makeVisible('hourly_rate'));
    }

    public function deactivate(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->update(['status' => UserStatus::Deactivated]);

        AuditLog::record('user.deactivated', $user);

        return response()->json($user->makeVisible('hourly_rate'));
    }
}
