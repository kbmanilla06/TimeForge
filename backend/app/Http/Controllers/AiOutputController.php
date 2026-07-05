<?php

namespace App\Http\Controllers;

use App\Ai\AiSummaryService;
use App\Enums\AiOutputType;
use App\Enums\AiSubjectShape;
use App\Http\Requests\AiOutputRequest;
use App\Models\AiOutput;
use App\Models\Department;
use App\Models\User;
use App\Support\AiSourceSummary;
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
            // Organization-shaped outputs are the rows with no subject at
            // all — filtered explicitly, per the approved Sprint 12 decision.
            ->when(
                $subjectUser === null && $subjectDepartment === null,
                fn ($query) => $query->whereNull('user_id')->whereNull('department_id')
            )
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

        $shape = $type->subjectShape();
        $subjectUser = $shape === AiSubjectShape::User ? User::findOrFail($request->validated('user_id')) : null;
        $subjectDepartment = $shape === AiSubjectShape::Department
            ? Department::findOrFail($request->validated('department_id'))
            : null;

        $this->authorizeAccess($request->user(), $type, $subjectUser, $subjectDepartment);

        return [$type, $subjectUser, $subjectDepartment, $periodStart, $periodEnd];
    }

    /**
     * Sprint 11/12 permission matrix: payroll validation is Admin and
     * HR/Finance only (mirroring Sprint 8 payroll visibility), and it is
     * HR/Finance's only AI capability. Otherwise: Employees reach only
     * their own user-shaped outputs; Supervisors their own department's
     * members and their own department's reports; Admins everything.
     */
    private function authorizeAccess(User $requester, AiOutputType $type, ?User $subjectUser, ?Department $subjectDepartment): void
    {
        if ($type === AiOutputType::AssistantQuery) {
            abort(404, 'Assistant queries are served by the dedicated AI Assistant endpoint, not this one.');
        }

        if ($type === AiOutputType::PayrollValidation) {
            if ($requester->isAdmin() || $requester->isHrFinance()) {
                return;
            }

            abort(403, 'Only Admin and HR/Finance may run payroll validation.');
        }

        if ($requester->isHrFinance()) {
            abort(403, 'HR/Finance AI access is limited to payroll validation.');
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

        abort(403, 'Only this department\'s Supervisor or an Admin may view its AI reports.');
    }

    /**
     * Explicit response mapping — never serializes whole related models,
     * so nothing beyond the generator's name (no rates, emails, etc.) can
     * leak into the payload. The full source_data audit snapshot stays
     * server-side; source_summary (Sprint 51) is a derived, safe view of
     * it — counts and categorical facts only, never free text or raw
     * values — computed by AiSourceSummary. Authorization has already
     * run by the time this is called (authorizeAccess()), so this never
     * introduces a new exposure surface for an unauthorized viewer.
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
            'source_summary' => AiSourceSummary::summarize($output->type, $output->source_data),
        ];
    }
}
