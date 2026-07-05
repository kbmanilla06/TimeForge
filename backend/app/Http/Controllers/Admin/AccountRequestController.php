<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AccountRequestStatus;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveAccountRequestRequest;
use App\Http\Requests\Admin\RejectAccountRequestRequest;
use App\Models\AccountRequest;
use App\Models\AuditLog;
use App\Notifications\AccountApproved;
use App\Notifications\AccountRejected;
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

        // Sprint 36: a still-submitted request only surfaces once its
        // applicant has verified their email via OTP. Approved/rejected
        // history stays visible unconditionally either way — this never
        // hides past decisions, including ones made before this sprint.
        $query->where(function ($scoped) {
            $scoped->where('status', '!=', AccountRequestStatus::Submitted)
                ->orWhereHas('user', fn ($userQuery) => $userQuery->whereNotNull('email_verified_at'));
        });

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

        if ($accountRequest->user->email_verified_at === null) {
            abort(422, 'This applicant has not yet verified their email.');
        }

        DB::transaction(function () use ($request, $accountRequest) {
            $accountRequest->update([
                'status' => AccountRequestStatus::Approved,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            $accountRequest->user->update(['status' => UserStatus::Active]);
        });

        AuditLog::record('account_request.approved', $accountRequest, ['applicant_email' => $accountRequest->user->email]);

        // Sprint 45: the status change above already succeeded — a mail
        // failure here must not surface as a 500 that could make the admin
        // think the approval itself failed and retry (hitting the
        // already-decided guard above, confusingly).
        $this->notifySafely(fn () => $accountRequest->user->notify(new AccountApproved()));

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

        AuditLog::record('account_request.rejected', $accountRequest, [
            'applicant_email' => $accountRequest->user->email,
            'remarks' => $accountRequest->rejection_reason,
        ]);

        $this->notifySafely(fn () => $accountRequest->user->notify(new AccountRejected($accountRequest->rejection_reason)));

        return response()->json($accountRequest->fresh(self::RELATIONS));
    }

    /**
     * Sprint 45: same rationale as RegistrationController's helper of the
     * same name — a mail-provider failure must never surface as a raw 500
     * or change the response an endpoint already gives, since the
     * underlying state change has already succeeded regardless of whether
     * the notification could actually be delivered.
     */
    private function notifySafely(callable $send): void
    {
        try {
            $send();
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
