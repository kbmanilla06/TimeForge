<?php

namespace App\Http\Controllers;

use App\Ai\AiSummaryService;
use App\Enums\AiOutputType;
use App\Http\Requests\AiOutputRequest;
use App\Models\AiOutput;
use App\Models\Department;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class AiOutputController extends Controller
{
    public function __construct(private readonly AiSummaryService $service) {}

    /**
     * Stored outputs for one type + subject + resolved period, newest
     * first — the regeneration history. There is deliberately no update or
     * delete endpoint: ai_outputs is append-only per the Sprint 11
     * prompt-storage/audit decision.
     */
    public function index(AiOutputRequest $request): JsonResponse
    {
        [$type, $subjectUser, $subjectDepartment, $periodStart, $periodEnd] = $this->resolveAndAuthorize($request);

        $outputs = AiOutput::with('generator:id,name')
            ->where('type', $type->value)
            ->when($subjectUser, fn ($query) => $query->where('user_id', $subjectUser->id))
            ->when($subjectDepartment, fn ($query) => $query->where('department_id', $subjectDepartment->id))
            ->where('period_start', $periodStart->toDateString())
            ->where('period_end', $periodEnd->toDateString())
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'outputs' => $outputs->map(fn (AiOutput $output) => $this->present($output))->values(),
        ]);
    }

    /**
     * Generate (or regenerate) synchronously via the bound provider and
     * persist a new row. Regeneration appends; nothing is overwritten.
     */
    public function store(AiOutputRequest $request): JsonResponse
    {
        [$type, $subjectUser, $subjectDepartment, $periodStart, $periodEnd] = $this->resolveAndAuthorize($request);

        $output = $this->service->generate(
            $type,
            $subjectUser ?? $subjectDepartment,
            $periodStart,
            $periodEnd,
            $request->user(),
        );

        return response()->json($this->present($output->load('generator:id,name')), 201);
    }

    /**
     * @return array{0: AiOutputType, 1: ?User, 2: ?Department, 3: Carbon, 4: Carbon}
     */
    private function resolveAndAuthorize(AiOutputRequest $request): array
    {
        $type = AiOutputType::from($request->validated('type'));
        [$periodStart, $periodEnd] = $type->resolvePeriod(Carbon::parse($request->validated('date')));

        $subjectUser = $type->subjectIsUser() ? User::findOrFail($request->validated('user_id')) : null;
        $subjectDepartment = $type->subjectIsUser() ? null : Department::findOrFail($request->validated('department_id'));

        $this->authorizeAccess($request->user(), $subjectUser, $subjectDepartment);

        return [$type, $subjectUser, $subjectDepartment, $periodStart, $periodEnd];
    }

    /**
     * Sprint 11 permission matrix: Employees reach only their own
     * summaries; Supervisors their own department's members and their own
     * department's blocker report; Admins everything; HR/Finance nothing
     * (their AI entry point — payroll validation — is a later sprint).
     */
    private function authorizeAccess(User $requester, ?User $subjectUser, ?Department $subjectDepartment): void
    {
        if ($requester->isHrFinance()) {
            abort(403, 'HR/Finance does not have AI Insights access in this sprint.');
        }

        if ($requester->isAdmin()) {
            return;
        }

        if ($subjectUser !== null) {
            if ($requester->id === $subjectUser->id) {
                return;
            }

            if ($requester->isSupervisor()
                && $requester->department_id !== null
                && $requester->department_id === $subjectUser->department_id) {
                return;
            }

            abort(403, 'You may only view AI summaries for yourself or, as a Supervisor, your own department.');
        }

        if ($requester->isSupervisor() && $requester->department_id === $subjectDepartment->id) {
            return;
        }

        abort(403, 'Only this department\'s Supervisor or an Admin may view its blocker report.');
    }

    /**
     * Explicit response mapping — never serializes whole related models,
     * so nothing beyond the generator's name (no rates, emails, etc.) can
     * leak into the payload. source_data stays server-side as the audit
     * snapshot; the UI has no need for it.
     *
     * @return array<string, mixed>
     */
    private function present(AiOutput $output): array
    {
        return [
            'id' => $output->id,
            'type' => $output->type->value,
            'user_id' => $output->user_id,
            'department_id' => $output->department_id,
            'period_start' => $output->period_start->toDateString(),
            'period_end' => $output->period_end->toDateString(),
            'content' => $output->content,
            'provider' => $output->provider,
            'prompt_version' => $output->prompt_version,
            'generated_by' => $output->generated_by,
            'generated_by_name' => $output->generator->name,
            'generated_at' => $output->created_at->toISOString(),
        ];
    }
}
