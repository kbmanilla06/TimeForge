# Sprint 6 - KPI Management Foundation

## Sprint Goal

Build the KPI module (PRD §7.4): System Administrators define numeric KPIs, Supervisors assign them to individuals or departments within their own team, employees report progress through their time entries, and progress automatically credits once — and only once — when the containing timesheet is approved.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Sprint 5 built the approval gate but explicitly deferred KPI linkage: "the KPI module does not exist yet, so no KPI progress behavior is invented here. A future KPI Management sprint must revisit timesheet approval to wire this in, per the already-locked KPI decision that approval happens via timesheet approval." That decision already exists in `docs/DECISIONS.md` — this sprint builds the KPI entity itself and wires it into the existing `TimesheetController::approve()` action.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`, "KPI Management":

- KPIs are numeric for MVP.
- System Administrator creates KPIs; Supervisors assign KPIs to their team/department.
- KPIs may be assigned by role, department, project, or individual, but MVP prioritizes individual and department assignment.
- Approved work logs update KPI progress only when the log is linked to a KPI with a completed quantity/value.
- Employees report KPI progress through work logs; approval happens via timesheet approval, not a separate KPI approval step.

## Current Architecture This Sprint Builds On

- `TimesheetController::approve()` (Sprint 5) is the single place "a work log becomes officially approved" happens — this is where KPI crediting must be added.
- `time_entries` (Sprint 4/5) already carries `deliverables` (JSON) and is the natural place to add KPI-linkage fields, following the same additive-migration pattern used for `timesheet_id`/`task_status`.
- Department-scoped Supervisor + global Admin visibility (Sprint 5's `TimesheetPolicy` pattern) is the direct template for `KpiAssignmentPolicy`.
- The read-only, non-admin catalog pattern (`GET /api/projects`, `GET /api/clients` from Sprint 4) is the template for a `GET /api/kpis` catalog endpoint.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 6 Implementation Decisions (Approved)". Decision 4 was split into two (4 and 5) during approval for clarity; no substantive change.

1. **KPI fields:** `name` (string), `target_value` (nullable numeric — some KPIs may just be tracked counts with no fixed goal), `unit` (nullable string label, e.g., "bugs", "features"). No fixed catalog of KPI types — Admin can name anything, matching PRD's open-ended examples.
2. **KPI assignment model:** A new `kpi_assignments` table links one KPI to *either* a single user *or* a department (exactly one, never both/neither), each assignment carrying its own independent `progress_value`. No role-based or project-based assignment in MVP — the decision explicitly de-prioritizes these.
3. **Time entry KPI reference:** `time_entries.kpi_assignment_id` (not `kpi_id`). If a KPI is assigned to both an individual and their department, referencing the raw KPI would be ambiguous about whose progress counter to credit. Requiring the employee to pick a specific assignment (populated from their own resolved list — their individual assignments plus their department's) removes the ambiguity entirely.
4. **Progress credit timing:** Progress increments exactly once per entry, at the moment its timesheet is approved — not on submit, reject, or revision-request.
5. **Idempotency / reopen behavior:** A `kpi_progress_applied_at` timestamp on the time entry tracks whether its progress has already been applied, preventing double-counting if a timesheet is later reopened (Sprint 5) and re-approved — without it, a reopen-and-reapprove cycle would credit the same work twice.
6. **No automatic reversal:** If an approved timesheet is reopened, already-credited KPI progress is *not* automatically reversed, even if the employee edits the reported value afterward. This is a known foundation-level limitation, in the same spirit as Sprint 5's "rejected is terminal" caveat — reversing precisely would require much more bookkeeping than a foundation sprint warrants.
7. **Period resets:** None in MVP. KPI progress is an all-time running total. Periodic resets (monthly, per payroll period) are deferred to a future reporting/analytics sprint — nothing in the PRD or decisions specifies a reset cadence, and inventing one would be a business-rule guess.
8. **Visibility:** Mirrors Sprint 5 exactly — Employees see their own assignments (individual + their department's); Supervisors see their whole department's assignments; Admins see everything.
9. **Dashboards:** Not built in Sprint 6. PRD's "monitor productivity in real time" is satisfied here with plain numeric progress views (achieved vs. target). The actual Productivity Dashboards module (PRD §7.7) with charts/visualizations is a separate future sprint.

## User Stories

1. As a System Administrator, I want to define a KPI (name, target, unit), so it can be assigned to people.
2. As a Supervisor, I want to assign an existing KPI to an employee in my department, or to my department as a whole.
3. As an Employee, I want to report progress toward one of my assigned KPIs when I log a time entry.
4. As the system, I want that progress to only count once the containing timesheet is approved — not before, and not twice if the timesheet is later reopened and re-approved.
5. As an Employee, I want to see my own KPI assignments and progress.
6. As a Supervisor, I want to see my department's KPI assignments and progress.
7. As a System Administrator, I want to see all KPI assignments and progress, and remove an assignment if needed.

## Explicitly Out Of Scope This Sprint

- Productivity Dashboards (PRD §7.7): charts, visualizations, real-time refresh — this sprint only exposes plain numeric progress.
- Role-based and project-based KPI assignment (Confirmed Decision 2).
- Periodic KPI resets (Confirmed Decision 7).
- Automatic KPI-progress reversal when a timesheet is reopened (Confirmed Decision 6).
- Target-reached notifications or any new notification trigger events beyond Sprint 5's existing five.
- HR/Finance visibility into KPIs (not granted by any existing decision).
- Payroll, reports, AI, attachments, daily scrum.
- `docs/QUESTIONS.md` Section Q and the flagged P sub-items remain untouched.

## Backend Backlog

- Migration: create `kpis` table — `id`, `name`, `target_value` (nullable numeric), `unit` (nullable string), `created_by` (FK to `users`), timestamps.
- Migration: create `kpi_assignments` table — `id`, `kpi_id` (FK), `user_id` (nullable FK, `nullOnDelete`), `department_id` (nullable FK, `nullOnDelete`), `progress_value` (numeric, default 0), timestamps.
- Migration: add `kpi_assignment_id` (nullable FK to `kpi_assignments`, `nullOnDelete`), `kpi_progress_value` (nullable numeric), and `kpi_progress_applied_at` (nullable datetime) to `time_entries`.
- `Kpi` model: `belongsTo` User (creator), `hasMany` KpiAssignment.
- `KpiAssignment` model: `belongsTo` Kpi, `belongsTo` User (nullable), `belongsTo` Department (nullable).
- `KpiPolicy`: `viewAny`/`view` — any active user (catalog is readable so Supervisors/Admins can pick from it when assigning). `create` — Admin only.
- `KpiAssignmentPolicy`: `view` — the assignment's own user, a member of the assignment's department, the department's Supervisor, or an Admin. `create` — Admin (any user or department) or Supervisor (only users/department within their own department). `delete` — Admin (any) or Supervisor (only within their own department, symmetric with their create ability).
- Validation: assignment creation requires exactly one of `user_id`/`department_id`; a Supervisor's target user must share their department, and their target department must be their own.
- Update `StoreTimeEntryRequest`/`UpdateTimeEntryRequest`/`StartTimerRequest`: add `kpi_assignment_id` (nullable, must exist and must be visible to the requesting user — their own individual assignment or their department's) and `kpi_progress_value` (nullable numeric, required together with `kpi_assignment_id` via `required_with` both ways).
- `KpiController`: `index` (catalog, any active user), `store` (Admin only).
- `KpiAssignmentController`: `mine` (own resolved assignments, with KPI details, for the time entry picker), `team` (Supervisor's department / Admin's everything, mirroring `TimesheetController::teamIndex`), `store` (create assignment), `destroy` (remove assignment).
- Update `TimesheetController::approve()`: after marking approved, for each linked time entry where `kpi_assignment_id` is set and `kpi_progress_applied_at` is null, atomically increment the assignment's `progress_value` by the entry's `kpi_progress_value`, then set `kpi_progress_applied_at`.
- Factories: `KpiFactory`, `KpiAssignmentFactory`.
- Feature tests: KPI CRUD is Admin-only; catalog is readable by any active user; assignment creation respects Supervisor department-scoping; a Supervisor cannot assign outside their department; time entry KPI linkage is rejected if the assignment isn't visible to the user; progress increments only on approval, not on submit/reject/revision-request; progress does not double-count across a reopen-then-reapprove cycle; visibility scoping for `mine`/`team` matches Employee/Supervisor/Admin expectations.

## Frontend Backlog

- `types/kpi.ts`: `Kpi`, `KpiAssignment` (with nested `kpi`/`user`/`department`), create/assign payload types.
- `lib/kpiApi.ts`: `listKpis`, `createKpi`, `listMyAssignments`, `listTeamAssignments`, `createAssignment`, `deleteAssignment`.
- `pages/admin/KpisPage.tsx` (Admin only, under `AdminRoute`): list/create KPI definitions (name, target, unit), mirroring `DepartmentsPage`'s pattern.
- `pages/TeamKpisPage.tsx` (Supervisor/Admin, under `SupervisorRoute`): list department (or, for Admin, all) assignments with progress; form to assign an existing KPI to a user or a department.
- `pages/MyKpisPage.tsx` (every role): list the user's own assignments (individual + their department's) with progress vs. target.
- Update `TimeTrackingPage.tsx`: add an optional KPI-assignment select (populated from `listMyAssignments`) and a progress-value input to both the manual entry form and the start-timer form.
- Update `AppLayout`: add "My KPIs" (everyone), "Team KPIs" (Supervisor/Admin), and "Manage KPIs" (Admin only, alongside the existing admin links) nav links.
- Update `App.tsx`: add `/my-kpis`, `/team-kpis` (under `SupervisorRoute`), and `/admin/kpis` (under `AdminRoute`) routes.
- Vitest + RTL tests for the new API functions, the three new pages, and the `TimeTrackingPage` KPI-field additions.

## Acceptance Criteria

Sprint 6 is complete when:

- An Admin can create a KPI (name, target, unit).
- A Supervisor can assign an existing KPI to an employee in their department, or to their department as a whole; they cannot assign outside their department.
- An Employee can select one of their own assignments when logging or editing a time entry, and report a progress value.
- Progress does not change when a timesheet is merely submitted, rejected, or has revision requested — only when it is approved.
- Reopening an approved timesheet and re-approving it does not double-count already-credited progress.
- An Employee sees only their own assignments; a Supervisor sees their department's; an Admin sees all.
- All new backend and frontend logic has test coverage.
- No dashboards, payroll, reports, AI, attachments, or scrum code exists; no new notification events were added.

## Deliverables

- Backend: 3 migrations, 2 models, 2 policies, 2 controllers, validation updates to 3 existing time-entry Form Requests, an update to `TimesheetController::approve()`, factories, feature tests.
- Frontend: 3 new pages, updated `TimeTrackingPage`, new API client + types, nav/routing updates, Vitest tests.
- This file (`sprints/SPRINT_06.md`).

## Implementation Order

1. Backend: migrations (`kpis` → `kpi_assignments` → `time_entries` additions) → models → `KpiPolicy`/`KpiAssignmentPolicy` → `KpiController`/`KpiAssignmentController` → update `StoreTimeEntryRequest`/`UpdateTimeEntryRequest`/`StartTimerRequest` → update `TimesheetController::approve()` → routes → factories → tests. Run `php artisan test`.
2. Frontend: types → `kpiApi.ts` → `admin/KpisPage` → `TeamKpisPage` → `MyKpisPage` → `TimeTrackingPage` updates → nav/routing.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: create a KPI as Admin → assign it to an employee as their department Supervisor → log a time entry against it as that employee → submit and approve the timesheet → confirm progress incremented exactly once → reopen and re-approve → confirm progress did not increment again → confirm a different-department Supervisor cannot see or assign it.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-5: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- Manual testing needs the same two-user-same-department setup (Employee + Supervisor) used in Sprint 5's manual testing.

## Risks

- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0.
- Not reversing KPI progress on reopen (Decision 6) means a corrected-and-re-approved timesheet's KPI contribution can become stale relative to the entry's final edited value — an accepted, documented limitation, not a silent bug.
- Referencing a specific assignment rather than the raw KPI (Decision 3) means the time-entry form's picker must resolve "my assignments" correctly across both individual and department-level entries; getting this resolution wrong would silently misattribute progress, so it needs solid test coverage.
- KPIs with no `target_value` (Decision 1 allows this) mean the UI must handle "progress vs. no target" gracefully rather than assuming a percentage is always computable.

## Validation Checklist

- Confirm no dashboards, payroll, reports, AI, attachment, or scrum code was implemented.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm progress increments happen exactly once per entry, verified via `kpi_progress_applied_at`, not just "eventually correct."
- Confirm a Supervisor genuinely cannot assign or view KPIs outside their department (test via API, not just hidden in UI).
- Confirm no secrets are committed.

## Manual Testing Plan

1. Log in as the seeded Admin; create a KPI (e.g., "Bugs Resolved", target 10, unit "bugs").
2. Log in as a department Supervisor; go to Team KPIs; assign "Bugs Resolved" to an employee in their department.
3. Log in as that Employee; go to Time Tracking; log a time entry, selecting the "Bugs Resolved" assignment and entering a progress value (e.g., 3).
4. Submit the day's timesheet.
5. Log in as the Supervisor; approve it.
6. Log in as the Employee; go to My KPIs; confirm progress shows 3/10.
7. Log in as the Admin; reopen the timesheet; re-approve it without changing the entry; confirm progress is still 3/10, not 6/10.
8. Log in as a Supervisor from a different department; confirm they cannot see or assign this KPI to their own team members' entries against it.

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
- No modules outside KPI Management Foundation were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched by implementation (the nine Confirmed Decisions are already recorded as approved before implementation begins, same as prior sprints).

## Code Generation Prompt

Use this only after Sprint 6 is approved:

```text
Implement Sprint 6 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md
- sprints/SPRINT_01.md
- sprints/SPRINT_02.md
- sprints/SPRINT_03.md
- sprints/SPRINT_04.md
- sprints/SPRINT_05.md
- sprints/SPRINT_06.md

Objective:
Build KPI Management foundation: KPI definitions (Admin-created),
assignments to individuals or departments (Supervisor/Admin-scoped),
time-entry KPI progress reporting, and automatic, idempotent progress
crediting wired into TimesheetController::approve().

Constraints:
- Do not implement dashboards, charts, payroll, reports, AI,
  attachments, or daily scrum.
- Do not add role-based or project-based KPI assignment.
- Do not add periodic KPI resets or automatic progress reversal on
  timesheet reopen.
- Do not add new notification trigger events.
- Do not resolve docs/QUESTIONS.md Section Q or the flagged P sub-items.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migrations, models, policies, controllers, updated time-entry Form
  Requests, updated TimesheetController::approve(), routes, factories,
  and feature tests (backend)
- admin/KpisPage, TeamKpisPage, MyKpisPage, updated TimeTrackingPage,
  API client/types, nav/routing updates (frontend)
- PASS or FAIL Sprint 6 review
```

## Validation Prompt

```text
Validate Sprint 6.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether KPI progress increments exactly once per entry, including
  across a reopen-then-reapprove cycle
- Whether Supervisor visibility/assignment is genuinely department-
  scoped, not just hidden in the UI
- Whether time-entry KPI linkage rejects assignments not visible to
  the submitting user
- Whether any unapproved business features were implemented
- Whether docs/DECISIONS.md and docs/QUESTIONS.md were left untouched
- Build/test readiness (backend and frontend, including Vitest)

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 6 implementation.
