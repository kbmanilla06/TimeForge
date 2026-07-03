<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountRequestStatus;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveAccountRequestRequest;
use App\Http\Requests\Admin\RejectAccountRequestRequest;
use App\Models\AccountRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class AccountRequestController extends Controller
{
    private const RELATIONS = ['user.department', 'reviewer'];

    /**
     * List account requests — every status by default (so past decisions
     * remain visible as approval history), narrowed by an optional search
     * term (applicant name/email) and/or status filter.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::enum(AccountRequestStatus::class)],
        ]);

        $query = AccountRequest::query()->with(self::RELATIONS);

        if (! empty($validated['search'])) {
            $term = $validated['search'];
            $query->whereHas('user', function ($userQuery) use ($term) {
                $userQuery->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%");
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        return response()->json($query->latest()->get());
    }

    /**
     * Approve a submitted request: the applicant's account becomes Active
     * (able to log in) and the request itself is marked Approved with the
     * reviewing admin and timestamp recorded.
     */
    public function approve(ApproveAccountRequestRequest $request, AccountRequest $accountRequest): JsonResponse
    {
        if ($accountRequest->status !== AccountRequestStatus::Submitted) {
            abort(422, 'This account request has already been decided.');
        }

        DB::transaction(function () use ($request, $accountRequest) {
            $accountRequest->update([
                'status' => AccountRequestStatus::Approved,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            $accountRequest->user->update(['status' => UserStatus::Active]);
        });

        return response()->json($accountRequest->fresh(self::RELATIONS));
    }

    /**
     * Reject a submitted request: the applicant's account becomes
     * Deactivated (the same reusable status the existing Activate button
     * already knows how to reverse) and the request is marked Rejected
     * with an optional remark.
     */
    public function reject(RejectAccountRequestRequest $request, AccountRequest $accountRequest): JsonResponse
    {
        if ($accountRequest->status !== AccountRequestStatus::Submitted) {
            abort(422, 'This account request has already been decided.');
        }

        DB::transaction(function () use ($request, $accountRequest) {
            $accountRequest->update([
                'status' => AccountRequestStatus::Rejected,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $request->validated('remarks'),
            ]);

            $accountRequest->user->update(['status' => UserStatus::Deactivated]);
        });

        return response()->json($accountRequest->fresh(self::RELATIONS));
    }
}
