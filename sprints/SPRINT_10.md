# Sprint 10 - Dashboard And Analytics Foundation

## Sprint Goal

Give management (Supervisors, Admins, HR/Finance) a single on-screen dashboard aggregating everything the system already tracks — hours, productivity, KPI completion, attendance trends, billable/non-billable split, project allocation, pending approvals, and (Admin/HR-Finance only) a payroll summary — using a proposed lightweight chart library. No new schema: every metric is computed from data captured in Sprints 4-9.

## Status

Plan approved, both Clarification Questions resolved, and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Every other module (Time Tracking, Timesheets, KPIs, Daily Scrum, Payroll, Exports) now exists. PRD §7.7 is the next unbuilt module, and — unusually for this project — it's also the first sprint whose foundational questions were left explicitly unresolved in the MVP decision round rather than pre-answered. `docs/QUESTIONS.md` Section R is direct on how to handle that: "If a requirement remains undefined at the time its sprint is reached (including Section Q...), Claude Code must stop and ask before implementing it." This plan proposes candidate answers to make that resolution easy, but frames them as questions requiring your explicit decision, not defaults I'm empowered to assume on my own.

## Source Requirements This Sprint Implements

From `docs/PRD.md` §7.7, dashboard metrics must include: total hours rendered, employee productivity, department performance, pending approvals, KPI completion rates, attendance trends, billable hours, non-billable hours, project allocation, and payroll summary.

From `docs/QUESTIONS.md` (already resolved): "Claude Code may propose a chart library during the dashboard sprint."

From `docs/PRD.md` §6.1, Employees must be able to "monitor their own productivity metrics" — already satisfied by the existing Time Tracking summary (Sprint 4) and My KPIs page (Sprint 6). This sprint's new dashboard is the §7.7 *management* dashboard, a different, aggregate-level feature — see Clarification Question 1.

## Resolved Clarification Questions

`docs/QUESTIONS.md` Section Q was marked **OPEN** when this plan was first drafted, with an explicit note: "Must be resolved before the Dashboard/Analytics sprint begins." Both questions have since been answered and recorded in `docs/QUESTIONS.md` Section Q (now RESOLVED) and `docs/DECISIONS.md` under "Sprint 10 Implementation Decisions (Approved)".

**Q1. Should dashboard data be role-scoped (Supervisors see only their team, Admin/HR see the whole organization)?**
Answer: Yes. Admin and HR/Finance see organization-wide metrics; Supervisors see their own department's metrics only. Employees do not get a dashboard view in Sprint 10 at all — PRD §7.7 frames this as a *management* dashboard, and Employees' PRD-mandated "monitor their own productivity metrics" (§6.1) is already satisfied by the existing Time Tracking summary and My KPIs page. The payroll summary metric specifically is further restricted to Admin/HR-Finance only within the dashboard (mirroring Sprint 8's payroll visibility rule exactly) — Supervisors see every other metric for their department, but not payroll figures.

**Q2. Should dashboards refresh in real time, or on a scheduled/manual basis?**
Answer: Neither literal "real-time" (no WebSocket/push infrastructure exists or is requested anywhere) nor a background schedule (no queue/cron infrastructure is in scope here — Horizon remains unstarted, per every prior sprint's setup notes). Instead: the dashboard recomputes fresh on every page load, plus a manual "Refresh" button, matching the same "live computation, no caching" pattern already established for Payroll (Sprint 8) and Reports (Sprint 9). "Real-time insights" (PRD's wording) is interpreted as "always current when viewed," not "continuously pushed."

## Current Architecture This Sprint Builds On

This sprint requires **no new migrations** — every metric is computed from existing tables:

- `HoursSummaryCalculator` (Sprint 8/9) already computes per-employee approved/overtime/pending/rejected minutes and attendance days for a period — reused directly for "total hours rendered" and "employee productivity."
- `PayrollController`'s summary-building (Sprint 8) is reused, unmodified, for the Admin/HR-Finance-only "payroll summary" metric.
- `Kpi`/`KpiAssignment` (Sprint 6) already store `progress_value`/`target_value` — reused directly for "KPI completion rates" (simple `progress_value / target_value` per assignment where a target exists).
- `Timesheet.status` (Sprint 5) is reused for "pending approvals" (count of `submitted` timesheets specifically — `revision_requested` is excluded, since the ball is back in the employee's court, not pending a Supervisor decision).
- `TimeEntry.project_id`/`client_id` (Sprint 3/4) are reused for "project allocation" and the billable/non-billable split (see Confirmed Decision 1).
- `PayrollPeriod` (Sprint 8) is reused for the dashboard's period resolution — no new period concept is introduced (see Confirmed Decision 2).
- The Admin-sees-all / Supervisor-sees-own-department / else-403 branching (used five times now) is the template for `DashboardController`'s authorization, extended to also allow HR/Finance (matching Payroll/Team-Hours-Report precedent from Sprints 8-9).

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 10 Implementation Decisions (Approved)", alongside the two Resolved Clarification Questions above.

1. **Metric definitions for concepts not previously modeled:** "Employee productivity" = each employee's approved hours for the period (reusing `HoursSummaryCalculator`'s existing `approved_minutes`) — no new productivity-scoring formula is invented. "Department performance" = a department's total approved hours plus its KPI assignments' average completion rate. "Billable" vs. "non-billable" hours = a time entry counts as billable if it has a non-null `project_id` or `client_id`, non-billable otherwise — this is an inferred heuristic (no `billable` flag exists anywhere in the schema today), flagged here since it's the one metric with no prior precedent at all.
2. **Dashboard period reuses the existing semi-monthly `PayrollPeriod`:** No new period concept. "Attendance trends" is the one metric that needs a genuine day-by-day breakdown (distinct employees with a time entry, per day, across the resolved period) rather than a single aggregate — a new calculation, but still derived from existing `time_entries` data only.
3. **Chart library: `recharts`.** A lightweight, purely React-component-based charting library (no canvas/imperative wrapper, no heavy native dependencies) that fits a Vite + React + TypeScript stack cleanly, per the already-resolved "Claude Code may propose a chart library" decision.
4. **Payroll summary is Admin/HR-Finance only within the dashboard response:** For a Supervisor's dashboard, the `payroll_summary` key is omitted entirely from the API response (not present, not null/zeroed) — mirroring Sprint 8's payroll-visibility rule exactly, applied here at the metric level rather than the whole-page level.
5. **No export button on the dashboard:** Sprint 9 already covers PDF/Excel export for the Payroll Report and Team Hours Report specifically. The dashboard is on-screen only in Sprint 10; exporting dashboard views is not requested by the PRD's §7.7 section and would be scope creep.

## User Stories

1. As an Admin or HR/Finance user, I want to see organization-wide hours, productivity, KPI completion, attendance trends, billable/non-billable split, project allocation, pending approvals, and a payroll summary for the current period.
2. As a Supervisor, I want to see the same metrics scoped to my own department, without payroll figures.
3. As any of the above, I want to view a past period and manually refresh the current one.
4. As an Employee, I should not see this dashboard (my own productivity monitoring is already available elsewhere).

## Explicitly Out Of Scope This Sprint

- Real-time push updates (WebSockets, polling) — see Clarification Question 2.
- Employee access to this dashboard — see Clarification Question 1.
- Exporting the dashboard itself (PDF/Excel export already exists for Payroll/Team Hours specifically, per Sprint 9).
- Any new `billable` schema field — the billable/non-billable split is computed from existing `project_id`/`client_id`, not a stored flag (Confirmed Decision 1).
- AI-generated insights or summaries (PRD §7.8, a separate future sprint).
- New migrations of any kind.
- `docs/QUESTIONS.md` Section Q is resolved by this plan's approval, not reopened afterward; other sections remain untouched.

## Backend Backlog

- `DashboardController::index(Request $request)`: `date` query param (optional, defaults to today, resolved via existing `PayrollPeriod`); authorization — Admin/HR-Finance (organization-wide) or Supervisor with a department (own department only), else 403, mirroring `TeamHoursReportController`.
- Metric computation (all read-only, no new tables):
  - `total_hours_minutes`: sum of approved minutes across all in-scope employees for the period (via `HoursSummaryCalculator`).
  - `employee_productivity`: per-employee approved minutes for the period (array, in-scope employees only).
  - `department_performance`: per-department total approved minutes + average KPI completion rate (organization-wide dashboards only; a Supervisor's dashboard reduces this to their single department).
  - `pending_approvals`: count of `Timesheet` rows with status `submitted`, in scope.
  - `kpi_completion_rates`: per `KpiAssignment` in scope with a non-null `target_value`, `progress_value / target_value` (capped/labeled if over 100%).
  - `attendance_trends`: per-date count of distinct employees (in scope) with at least one time entry, for every date in the resolved period.
  - `billable_minutes` / `non_billable_minutes`: sum of approved minutes split by whether the entry has a `project_id` or `client_id` (Confirmed Decision 1).
  - `project_allocation`: approved minutes grouped by `project_id` (in scope), with project name.
  - `payroll_summary`: present only when the requester is Admin or HR/Finance — reuses `PayrollController`'s existing summary-building unmodified, aggregated to organization totals (not per-employee, to keep the dashboard payload from duplicating the full Payroll Report).
- Route: `GET /api/dashboard`.
- Feature tests: role-scoping (Admin/HR-Finance org-wide, Supervisor own-department, Employee 403); `payroll_summary` present for Admin/HR-Finance and absent for Supervisor; concrete-number verification for total hours, KPI completion rate, attendance trend day-counts, and the billable/non-billable split, using the same rigor as Sprint 8/9's tests.

## Frontend Backlog

- `npm install recharts`.
- `types/dashboard.ts`: the full dashboard response shape (with `payroll_summary` optional).
- `lib/dashboardApi.ts`: `getDashboard(date?: string): Promise<DashboardData>`.
- `components/DashboardRoute.tsx`: allows `supervisor`, `admin`, or `hr_finance`, mirroring `PayrollRoute`.
- `pages/DashboardPage.tsx` (under `DashboardRoute`): a date picker + manual "Refresh" button; summary cards for total hours / pending approvals / billable vs. non-billable; a bar chart for department performance (org-wide) or a single department's breakdown (Supervisor); a bar chart for project allocation; a line or bar chart for attendance trends; a simple progress-bar list for KPI completion rates; an employee-productivity table; a payroll summary card shown only when present in the response.
- Update `AppLayout`: add a "Dashboard" nav link visible to Supervisor, Admin, and HR/Finance only.
- Update `App.tsx`: add the `/dashboard` route under `DashboardRoute`.
- Vitest + RTL tests for `dashboardApi.ts`, `DashboardRoute.tsx`, and `DashboardPage.tsx` (including that the payroll card only renders when the API response includes it).

## Acceptance Criteria

Sprint 10 is complete when:

- Admin/HR-Finance see organization-wide metrics across all ten PRD-listed categories, including a payroll summary.
- Supervisors see the same metrics scoped to their own department, with no payroll summary anywhere in the response or UI.
- Employees cannot reach the dashboard.
- Every metric's numbers are verified by tests against concrete, hand-computed expected values.
- No new database tables/columns were added.
- Manually refreshing or changing the date recomputes the dashboard fresh — no stale cached data.

## Deliverables

- Backend: 1 controller, 1 route, feature tests. No migrations.
- Frontend: 1 new dependency (`recharts`), 1 route guard, 1 new page, new API client + types, nav/routing updates, Vitest tests.
- This file (`sprints/SPRINT_10.md`).

## Implementation Order

1. Backend: `DashboardController` (start with role-scoping + period resolution, then add each metric one at a time, testing each as it's added) → route → full feature test suite. Run `php artisan test`.
2. Frontend: `npm install recharts` → types → `dashboardApi.ts` → `DashboardRoute` → `DashboardPage` (cards first, then each chart) → nav/routing.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: as Admin/HR-Finance, view the org-wide dashboard and confirm every metric matches hand-computed values from the same data used in Sprint 8/9's manual tests; as the Supervisor, confirm department-scoped metrics and no payroll card; confirm an Employee cannot reach `/dashboard`.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-9: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- Manual testing reuses the same Employee/Supervisor/Admin/HR-Finance set and logged time from the Payroll/Reports manual tests (Sprints 8-9).

## Risks

- If Clarification Question 1 or 2's resolved answers turn out not to match intent in practice, the fix is scoping/refresh-behavior only, not a rebuild — the underlying metric computations don't change either way.
- Treating "billable" as "has a project or client" (Confirmed Decision 1) is an inference with no prior precedent anywhere in the schema; if the real business rule differs (e.g., specific projects marked non-billable), this is a follow-up, not a redesign.
- Bundling ten distinct metrics into one endpoint keeps the dashboard simple to fetch, but means the response payload is larger than any single-purpose endpoint built so far — acceptable for a management-only, on-demand page, not a concern for MVP scale.
- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0.

## Validation Checklist

- Confirm no new migrations, no `billable` schema field, and no export button were added.
- Confirm `payroll_summary` is genuinely absent (not null) in a Supervisor's response, verified via API test, not just hidden in the UI.
- Confirm Employee access is blocked server-side (403), not just hidden in the UI.
- Confirm every metric is checked against a concrete, hand-computed number in at least one test.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` are updated to move Section Q from OPEN to RESOLVED once you answer the Clarification Questions, and otherwise remain unedited by implementation.
- Confirm no secrets are committed.

## Manual Testing Plan

1. Using the same logged/approved time from the Payroll and Reporting manual tests (Sprints 8-9), log in as HR/Finance; go to "Dashboard"; confirm total hours, employee productivity, department performance, KPI completion, attendance trend, billable/non-billable split, project allocation, pending approvals, and payroll summary all match hand-computed expectations.
2. Change the date picker to a different period; confirm all metrics update to reflect only that period.
3. Click "Refresh" without changing the date; confirm the page recomputes (add a new time entry in another tab first and confirm it appears after refresh, not automatically).
4. Log in as the department Supervisor; go to "Dashboard"; confirm metrics are scoped to their department only, and that no payroll summary card appears anywhere.
5. Log in as a Supervisor from a different department; confirm their dashboard shows different numbers, scoped to their own department.
6. Log in as an Employee; confirm no "Dashboard" nav link appears, and `GET /api/dashboard` returns 403 if called directly.
7. Log in as the Admin; confirm they see the same organization-wide view HR/Finance sees.

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
- No modules outside Dashboard And Analytics Foundation were touched.
- `docs/QUESTIONS.md` Section Q is already updated from OPEN to RESOLVED reflecting your answers to the Clarification Questions, and `docs/DECISIONS.md` already records the five Confirmed Decisions as approved, both before implementation begins.

## Code Generation Prompt

Use this only after Sprint 10 is approved:

```text
Implement Sprint 10 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_09.md
- sprints/SPRINT_10.md

Objective:
Build a management Dashboard aggregating total hours, employee
productivity, department performance, pending approvals, KPI
completion rates, attendance trends, billable/non-billable hours,
project allocation, and (Admin/HR-Finance only) a payroll summary,
scoped by role, computed fresh on each request from existing data.

Constraints:
- Do not add any new migrations or a `billable` schema field.
- Do not implement real-time push/polling; recompute on load plus a
  manual refresh button only.
- Do not grant Employees access to this dashboard.
- Do not include payroll_summary anywhere in a Supervisor's response.
- Do not add an export button to the dashboard.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- DashboardController, route, and feature tests with concrete-number
  verification for every metric (backend)
- recharts dependency, DashboardRoute, DashboardPage, API client/types,
  nav/routing updates (frontend)
- PASS or FAIL Sprint 10 review
```

## Validation Prompt

```text
Validate Sprint 10.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether every metric is verified against concrete hand-computed
  numbers, not just a 200 status code
- Whether payroll_summary is genuinely absent from a Supervisor's
  response (test-verified, not UI-hidden)
- Whether Employee access is blocked server-side
- Whether any new schema, export button, or push/polling mechanism
  was added
- Whether docs/DECISIONS.md and docs/QUESTIONS.md were updated to
  reflect Section Q's resolution
- Build/test readiness (backend and frontend, including Vitest)

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 10 implementation.
