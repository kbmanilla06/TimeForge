<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        return response()->json(User::with('department')->get());
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create([
            ...$request->validated(),
            'status' => UserStatus::Pending,
        ]);

        return response()->json($user, 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user->update($request->validated());

        return response()->json($user->fresh('department'));
    }

    public function activate(User $user): JsonResponse
    {
        $this->authorize('update', $user);

        $user->update(['status' => UserStatus::Active]);

        return response()->json($user);
    }

    public function deactivate(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->update(['status' => UserStatus::Deactivated]);

        return response()->json($user);
    }
}
