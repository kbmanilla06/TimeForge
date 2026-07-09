<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\UpdateProfilePictureRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Self-only (Sprint 24): every action operates on $request->user(), never
 * a route-bound {user}. Admin's edit-any-user path stays entirely
 * separate in Admin\UserController.
 */
class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return response()->json($user->fresh());
    }

    public function uploadPicture(UpdateProfilePictureRequest $request): JsonResponse
    {
        $user = $request->user();
        $file = $request->file('file');

        if (! \App\Support\MalwareScanner::scan($file->getRealPath())) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'file' => ['Malware detected in the uploaded file.'],
            ]);
        }

        $replaced = (bool) $user->profile_picture_path;

        if ($user->profile_picture_path) {
            Storage::delete($user->profile_picture_path);
        }

        $path = $file->store('profile-pictures/'.$user->id);
        $user->update(['profile_picture_path' => $path]);

        AuditLog::record('profile_picture.uploaded', $user, ['replaced' => $replaced], actor: $user);

        return response()->json(['message' => 'Profile picture updated.']);
    }

    public function showPicture(Request $request): StreamedResponse
    {
        $user = $request->user();

        if (! $user->profile_picture_path) {
            abort(404, 'No profile picture set.');
        }

        return Storage::response($user->profile_picture_path);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password is incorrect.'],
            ]);
        }

        $user->update(['password' => $validated['password']]);

        // Never log the password itself — the action + actor + timestamp
        // is the meaningful signal, no further metadata needed.
        AuditLog::record('password.changed', $user, actor: $user);

        return response()->json(['message' => 'Password updated.']);
    }
}
