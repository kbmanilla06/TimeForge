<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDailyScrumRequest;
use App\Http\Requests\StoreScrumCommentRequest;
use App\Models\DailyScrum;
use App\Models\ScrumComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyScrumController extends Controller
{
    private const RELATIONS = ['comments.author'];

    public function index(Request $request): JsonResponse
    {
        $scrums = DailyScrum::where('user_id', $request->user()->id)
            ->with(self::RELATIONS)
            ->orderByDesc('date')
            ->get();

        return response()->json($scrums);
    }

    public function teamIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $query = DailyScrum::query();
        } elseif ($user->isSupervisor() && $user->department_id) {
            $query = DailyScrum::whereHas(
                'user',
                fn ($q) => $q->where('department_id', $user->department_id)
            );
        } else {
            abort(403, 'You do not have a team to review.');
        }

        $scrums = $query->with([...self::RELATIONS, 'user'])
            ->orderByDesc('date')
            ->get();

        return response()->json($scrums);
    }

    public function show(DailyScrum $dailyScrum): JsonResponse
    {
        $this->authorize('view', $dailyScrum);

        return response()->json($dailyScrum->load([...self::RELATIONS, 'user']));
    }

    public function store(StoreDailyScrumRequest $request): JsonResponse
    {
        $user = $request->user();
        $date = $request->validated('date');

        $scrum = DailyScrum::firstOrNew(['user_id' => $user->id, 'date' => $date]);

        if ($scrum->exists && $scrum->isLocked()) {
            abort(422, 'This daily scrum entry has already been reviewed and can no longer be edited.');
        }

        $scrum->fill([
            'previous_work' => $request->validated('previous_work'),
            'planned_work' => $request->validated('planned_work'),
            'blockers' => $request->validated('blockers'),
            'notes' => $request->validated('notes'),
        ]);
        $scrum->save();

        return response()->json($scrum->load(self::RELATIONS), $scrum->wasRecentlyCreated ? 201 : 200);
    }

    public function comment(StoreScrumCommentRequest $request, DailyScrum $dailyScrum): JsonResponse
    {
        ScrumComment::create([
            'daily_scrum_id' => $dailyScrum->id,
            'author_id' => $request->user()->id,
            'comment' => $request->validated('comment'),
        ]);

        return response()->json($dailyScrum->fresh(self::RELATIONS), 201);
    }
}
