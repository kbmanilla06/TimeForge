# Sprint 11 - AI Integration Foundation

## Sprint Goal

Introduce the PRD §7.8 AI layer as real architecture with zero external dependencies: a provider-agnostic `AiProvider` interface bound to a deterministic, local, template-based stub provider (per the locked stub-first decision), a permanent `ai_outputs` store carrying a full source-data reference and AI-generated labeling, and the first three on-demand capabilities — daily work summaries, weekly productivity reports, and recurring-blocker identification — role-scoped exactly like every prior module. No data leaves the system; no AI credentials exist anywhere in this sprint.

## Status

Implemented and validated. All automated validation passed (backend: 153 tests / 452 assertions; frontend: 146 tests, build, lint). Manual end-to-end verification remains blocked by the standing MySQL/Docker gap (unchanged since Sprint 0) and is recorded as skipped in the sprint review. Sprint review: PASS.

## Why This Sprint Exists

With Sprints 4-10 complete, every data source the PRD's AI section needs now exists: time entries with descriptions/tasks/categories (Sprint 4), timesheet statuses and approval history (Sprint 5), KPI assignments and progress (Sprint 6), daily scrum entries including a dedicated `blockers` field (Sprint 7), payroll figures (Sprint 8), reusable hours calculators (Sprints 8-9), and period helpers (Sprints 8-10). AI Integration (PRD §7.8, Expected Deliverable "AI Integration") is the largest unbuilt module remaining, and the locked MVP decisions already define how to start it safely: build behind an interface/service layer, implement as a stub/mock first unless credentials are provided, save outputs permanently with a source data reference, label output as AI-generated, and send nothing sensitive to external services until a provider and privacy rules are approved. The still-open "AI provider selection and external data privacy rules" item in `docs/DECISIONS.md` gates the future swap to a real provider — not this foundation, which is deliberately designed so that swap changes configuration, not architecture.

## Source Requirements This Sprint Implements

From `docs/PRD.md` §7.8: planned AI capabilities include automatic daily work summaries, weekly productivity reports, KPI performance analysis, payroll validation, supervisor recommendations, identification of recurring blockers, and productivity trend analysis; "AI implementation must not invent business data. AI output should be derived from stored system records."

From `docs/DECISIONS.md` (locked "AI Integration" decisions): interface/service layer; stub/mock first; outputs saved permanently with a source data reference; permitted users can regenerate; output labeled AI-generated without requiring supervisor approval; no sensitive data to external services until provider + privacy rules are approved.

From `docs/QUESTIONS.md` Section H (resolved): recurring blocker detection is "manually first. AI detection can be added later" — this sprint is that "later," implemented mechanically by the stub.

From `docs/PRD.md` §11 (explicitly unresolved, must not be invented): AI provider; AI prompt storage and audit rules — resolved by Clarification Questions 1 and 5.

## Resolved Clarification Questions

These were posed as OPEN proposals when this plan was first drafted, per `docs/QUESTIONS.md` Section R. All five have since been explicitly approved and recorded in `docs/DECISIONS.md` under "Sprint 11 Implementation Decisions (Approved)".

**CQ1. Is Sprint 11 stub-only, or are AI provider credentials being supplied now?**
The locked decision says "implement AI as a stub/mock service first for MVP **unless API credentials are provided**."
*Answer (approved):* Stub-only. No external AI providers, API credentials, HTTP clients, or network calls anywhere in the AI layer — nothing sensitive can possibly leave the system. "AI provider selection and external data privacy rules" stays in Decisions Still Required and gates a later real-provider sprint (a config/binding swap on this foundation), not this one.

**CQ2. Which of the seven PRD §7.8 capabilities are in scope for the foundation sprint?**
*Answer (approved):* Three, chosen to exercise every architectural element end-to-end across all three subject shapes: **daily work summary** (one employee, one date), **weekly productivity report** (one employee, one week), and **recurring blocker identification** (one department, one period — the capability Section H explicitly deferred to AI). **KPI performance analysis, payroll validation, supervisor recommendations, and productivity trend analysis are deferred to a later sprint** — on this foundation each is one more data-gatherer plus one more template, not new architecture.

**CQ3. What does "automatic" mean in "automatic daily work summaries," given no queue worker or scheduler has ever been started (Horizon is installed but unstarted through Sprint 10)?**
*Answer (approved):* On-demand, synchronous generation via Generate/Regenerate buttons only — no scheduled jobs, no queues, no Horizon workers, no automatic background generation. "Automatically written from stored records," not "automatically scheduled." This matches the live-computation pattern locked in by Sprints 8-10 (payroll, reports, dashboard). Scheduled/queued generation is deferred to pair naturally with the future real-provider sprint, where slow external calls make queues genuinely necessary.

**CQ4. Who are the "users with permission" who can generate, regenerate, and view AI outputs (locked decision I.4 left this undefined)?**
*Answer (approved):* Mirror the Sprint 5-7 visibility rule exactly. Employee: generate/view their **own** daily and weekly summaries only. Supervisor: those, plus any employee in their own department, plus their own department's blocker report. Admin: everything, organization-wide. **HR/Finance: no AI access in Sprint 11** — their locked visibility (Section B.4) is approved timesheets, attendance summaries, and payroll aggregates, while these summaries quote raw work-log and scrum detail; their natural AI entry point is payroll validation, deferred to a later sprint by CQ2. Generating, regenerating, and viewing share one scope rule.

**CQ5. What are the AI prompt storage and audit rules (PRD §11 lists them as explicitly unresolved)?**
*Answer (approved):* Every generation permanently stores: capability type, subject (user or department), period, the **full gathered source-data snapshot as JSON**, the provider identifier, a `prompt_version` template identifier, the requesting user, and timestamps. Regeneration **appends a new row — nothing is ever overwritten or deleted**, and no update/delete endpoint exists. This satisfies locked decision I.3 ("saved permanently with a source data reference") and creates a complete audit trail; when a real provider arrives, the exact outbound prompt text joins the same record.

## Current Architecture This Sprint Builds On

- `HoursSummaryCalculator::summarizeForUsers()` (Sprints 8-9) accepts an arbitrary date range — reused directly for the weekly productivity report's totals.
- `PayrollPeriod::resolve()` (Sprint 8) — reused for the blocker report's period, matching the dashboard's period behavior.
- `daily_scrums.blockers` (Sprint 7) — the raw material for recurring-blocker identification; `time_entries` (task, task_status, work_category, description, duration_minutes, project/client links, `kpi_progress_value`) and `timesheets.status` (Sprints 4-6) feed the daily/weekly summaries.
- `DashboardController`/`TeamHoursReportController`'s role-scoping shape (Admin org-wide / Supervisor own-department / else 403) is the authorization template, adjusted per CQ4 (Employee self-access; HR/Finance excluded).
- `TeamMemberController` (Supervisor's department members) and `Admin\UserController::index` already provide the subject-picker data — no new listing endpoints.
- Frontend conventions: `lib/*Api.ts` clients over `apiClient`, role route guards (`DashboardRoute` et al.), Vitest + RTL. One new dependency was added in Sprint 10 (recharts); Sprint 11 adds none.

## Confirmed Implementation Decisions

Approved as part of the Sprint 11 plan approval. The five Clarification Question resolutions above are the decisions recorded in `docs/DECISIONS.md` under "Sprint 11 Implementation Decisions (Approved)"; the details below implement them and must be preserved unless explicitly changed:

1. **Service layer shape:** `app/Ai/AiProvider.php` interface (`generate(string $type, array $sourceData): string`), `app/Ai/StubAiProvider.php`, and an `AiSummaryService` orchestrating gather → generate → persist, with one small source-data gatherer class per capability. Provider selected via `config/ai.php` (`AI_PROVIDER=stub`) and bound in the service container — the future real provider is a new binding, nothing more.
2. **Stub determinism:** templates render strictly from gathered records (names, hours, counts, dates, verbatim blocker text) — satisfying "AI must not invent business data" mechanically, and making outputs assertable as exact strings in tests.
3. **`ai_outputs` table (this sprint's only migration):** `type`, nullable `user_id`, nullable `department_id` (exactly one set, enforced in validation: daily/weekly → user, blockers → department), `period_start`, `period_end`, `source_data` JSON, `content` text, `provider`, `prompt_version`, `generated_by` FK, timestamps; indexed on `(type, user_id, period_start)` and `(type, department_id, period_start)`.
4. **Week definition:** the weekly report covers the ISO Monday-Sunday week containing the requested date. Payroll periods remain semi-monthly and untouched.
5. **"Recurring blocker" (stub definition):** normalized blocker text (trimmed, whitespace-collapsed, case-insensitive) appearing in scrum entries on **two or more distinct dates** within the period — reported with occurrence count, dates, and employee names, plus a scanned-entry count for honesty. Purely mechanical matching; no semantic inference is claimed.
6. **Labeling:** `provider` is stored on every row and the UI always renders an "AI-generated" badge with provider name and generation timestamp (locked decision I.5).
7. **API shape:** one resource — `GET /api/ai-outputs` (stored outputs for type + subject + period, newest first) and `POST /api/ai-outputs` (generate, persist, return 201). Regenerate = POST again. No update or delete routes exist at all.
8. **No AI notifications** (the locked notification trigger list contains no AI events) and **no Admin "AI configurations" UI yet** — configuration is env-based, and there is nothing real to configure until a provider exists; PRD §6.4's AI-configuration management belongs to the real-provider sprint.

## User Stories

1. As an Employee, I can generate and view an AI daily work summary and weekly productivity report of my own work, clearly labeled as AI-generated.
2. As a Supervisor, I can do the same for any employee in my department, and generate my department's recurring-blockers report for a period.
3. As an Admin, I can do all of the above for anyone, organization-wide.
4. As any permitted user, I can regenerate an output and still see previous generations (permanent history).
5. As HR/Finance or as an Employee viewing someone else, I am blocked server-side (403), not just visually.

## Explicitly Out Of Scope This Sprint

- Any external AI provider, API credentials, or outbound network call from the AI layer (CQ1).
- KPI performance analysis, payroll validation, supervisor recommendations, productivity trend analysis (deferred to a later sprint per CQ2).
- Queues, Horizon startup, scheduling, or any background/automatic generation (CQ3).
- HR/Finance AI access (CQ4) and any Admin AI-settings UI (Proposed Decision 8).
- Editing or deleting stored AI outputs (CQ5 — append-only by design).
- AI notifications, email, or reminders.
- The attachments module and everything else already deferred by earlier sprints.

## Backend Backlog

- Migration + `AiOutput` model (guarded fillable; `source_data` cast to array; `generated_by`, `provider`, `prompt_version` set server-side only) + factory.
- `config/ai.php`; container binding of `AiProvider` → `StubAiProvider` in `AppServiceProvider`.
- `app/Ai/`: `AiProvider` interface, `StubAiProvider` (three deterministic templates), `AiSummaryService`, and three gatherers:
  - **Daily work summary** (user + date): the user's time entries for the date (task, project/client names, work category, task status, duration, description), total minutes, that date's timesheet status, the daily scrum entry (previous/planned work, blockers, notes) if any, and KPI progress values reported that day.
  - **Weekly productivity report** (user + ISO week): `HoursSummaryCalculator` totals for the week (approved/pending/rejected/overtime minutes, attendance days), a per-day minutes breakdown, timesheet status counts, and the week's KPI progress sum.
  - **Recurring blockers** (department + semi-monthly period): all department scrum entries in the period with non-empty `blockers`, normalized and grouped per Proposed Decision 5.
- `AiOutputController` (`index`, `store`) + `GenerateAiOutputRequest` (type in the three allowed values; exactly one subject field, matching the type; valid non-future date) — role scoping per CQ4, mirroring the existing 403-on-else controller pattern.
- Routes inside the existing auth middleware group: `GET /api/ai-outputs`, `POST /api/ai-outputs`.
- Feature tests (`AiOutputTest`): full authorization matrix per capability (employee self 200 / other-user 403; supervisor in-department 200 / cross-department 403 / blockers own-department 200; admin 200 everywhere; hr_finance 403 everywhere; employee requesting a blockers report 403); persistence assertions (row exists with source_data snapshot, provider `stub`, prompt_version, generated_by); regeneration appends a second row and index returns newest first; deterministic content verified against concrete hand-computed strings and numbers (e.g. exact hour totals, exact blocker occurrence counts and dates); validation failures (unknown type, wrong/missing/double subject, future date).

## Frontend Backlog

- `types/ai.ts` (output types, response shapes) and `lib/aiApi.ts` (`listAiOutputs`, `generateAiOutput`).
- `components/AiInsightsRoute.tsx`: allows `employee`, `supervisor`, `admin`; excludes `hr_finance` — mirroring the existing guard pattern.
- `pages/AiInsightsPage.tsx`: capability tabs (Daily Summary, Weekly Report; Blockers tab for supervisor/admin only); subject picker (fixed to self for employees; department members via the existing team-members API for supervisors; all users via the existing admin users API for admins; department fixed to own for a supervisor's blocker report); date picker (day / week / period respectively); Generate and Regenerate buttons; newest output rendered as plain text with the "AI-generated" badge, provider name, and generated-at timestamp; a history list of prior generations.
- `AppLayout`: "AI Insights" nav link for employee, supervisor, and admin (not hr_finance); route added in `App.tsx` under `AiInsightsRoute`.
- Vitest + RTL tests: `aiApi.ts`, `AiInsightsRoute.tsx`, `AiInsightsPage.tsx` (badge always rendered with output, regenerate appends to history, role-driven tabs/subject behavior, API error handling), plus the `AppLayout` nav-visibility case.

## Acceptance Criteria

Sprint 11 is complete when:

- All three capabilities generate on demand, synchronously, from stored records only, via the stub provider — with zero external calls or credentials anywhere.
- Every generation is permanently stored with its full source-data snapshot, provider, prompt version, generator, and period; regeneration appends and never overwrites; no update/delete route exists.
- Every rendered output is labeled AI-generated.
- The CQ4 permission matrix is enforced server-side and verified by tests (403s, not UI hiding).
- Stub content is deterministic and tested against concrete hand-computed values.
- Exactly one new table (`ai_outputs`) was added; no other schema changed.
- `docs/DECISIONS.md` records the Sprint 11 decisions; "AI provider selection and external data privacy rules" remains listed in Decisions Still Required (it now gates only the real-provider swap).

## Deliverables

- Backend: 1 migration, 1 model + factory, `app/Ai/` service layer (interface, stub provider, service, 3 gatherers), 1 config file, 1 controller, 1 form request, 2 routes, feature tests.
- Frontend: 1 route guard, 1 page, API client + types, nav/routing updates, Vitest tests. No new npm dependencies.
- This file (`sprints/SPRINT_11.md`); `docs/DECISIONS.md` already updated at plan approval; `docs/SETUP.md` manual-test section updated during implementation.

## Implementation Order

1. Backend: migration + model/factory → config + interface + stub provider binding → gatherers and templates one capability at a time, each with its feature tests as it lands → controller/request/routes → full `php artisan test`.
2. Frontend: types → `aiApi.ts` → `AiInsightsRoute` → `AiInsightsPage` (daily tab first, then weekly, then blockers) → nav/routing → `npm run build`, `npm run lint`, `npm run test`.
3. Manually verify per the Manual Testing Plan.
4. Update `docs/SETUP.md`.
5. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-10: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- Manual testing reuses the Employee/Supervisor/Admin/HR-Finance set and logged time/scrum data from the Sprint 7-10 manual tests.

## Risks

- Stub wording is a placeholder for real AI quality — swapping in a real provider later changes text quality, not the storage schema, API, permissions, or UI.
- PRD §7.8 is only partially delivered after this sprint; the four deferred capabilities are explicitly tracked for a later sprint so the gap cannot be silently forgotten.
- Exact-match blocker grouping misses paraphrased blockers ("API is down" vs "backend unreachable") — a documented stub limitation that a real provider later improves; the report's honest framing (occurrence counts of matching text) avoids overclaiming.
- On-demand-only generation means no summary exists until someone clicks Generate; if the sponsor's intent for "automatic" was scheduled generation, that lands with the queue/real-provider sprint (same risk shape as Sprint 10's refresh-behavior question).
- `source_data` JSON snapshots grow the table over time; acceptable at MVP scale, and append-only storage was explicitly chosen for auditability (CQ5).

## Validation Checklist

- Confirm the AI layer makes no network calls: no HTTP client usage anywhere under `app/Ai/` (grep-verifiable), and the suite runs with no AI credentials defined.
- Confirm the CQ4 authorization matrix via API feature tests — including HR/Finance 403 and employee-on-someone-else 403 — not just UI hiding.
- Confirm regeneration appends (row count increases; prior rows intact) and no update/delete route exists.
- Confirm mass-assignment safety: `generated_by`, `provider`, `prompt_version`, and `content` cannot be supplied by the client.
- Confirm output is rendered as plain text (React escaping; no `dangerouslySetInnerHTML`) — scrum blocker text is user input quoted back into the page.
- Confirm every template's content is asserted against concrete hand-computed values in at least one test per capability.
- Confirm exactly one migration was added and no existing table changed.
- Confirm `docs/DECISIONS.md` gained the Sprint 11 section and Decisions Still Required still lists provider/privacy; `docs/QUESTIONS.md` Section I remains as-is (already RESOLVED); no unrelated docs edits.
- Confirm no secrets committed.

## Manual Testing Plan

1. As the Employee (reusing Sprint 7-10 seed data), open "AI Insights"; generate a daily summary for a day with known entries; verify every number, project name, task, and scrum detail in the text against the raw records; confirm the AI-generated badge and provider `stub` are shown; regenerate and confirm a new version appears with the old one still in history.
2. Still as the Employee: confirm the subject picker offers only yourself, the Blockers tab is absent, and a direct `POST /api/ai-outputs` for another user's summary returns 403.
3. As the Supervisor: generate a weekly report for a department employee and verify totals against the Time Tracking/Payroll numbers for that week; attempt a cross-department employee via API and confirm 403.
4. As the Supervisor: generate the department blocker report for a period where the seeded scrum data repeats one blocker on two or more distinct days; verify the blocker text, occurrence count, dates, and employee names; confirm a one-off blocker is not listed as recurring.
5. As the Admin: generate all three types for subjects across departments successfully.
6. As HR/Finance: confirm no "AI Insights" nav link exists and both `GET` and `POST /api/ai-outputs` return 403.
7. Disconnect networking (or simply note the absence of any AI credentials in `.env`); confirm all generation still works — proving the stub is fully local.

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
- No modules outside the AI Integration Foundation were touched (besides the approved nav/routing additions).
- Clarification Questions 1-5 are already answered and recorded in `docs/DECISIONS.md` under "Sprint 11 Implementation Decisions (Approved)" — done at plan approval, before implementation begins.

## Code Generation Prompt

Use this only after Sprint 11 is approved:

```text
Implement Sprint 11 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_10.md
- sprints/SPRINT_11.md

Objective:
Build the AI Integration Foundation: an AiProvider interface bound to a
deterministic local stub provider, a permanent append-only ai_outputs
store with full source-data snapshots and AI-generated labeling, and
three on-demand capabilities — daily work summary (employee + date),
weekly productivity report (employee + ISO week), recurring blocker
identification (department + semi-monthly period) — role-scoped per the
approved CQ4 matrix.

Constraints:
- No external AI provider, credentials, or outbound network calls.
- No queues, scheduling, or background generation — synchronous only.
- No HR/Finance access; Employees reach only their own summaries.
- Regeneration appends; no update or delete endpoint for ai_outputs.
- Exactly one new migration (ai_outputs); no other schema changes.
- Stub output derives strictly from stored records — invent nothing.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migration, AiOutput model/factory, app/Ai service layer, config/ai.php,
  AiOutputController + request + routes, feature tests with
  concrete-number/string verification per capability (backend)
- AiInsightsRoute, AiInsightsPage, aiApi client + types, nav/routing
  updates, Vitest tests (frontend)
- PASS or FAIL Sprint 11 review
```

## Validation Prompt

```text
Validate Sprint 11.

Inspect:
- Correctness against CLAUDE.md, docs/DECISIONS.md, and the approved
  CQ1-CQ5 answers in sprints/SPRINT_11.md
- Whether the AI layer is provably local: no HTTP client under app/Ai,
  no AI credentials required anywhere
- Whether the CQ4 authorization matrix is enforced server-side and
  test-verified (including HR/Finance 403)
- Whether ai_outputs rows are append-only with full source-data
  snapshots, provider, prompt_version, and generator recorded
- Whether stub content is asserted against concrete hand-computed
  values, not just a 200 status
- Whether output is rendered as escaped plain text (XSS) and
  server-set fields are mass-assignment-safe
- Whether exactly one migration was added
- Build/test readiness (backend and frontend, including Vitest)

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 11 implementation.
