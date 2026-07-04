<?php

namespace App\Http\Controllers;

use App\Ai\AssistantService;
use App\Enums\AiOutputType;
use App\Enums\AssistantCategory;
use App\Models\AiOutput;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AiAssistantController extends Controller
{
    public function __construct(private readonly AssistantService $service) {}

    /**
     * Admin gets organization-wide scope; Supervisor gets their own
     * department only — same rule Dashboard/TeamHoursReport already
     * enforce. Employees and HR/Finance have no access to the assistant
     * per the approved Sprint 28 scope (narrower than the full AI matrix).
     */
    public function ask(Request $request): JsonResponse
    {
        $requester = $request->user();

        if (! $requester->isAdmin() && ! ($requester->isSupervisor() && $requester->department_id)) {
            abort(403, 'Only Admin and Supervisor may use the AI Assistant.');
        }

        $validated = $request->validate(['question' => ['required', 'string', 'max:500']]);
        $question = $validated['question'];
        $isOrgWide = $requester->isAdmin();

        $category = AssistantCategory::classify($question);
        $answer = $this->service->answer($category, $requester, $isOrgWide);

        $today = Carbon::today();

        $output = AiOutput::create([
            'type' => AiOutputType::AssistantQuery->value,
            'user_id' => null,
            'department_id' => null,
            'period_start' => $today->toDateString(),
            'period_end' => $today->toDateString(),
            'source_data' => [
                'question' => $question,
                'category' => $category->value,
                'scope' => $isOrgWide ? 'organization' : 'department',
                'department_id' => $isOrgWide ? null : $requester->department_id,
                'answer' => $answer,
            ],
            'content' => $answer['executive_summary'],
            'provider' => 'stub',
            'prompt_version' => AiOutputType::AssistantQuery->promptVersion(),
            'generated_by' => $requester->id,
        ]);

        return response()->json([
            'question' => $question,
            'category' => $category->value,
            'executive_summary' => $answer['executive_summary'],
            'detail' => $answer['detail'],
            'chart' => $answer['chart'],
            'table' => $answer['table'],
            'recommendations' => $answer['recommendations'],
            'supported_examples' => $answer['supported_examples'] ?? null,
            'generated_at' => $output->created_at->toISOString(),
        ], 201);
    }
}
