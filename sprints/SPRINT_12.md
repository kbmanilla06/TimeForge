# Sprint 12 - AI Analysis Suite

## Sprint Goal

Complete PRD §7.8 by adding the four AI capabilities Sprint 11 explicitly deferred — **KPI performance analysis, payroll validation, supervisor recommendations, and productivity trend analysis** — as four more deterministic gatherers and templates on the existing AI foundation. No new architecture: the same `AiProvider` stub, the same append-only `ai_outputs` store with full source-data snapshots, the same on-demand synchronous Generate/Regenerate flow, and the same 403-on-else role scoping, extended per capability. After this sprint, every AI capability named in the PRD exists end-to-end; only the real-provider swap (explicitly deferred) remains.

## Status

Implemented and validated. All automated validation passed (backend: 163 tests / 505 assertions, Sprint 11's suite green through the subject-shape refactor; frontend: 151 tests, build, lint). Zero migrations, endpoints, or dependencies added. Manual end-to-end verification remains blocked by the standing MySQL/Docker gap (unchanged since Sprint 0) and is recorded as skipped in the sprint review. Sprint review: PASS.

## Why This Sprint Exists

Sprint 11's approved capability-scope decision deferred exactly these four capabilities "to a later sprint," noting that on the foundation "each is one more data-gatherer plus one more template, not new architecture." That is now literally true: `AiOutputType` drives period resolution, validation, authorization, persistence, and the frontend tabs, so each new capability is a new enum case plus its gatherer, template, matrix rules, and tests. Sprint 11 also recorded that HR/Finance's "natural AI entry point is payroll validation" — this sprint is where that entry point opens. All required source data already exists: KPI assignments and applied progress markers (Sprint 6), payroll figures and hour buckets (Sprints 8-9), timesheet states (Sprint 5), scrum blockers (Sprint 7), and the semi-monthly period helper (Sprint 8).

## Source Requirements This Sprint Implements

From `docs/PRD.md` §7.8: "KPI performance analysis," "Payroll validation," "Supervisor recommendations," and "Productivity trend analysis"; "AI implementation must not invent business data. AI output should be derived from stored system records."

From `docs/DECISIONS.md`: the locked AI Integration decisions (I.1-I.6) and the Sprint 11 Implementation Decisions, all unchanged and binding here — including "KPI performance analysis, payroll validation, supervisor recommendations, and productivity trend analysis are deferred to a later sprint" (this is that sprint) and the HR/Finance payroll-validation entry point noted in CQ4's resolution.

From locked Sprint 8 decisions: payroll visibility is Admin and HR/Finance only — which bounds who may ever see payroll validation output.

## Resolved Clarification Questions

These were posed as OPEN proposals when this plan was first drafted, per `docs/QUESTIONS.md` Section R. All four have since been explicitly approved and recorded in `docs/DECISIONS.md` under "Sprint 12 Implementation Decisions (Approved)".

**CQ1. What is each capability's subject shape?**
The PRD names the capabilities but not their scope. *Answer (approved — the Sprint 11 subject helper is refactored only as needed to support user, department, and organization-wide shapes; no new schema):*
- **KPI performance analysis — one department** (like the blocker report): covers the department's own KPI assignments plus its members' individual assignments, using the same `scopedDepartmentId()` attribution the dashboard already uses. Employees' individual KPI numbers stay visible to them on My KPIs; a personal AI KPI narrative is not added in Sprint 12.
- **Payroll validation — organization-wide** (the first organization-scoped AI output): payroll is computed and reviewed org-wide by Admin/HR-Finance, so the validation sweeps the whole period. Stored with both `user_id` and `department_id` null — a subject shape `ai_outputs` was explicitly designed to allow; **no migration needed**.
- **Supervisor recommendations — one department** (a supervisor's own; Admin any).
- **Productivity trend analysis — one user** (mirroring daily/weekly: employee self, Supervisor own-department members, Admin anyone).

**CQ2. How does the permission matrix extend?**
*Answer (approved):* Everything from Sprint 11 stands. New types: **KPI performance analysis and supervisor recommendations** — Supervisor (own department) and Admin, exactly like the blocker report. **Productivity trend analysis** — Employee (self), Supervisor (own department's members), Admin (anyone), exactly like daily/weekly. **Payroll validation — Admin and HR/Finance only** (mirroring locked Sprint 8 payroll visibility; Supervisors and Employees get 403 server-side). Consequence: **HR/Finance gains AI Insights access for the first time, restricted to the payroll-validation tab only** — `AiInsightsRoute` and the nav link open to hr_finance, and the page shows that single tab for them; every other type keeps returning 403 to HR/Finance, test-verified.

**CQ3. What window does productivity trend analysis cover?**
Trend needs more than one period. *Answer (approved):* the **six consecutive semi-monthly payroll periods ending with the period containing the reference date** (≈3 months) — reusing `PayrollPeriod` stepping backwards, no new period concept. The stored `period_start`/`period_end` are the window's outer bounds. Six is an implementation parameter (changeable later), not a business rule.

**CQ4. Does payroll validation apply judgment thresholds (e.g., "excessive overtime")?**
*Answer (approved):* **No.** Any anomaly threshold, risk score, compliance label, or business judgment would be an invented business rule. The validation reports facts only: employees with approved hours but **no hourly rate** (estimated pay incomputable — the one condition that genuinely blocks payroll preparation), period totals (regular/overtime/estimated, reusing `PayrollFigures`), hours still pending review or rejected, days with logged time but no timesheet (never submitted), running timers left open in the period, and the largest single approved day. If the sponsor later defines real validation rules (limits, caps, policies), they slot into the same gatherer.

## Current Architecture This Sprint Builds On

- `AiOutputType` (Sprint 11) centralizes subject shape, period resolution, and prompt versions — extended with four cases. The binary `subjectIsUser()` becomes a three-value subject-shape helper (`user` / `department` / `organization`) because payroll validation has no subject row; this is the sprint's only structural refactor, contained to the enum, request, and controller.
- `ai_outputs` (Sprint 11) already supports all three subject shapes (both FK columns nullable) — **no migrations in this sprint**.
- `AiSummaryService` + `StubAiProvider` + gatherer pattern (Sprint 11) — four new gatherers, four new templates, dispatch extended.
- `HoursSummaryCalculator` (Sprints 8-9) — reused per-period for trend analysis and org-wide for payroll validation; `PayrollFigures` (Sprint 10) — reused for estimated-pay totals; `PayrollPeriod` (Sprint 8) — reused everywhere, including stepping backwards for the trend window.
- `KpiAssignment::scopedDepartmentId()` and `time_entries.kpi_progress_value`/`kpi_progress_applied_at` (Sprint 6) — reused for KPI analysis, including progress credited within the period.
- `RecurringBlockersGatherer` (Sprint 11) — reused inside supervisor recommendations for its blocker-derived suggestions.
- `AiOutputController::authorizeAccess` — gains the type parameter so HR/Finance's payroll-validation-only access is expressible; everything else keeps the existing 403-on-else pattern.
- Frontend `AiInsightsPage` tabs are driven by type + role — four new tabs, role-filtered; badge, history, and regeneration behavior unchanged.

## Confirmed Implementation Decisions

Approved as part of the Sprint 12 plan approval. The four Clarification Question resolutions above are the decisions recorded in `docs/DECISIONS.md` under "Sprint 12 Implementation Decisions (Approved)"; the details below implement them and must be preserved unless explicitly changed:

1. **Four new `AiOutputType` cases** — `kpi_performance_analysis`, `payroll_validation`, `supervisor_recommendations`, `productivity_trend_analysis` — each with a `.v1` prompt version. Periods: KPI analysis, recommendations, and payroll validation use the semi-monthly `PayrollPeriod`; trend analysis uses the CQ3 six-period window.
2. **KPI analysis source data:** every assignment in department scope — KPI name, unit, target, current all-time progress, completion rate where a target exists — plus progress credited *within* the period (sum of `kpi_progress_value` on entries dated in the period with `kpi_progress_applied_at` set). The template ranks by completion rate and separately lists assignments with no target and assignments with zero progress. Facts only; no "on track" judgments.
3. **Supervisor recommendations source data:** submitted timesheets awaiting review (count + oldest date), revision-requested timesheets (waiting on employees), recurring blockers (reusing the Sprint 11 gatherer's normalization), department members with zero logged minutes in the period, days with entries but no timesheet, and KPI assignments with no target or zero progress. Each fact renders as one numbered, deterministic recommendation citing its number; none found → an explicit "nothing needs attention" line.
4. **Payroll validation checks:** exactly the CQ4 fact list, computed org-wide for the period from `HoursSummaryCalculator` + `PayrollFigures` + entry/timesheet states.
5. **Organization-shape handling:** for `payroll_validation`, both subject fields are `prohibited` in validation, both columns stored null, and the index query filters `whereNull` on both explicitly (not merely skipping the subject clause).
6. **Trend source data:** per period in the window — approved/overtime/pending minutes and attendance days — plus consecutive-period deltas and the net first-to-last change, all as exact numbers ("net decrease of 3h 30m"), never as judgments ("worrying decline").
7. **Frontend:** `AiInsightsRoute` and the AppLayout nav link now admit `hr_finance`; tab visibility per role — Employee: Daily, Weekly, Trend; Supervisor: those plus Blockers, KPI Analysis, Recommendations; Admin: all seven; HR/Finance: Payroll Validation only. The payroll-validation tab has no subject picker (org-wide); other new tabs reuse the existing member/department pickers.
8. **No new npm or composer dependencies, no schema changes, no new endpoints** — the same `GET`/`POST /api/ai-outputs` pair serves all seven types.

## User Stories

1. As a Supervisor, I can generate an AI KPI performance analysis and an AI recommendations list for my own department, each derived only from stored records and labeled AI-generated.
2. As HR/Finance, I can generate an organization-wide AI payroll validation for a payroll period and see exactly what blocks or qualifies the period's payroll estimates — my first and only AI Insights capability.
3. As an Employee, I can generate my own productivity trend analysis across recent payroll periods.
4. As an Admin, I can do all of the above for any subject.
5. As anyone outside a capability's matrix row, I am blocked server-side (403), not just visually.

## Explicitly Out Of Scope This Sprint

- External AI providers, credentials, HTTP clients, or network calls (Sprint 11 posture, carried forward).
- Queues, Horizon workers, scheduled or background generation (carried forward).
- New migrations, new endpoints, or editing/deleting stored AI outputs (append-only, carried forward).
- Invented judgment thresholds, weighted scoring formulas, or performance ratings in any template (CQ4 and PRD §7.8's no-invention rule).
- A personal (employee-subject) KPI analysis narrative (CQ1) and department-level trend analysis — both possible later on the same foundation if wanted.
- Admin "AI configurations" UI (still nothing real to configure), AI notifications, AI output export.
- The attachments module and everything else previously deferred.

## Backend Backlog

- `AiOutputType`: four new cases; replace `subjectIsUser()` with a subject-shape helper covering `user`/`department`/`organization`; period resolution per Proposed Decision 1 (including the backwards-stepping six-period window); prompt versions.
- `app/Ai/SourceData/`: `KpiPerformanceAnalysisGatherer`, `PayrollValidationGatherer`, `SupervisorRecommendationsGatherer` (composing `RecurringBlockersGatherer`), `ProductivityTrendAnalysisGatherer`.
- `StubAiProvider`: four deterministic templates rendering the gathered facts (rankings, counts, deltas, name lists), each ending with the existing AI-generated footer.
- `AiSummaryService`: dispatch the four new types; subject parameter becomes `User|Department|null`.
- `AiOutputRequest`: per-type subject rules — `user_id` required for daily/weekly/trend; `department_id` required for blockers/KPI-analysis/recommendations; both prohibited for payroll validation.
- `AiOutputController`: `authorizeAccess(User $requester, AiOutputType $type, ...)` — HR/Finance allowed **only** `payroll_validation`; `payroll_validation` allowed **only** Admin/HR-Finance; department types mirror blockers; trend mirrors daily/weekly; index applies explicit double-`whereNull` for the organization shape.
- Feature tests (extending `AiOutputTest` or a sibling `AiAnalysisTest`): full authorization matrix for each new type (including HR/Finance 201 on payroll validation but 403 on all six other types, and Supervisor/Employee 403 on payroll validation); exact hand-computed content assertions per template (a KPI at 60% ranked above one at 20%; a missing-hourly-rate employee named; a recommendation citing the exact pending-timesheet count; a trend with verified per-period minutes and deltas); organization-shape persistence (both columns null) and history retrieval; validation failures for wrong/extra subjects per type.

## Frontend Backlog

- `types/ai.ts`: extend the `AiOutputType` union with the four new values.
- `AiInsightsRoute`: admit `hr_finance`.
- `AppLayout`: show "AI Insights" to all four roles; update the nav visibility test.
- `AiInsightsPage`: role-driven tab list per Proposed Decision 7; the payroll-validation tab renders no subject picker; trend reuses the existing member picker; everything else (date, Generate/Regenerate, badge, history) unchanged.
- Vitest: new-tab behavior per role (HR/Finance sees exactly one tab and its query carries no subject; supervisor sees six; employee sees three including Trend; admin seven), plus the route-guard and nav changes.

## Acceptance Criteria

Sprint 12 is complete when:

- All four new capabilities generate on demand via the stub, persist append-only with full source-data snapshots, and render labeled AI-generated with history — identically to Sprint 11's three.
- The CQ2 matrix is enforced server-side and test-verified, including both directions of the HR/Finance rule (201 on payroll validation, 403 everywhere else) and Supervisor/Employee 403 on payroll validation.
- Payroll validation rows store both subject columns null and are retrievable by type + period alone.
- Every template's numbers are asserted against concrete hand-computed values; no template contains a judgment word not derived from arithmetic on stored records.
- Zero migrations, zero new dependencies, zero new endpoints.
- `docs/DECISIONS.md` records the Sprint 12 decisions; `docs/SETUP.md` gains the manual test steps during implementation.

## Deliverables

- Backend: 4 enum cases + subject-shape refactor, 4 gatherers, 4 templates, request/controller matrix extensions, feature tests. No migrations.
- Frontend: type union, route-guard and nav updates, 4 role-scoped tabs, Vitest tests. No new dependencies.
- This file (`sprints/SPRINT_12.md`); `docs/DECISIONS.md` already updated at plan approval; `docs/SETUP.md` updated during implementation.

## Implementation Order

1. Backend: `AiOutputType` refactor + cases (run existing suite immediately — Sprint 11 tests must stay green through the refactor) → gatherer + template + matrix + tests, one capability at a time: payroll validation (new subject shape first, hardest), then KPI analysis, recommendations, trend → full `php artisan test`.
2. Frontend: types → route/nav → tab config → per-tab behavior → `npm run build`, `npm run lint`, `npm run test`.
3. Manual verification per the Manual Testing Plan (noting the standing MySQL/Docker blocker if unchanged).
4. Update `docs/SETUP.md`.
5. Produce PASS or FAIL Sprint 12 review.

## Dependencies

- Same as Sprints 1-11: MySQL reachable for manual end-to-end verification (still blocked until Docker Desktop is installed); automated tests use SQLite in-memory.
- Manual testing reuses the Sprint 8-11 seed data (rated + unrated employees, approved/pending/rejected days, KPI assignments with progress, recurring scrum blockers).

## Risks

- The subject-shape refactor touches Sprint 11's passing code paths; mitigated by running the existing suite before any new capability lands (Implementation Order step 1).
- HR/Finance's single-type access makes the matrix type-conditional for the first time — the highest-risk authorization change, hence both directions are explicit acceptance criteria.
- "Recommendations" is the easiest place to accidentally invent judgment; the fact-list construction (Proposed Decision 3) is deliberately mechanical, and the validation checklist includes a wording review.
- Six-period trend windows multiply period queries (~6× one summary call per generation) — trivial at MVP scale, on-demand only; noted, not mitigated.
- If the sponsor expected threshold-based payroll anomaly detection, CQ4's facts-only answer under-delivers — the gatherer is the extension point, and real rules need sponsor definitions first.

## Validation Checklist

- Confirm the AI layer still makes no network calls (no HTTP client under `app/Ai/`, grep-verifiable) and no credentials exist.
- Confirm the full matrix via API tests, including HR/Finance 201-on-payroll-validation / 403-on-everything-else and Supervisor/Employee 403 on payroll validation.
- Confirm payroll-validation rows persist with both subject columns null and the index filters with explicit double-`whereNull`.
- Confirm append-only behavior still holds for the new types and no update/delete route exists.
- Confirm every new template is asserted against concrete hand-computed values, and contains no judgment language beyond arithmetic facts.
- Confirm zero migrations and zero dependency changes in the diff.
- Confirm `docs/DECISIONS.md` gained the Sprint 12 section at approval; Decisions Still Required continues to list AI provider/privacy; `docs/QUESTIONS.md` untouched.
- Confirm no secrets committed.

## Manual Testing Plan

1. Log in as HR/Finance; confirm "AI Insights" now appears and shows **only** the Payroll Validation tab; generate for the seeded period; verify the totals against the Payroll page, that the unrated employee is named under missing hourly rates, and that pending/rejected hours match; confirm the AI-generated badge and regeneration history work; confirm `POST /api/ai-outputs` with any other type returns 403.
2. Log in as the Supervisor; generate a KPI Performance Analysis for the department; verify each assignment's progress/target/completion percentage against Team KPIs, and that period-credited progress matches the approved entries.
3. As the Supervisor, generate Recommendations; verify each numbered item's count against reality (pending timesheets, recurring blocker text, zero-hour members); confirm cross-department generation returns 403.
4. As the Supervisor, confirm Payroll Validation is absent from the UI and returns 403 via the API.
5. Log in as the Employee; generate a Productivity Trend for yourself; verify per-period minutes and deltas against the Payroll/Time Tracking numbers for those periods; confirm another user's trend returns 403 via the API.
6. Log in as the Admin; generate all four new types (any subject) successfully.
7. Confirm everything still works with no AI credentials in `.env` — the stub remains fully local.

## Automated Testing Plan

```bash
cd backend
php artisan test

cd ../frontend
npm run build
npm run lint
npm run test
```

## Definition Of Done

- All Acceptance Criteria met.
- All automated validation commands pass.
- Manual Testing Plan executed and results recorded in the sprint review (PASS/FAIL), noting explicitly if MySQL was unreachable and manual steps were skipped as a result.
- No modules outside the AI Analysis Suite were touched (beyond the approved route/nav/matrix extensions).
- Clarification Questions 1-4 are already answered and recorded in `docs/DECISIONS.md` under "Sprint 12 Implementation Decisions (Approved)" — done at plan approval, before implementation begins.

## Code Generation Prompt

Use this only after Sprint 12 is approved:

```text
Implement Sprint 12 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_11.md
- sprints/SPRINT_12.md

Objective:
Add the four deferred AI analysis capabilities on the Sprint 11
foundation: KPI performance analysis (department), payroll validation
(organization-wide, Admin/HR-Finance only), supervisor recommendations
(department), productivity trend analysis (user, six semi-monthly
periods) — as new AiOutputType cases, gatherers, and stub templates.

Constraints:
- Stub provider only; no external AI calls, credentials, or HTTP clients.
- No queues, scheduling, or background generation — synchronous only.
- No new migrations, endpoints, or dependencies; ai_outputs stays
  append-only with full source-data snapshots.
- Facts only in templates: no invented thresholds, judgments, or scores.
- HR/Finance may access payroll_validation only; Supervisors/Employees
  never see payroll_validation; the rest of the CQ2 matrix as approved.
- Sprint 11's tests must stay green through the subject-shape refactor.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- AiOutputType extension + subject-shape refactor, four gatherers, four
  templates, request/controller matrix updates, feature tests with
  concrete-number verification per capability (backend)
- Type union, route/nav updates, four role-scoped tabs, Vitest tests
  (frontend)
- PASS or FAIL Sprint 12 review
```

## Validation Prompt

```text
Validate Sprint 12.

Inspect:
- Correctness against CLAUDE.md, docs/DECISIONS.md, and the approved
  CQ1-CQ4 answers in sprints/SPRINT_12.md
- Whether the AI layer remains provably local (no HTTP client under
  app/Ai, no credentials anywhere)
- Whether the extended matrix is enforced server-side and test-verified
  in both directions for HR/Finance, and payroll_validation is denied
  to Supervisors and Employees
- Whether organization-shape rows persist with both subject columns
  null and are queried with explicit whereNull filters
- Whether every new template is asserted against concrete hand-computed
  values and contains no invented judgment language
- Whether zero migrations, endpoints, or dependencies were added and
  ai_outputs remains append-only
- Whether Sprint 11's existing tests still pass unmodified in behavior
- Build/test readiness (backend and frontend, including Vitest)

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 12 implementation.
