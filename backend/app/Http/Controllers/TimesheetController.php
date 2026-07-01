<?php

namespace App\Http\Controllers;

use App\Enums\TimesheetCommentAction;
use App\Enums\TimesheetStatus;
use App\Enums\UserRole;
use App\Http\Requests\ApproveTimesheetRequest;
use App\Http\Requests\RejectTimesheetRequest;
use App\Http\Requests\ReopenTimesheetRequest;
use App\Http\Requests\RequestRevisionTimesheetRequest;
use App\Http\Requests\SubmitTimesheetRequest;
use App\Models\TimeEntry;
use App\Models\Timesheet;
use App\Models\TimesheetComment;
use App\Models\User;
use App\Notifications\TimesheetApproved;
use App\Notifications\TimesheetRejected;
use App\Notifications\TimesheetReopened;
use App\Notifications\TimesheetRevisionRequested;
use App\Notifications\TimesheetSubmitted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

class TimesheetController extends Controller
{
    private const RELATIONS = ['timeEntries.project', 'timeEntries.client', 'comments.author'];

    public function index(Request $request): JsonResponse
    {
        $timesheets = Timesheet::where('user_id', $request->user()->id)
            ->with(self::RELATIONS)
            ->orderByDesc('date')
            ->get();

        return response()->json($timesheets);
    }

    public function teamIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $query = Timesheet::query();
        } elseif ($user->isSupervisor() && $user->department_id) {
            $query = Timesheet::whereHas(
                'user',
                fn ($q) => $q->where('department_id', $user->department_id)
            );
        } else {
            abort(403, 'You do not have a team to review.');
        }

        $timesheets = $query->with([...self::RELATIONS, 'user'])
            ->orderByDesc('date')
            ->get();

        return response()->json($timesheets);
    }

    public function show(Timesheet $timesheet): JsonResponse
    {
        $this->authorize('view', $timesheet);

        return response()->json($timesheet->load([...self::RELATIONS, 'user']));
    }

    public function store(SubmitTimesheetRequest $request): JsonResponse
    {
        $user = $request->user();
        $date = $request->validated('date');

        $hasEntries = TimeEntry::where('user_id', $user->id)->whereDate('date', $date)->exists();
        if (! $hasEntries) {
            abort(422, 'Cannot submit a timesheet for a date with no time entries.');
        }

        $timesheet = Timesheet::firstOrNew(['user_id' => $user->id, 'date' => $date]);

        if ($timesheet->exists && $timesheet->status !== TimesheetStatus::RevisionRequested) {
            abort(422, 'This timesheet has already been submitted.');
        }

        $timesheet->status = TimesheetStatus::Submitted;
        $timesheet->submitted_at = now();
        $timesheet->save();

        TimeEntry::where('user_id', $user->id)
            ->whereDate('date', $date)
            ->update(['timesheet_id' => $timesheet->id]);

        if ($user->department_id) {
            $supervisors = User::where('department_id', $user->department_id)
                ->where('role', UserRole::Supervisor)
                ->get();

            if ($supervisors->isNotEmpty()) {
                Notification::send($supervisors, new TimesheetSubmitted($timesheet));
            }
        }

        return response()->json($timesheet->load(self::RELATIONS), 201);
    }

    public function approve(ApproveTimesheetRequest $request, Timesheet $timesheet): JsonResponse
    {
        $comment = $request->validated('comment');

        $timesheet->update([
            'status' => TimesheetStatus::Approved,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        TimesheetComment::create([
            'timesheet_id' => $timesheet->id,
            'author_id' => $request->user()->id,
            'action' => TimesheetCommentAction::Approved,
            'comment' => $comment,
        ]);

        $timesheet->user->notify(new TimesheetApproved($timesheet, $comment));

        return response()->json($timesheet->fresh(self::RELATIONS));
    }

    public function reject(RejectTimesheetRequest $request, Timesheet $timesheet): JsonResponse
    {
        $comment = $request->validated('comment');

        $timesheet->update([
            'status' => TimesheetStatus::Rejected,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        TimesheetComment::create([
            'timesheet_id' => $timesheet->id,
            'author_id' => $request->user()->id,
            'action' => TimesheetCommentAction::Rejected,
            'comment' => $comment,
        ]);

        $timesheet->user->notify(new TimesheetRejected($timesheet, $comment));

        return response()->json($timesheet->fresh(self::RELATIONS));
    }

    public function requestRevision(RequestRevisionTimesheetRequest $request, Timesheet $timesheet): JsonResponse
    {
        $comment = $request->validated('comment');

        $timesheet->update([
            'status' => TimesheetStatus::RevisionRequested,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        TimesheetComment::create([
            'timesheet_id' => $timesheet->id,
            'author_id' => $request->user()->id,
            'action' => TimesheetCommentAction::RevisionRequested,
            'comment' => $comment,
        ]);

        $timesheet->user->notify(new TimesheetRevisionRequested($timesheet, $comment));

        return response()->json($timesheet->fresh(self::RELATIONS));
    }

    public function reopen(ReopenTimesheetRequest $request, Timesheet $timesheet): JsonResponse
    {
        $comment = $request->validated('comment');

        $timesheet->update(['status' => TimesheetStatus::RevisionRequested]);

        TimesheetComment::create([
            'timesheet_id' => $timesheet->id,
            'author_id' => $request->user()->id,
            'action' => TimesheetCommentAction::Reopened,
            'comment' => $comment,
        ]);

        $recipients = collect([$timesheet->user]);
        if ($timesheet->reviewed_by && $timesheet->reviewed_by !== $request->user()->id) {
            $recipients->push($timesheet->reviewer);
        }

        Notification::send($recipients->unique('id'), new TimesheetReopened($timesheet, $comment));

        return response()->json($timesheet->fresh(self::RELATIONS));
    }
}
