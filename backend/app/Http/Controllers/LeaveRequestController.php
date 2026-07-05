<?php

namespace App\Http\Controllers;

use App\Enums\LeaveStatus;
use App\Enums\UserRole;
use App\Http\Requests\ApproveLeaveRequestRequest;
use App\Http\Requests\RejectLeaveRequestRequest;
use App\Http\Requests\StoreLeaveRequestRequest;
use App\Models\AuditLog;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Notifications\LeaveRequestApproved;
use App\Notifications\LeaveRequestRejected;
use App\Notifications\LeaveRequestSubmitted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

/**
 * Mirrors TimesheetController's structure (Sprint 49): index scopes to
 * the owner, teamIndex scopes to Admin (any) or Supervisor (own
 * department), review actions are gated by LeaveRequestPolicy. Purely
 * informational for payroll/hours purposes this sprint — no accrual
 * balances, no paid/unpaid deduction automation.
 */
class LeaveRequestController extends Controller
{
    private const RELATIONS = ['reviewer'];

    public function index(Request $request): JsonResponse
    {
        $leaveRequests = LeaveRequest::where('user_id', $request->user()->id)
            ->with(self::RELATIONS)
            ->orderByDesc('start_date')
            ->get();

        return response()->json($leaveRequests);
    }

    public function teamIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $query = LeaveRequest::query();
        } elseif ($user->isSupervisor() && $user->department_id) {
            $query = LeaveRequest::whereHas(
                'user',
                fn ($q) => $q->where('department_id', $user->department_id)
            );
        } else {
            abort(403, 'You do not have a team to review.');
        }

        $leaveRequests = $query->with([...self::RELATIONS, 'user'])
            ->orderByDesc('start_date')
            ->get();

        return response()->json($leaveRequests);
    }

    public function store(StoreLeaveRequestRequest $request): JsonResponse
    {
        $leaveRequest = LeaveRequest::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
            'status' => LeaveStatus::Pending,
        ]);

        $user = $request->user();
        if ($user->department_id) {
            $supervisors = User::where('department_id', $user->department_id)
                ->where('role', UserRole::Supervisor)
                ->get();

            if ($supervisors->isNotEmpty()) {
                Notification::send($supervisors, new LeaveRequestSubmitted($leaveRequest));
            }
        }

        return response()->json($leaveRequest->load(self::RELATIONS), 201);
    }

    public function approve(ApproveLeaveRequestRequest $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->update([
            'status' => LeaveStatus::Approved,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        AuditLog::record('leave_request.approved', $leaveRequest);

        $leaveRequest->user->notify(new LeaveRequestApproved($leaveRequest));

        return response()->json($leaveRequest->fresh(self::RELATIONS));
    }

    public function reject(RejectLeaveRequestRequest $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->update([
            'status' => LeaveStatus::Rejected,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'rejection_reason' => $request->validated('rejection_reason'),
        ]);

        AuditLog::record('leave_request.rejected', $leaveRequest, ['rejection_reason' => $leaveRequest->rejection_reason]);

        $leaveRequest->user->notify(new LeaveRequestRejected($leaveRequest));

        return response()->json($leaveRequest->fresh(self::RELATIONS));
    }
}
