<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = $request->user()->notifications()->latest();

        if (! empty($validated['limit'])) {
            $query->limit($validated['limit']);
        }

        return response()->json($query->get());
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        $model = $request->user()->notifications()->findOrFail($notification);
        $model->markAsRead();

        return response()->json($model->fresh());
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
