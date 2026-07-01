# Sprint 4 - Time Tracking Foundation

## Sprint Goal

Build the core Time Tracking module (PRD §7.1): employees can start/stop a timer or manually log a time entry, referencing the Project, Client, and Department that already exist from Sprints 1-3. Includes the daily/weekly/monthly/payroll-period hour totals PRD §7.1 explicitly requires. Does not include Smart Timesheet submission, Supervisor approval, KPI linkage, or attachments — those are later PRD modules (7.2, 7.4, 7.5) with their own unresolved decisions.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

PRD §7.1 is the first PRD-listed functional module ("the foundation of the system") and was explicitly blocked until Client and Project existed (Sprint 3). It now can proceed. `docs/DECISIONS.md` already resolved several Time Tracking rules (manual + timer entry, no overlaps, no future-dated entries, break/idle/screenshot tracking out of scope) — this sprint implements those. It does not attempt Smart Timesheet (7.2) or Supervisor Approval (7.5), which PRD treats as distinct modules layered on top of raw time entries, and which depend on decisions not yet made (e.g., what "submission" locks, in code, requires a Timesheet concept that doesn't exist yet).

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`, "Time Tracking":

- Employees can use start/stop timers and can also manually add time entries.
- Employees can edit draft entries before submission. Submitted entries cannot be edited unless a supervisor requests revision.
- Overlapping time entries are not allowed.
- Break time tracking, idle detection, and screenshot/activity monitoring are all out of scope for MVP.
- Future-dated work logs are not allowed.

Note on the second bullet: "submission" and supervisor-requested revision belong to the Timesheet/Approval concept (PRD §7.2/§7.5), which does not exist yet. This sprint treats all entries as editable/deletable by their owner, since there is nothing to "submit" to yet — see Confirmed Decision 7.

## Current Architecture This Sprint Builds On

- `User` (role, status, department_id), `Department`, `Client`, `Project` all exist with working CRUD and admin-only policies (Sprints 1-3).
- Auth: token-based Sanctum, `auth:sanctum` + `active` middleware pattern already established; `role:admin` middleware exists for admin-only routes but Time Tracking is **not** admin-only — it's every active user managing their own data.
- Frontend: `AuthContext`, `apiClient.ts`, `AppLayout` (nav shell), `ProtectedRoute`/`AdminRoute` pattern. Time Tracking is the first page built for **all** roles, not just Admin — it slots into `AppLayout` as a regular protected route, not under `AdminRoute`.
- `GET /api/admin/projects` and `GET /api/admin/clients` exist but are gated by `role:admin` — not usable by a plain Employee to populate a dropdown. See Confirmed Decision 8.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 4 Implementation Decisions (Approved)". Decision 3 differs from what was originally proposed — see note below.

1. **Task field:** Free-text string, same treatment as Description. No separate Task lookup/entity for MVP.
2. **Work Category field:** Free-text string for MVP, stored as `work_category`. No fixed enum/lookup table — can become a constrained list later via an additive migration.
3. **Reference links and deliverables:** *(Changed from the original proposal.)* These are **in scope** for Sprint 4, not deferred with attachments. Stored as nullable JSON array fields (`reference_links`, `deliverables`) on `time_entries`, cast to `array` on the model. They carry plain text/URL data, not file uploads, so they don't share attachments' still-open malware-scanning/retention questions.
4. **Who can log time:** Any active user, regardless of role, may create and manage their own time entries. Visibility and edit rights are strictly limited to entries they own — there is no role restriction on *who* tracks time, only on *whose* entries they can see. In Sprint 4, a user can only see their own entries; supervisor/team visibility is deferred to a later reporting or approval sprint.
5. **One running timer per user:** Starting a new timer while one is already running is rejected (error asking the user to stop the current one first).
6. **Attachments:** Deferred entirely from Sprint 4 — no upload fields or storage yet, unlike reference links/deliverables (Decision 3). Will be added once `docs/QUESTIONS.md` Section P's still-open items (malware scanning, retention period) are resolved.
7. **No "submitted/locked" state yet:** All entries remain editable/deletable by their owner in this sprint. The draft-vs-submitted distinction belongs to the Smart Timesheet & Approval Workflow sprint, which will introduce the concept a time entry is submitted *into*.
8. **Read access to Projects/Clients for non-admins:** Add new endpoints `GET /api/projects` and `GET /api/clients` — read-only, available to any active authenticated user (not admin-gated), so employees can populate selection dropdowns. The existing `/api/admin/projects` and `/api/admin/clients` (full CRUD, admin-only) are unchanged. No non-admin create/update/delete access.

Also note: Department on a time entry is auto-populated (snapshotted) from the logged-in user's own `department_id` at creation time, not a field the user selects — this was stated in the plan's "Current Architecture" reasoning and remains unchanged; no cross-department logging in MVP.

## User Stories

1. As an Employee, I want to start a timer when I begin work and stop it when I finish, so my hours are recorded automatically.
2. As an Employee, I want to manually add a time entry for work I forgot to time live.
3. As an Employee, I want to pick a Project (and see its Client) and Task/Work Category/Description when logging time, and optionally add reference links and deliverables.
4. As an Employee, I want to see my own time entries in a list, and edit or delete them if I made a mistake.
5. As an Employee, I want to see my total hours for today, this week, this month, and the current payroll period.
6. As the system, I want to reject overlapping time entries and future-dated entries automatically.
7. As the system, I want to prevent a user from running two timers at once.

## Explicitly Out Of Scope This Sprint

- Smart Timesheet (PRD §7.2): bundling entries into a submittable daily timesheet, linking outputs/KPIs achieved.
- Supervisor Approval Workflow (PRD §7.5): submission, approve/reject/revision-request, supervisor comments.
- KPI Management (PRD §7.4) and any KPI-progress linkage from time entries.
- Payroll Preparation (PRD §7.6): this sprint only computes hour *totals* for display, not payroll amounts.
- Attachments (file upload/storage) — see Confirmed Decision 6. Reference links and deliverables are in scope this sprint (Confirmed Decision 3).
- Supervisor/HR/Finance/Admin visibility into other users' time entries (deferred to the Approval Workflow sprint, consistent with the same deferral already made in `sprints/SPRINT_01.md`).
- Daily scrum, dashboards, reports, AI.
- `docs/QUESTIONS.md` Section Q and the flagged P sub-items remain untouched.

## Backend Backlog

- Migration: create `time_entries` table — `id`, `user_id` (FK), `project_id` (nullable FK, `nullOnDelete`), `client_id` (nullable FK, `nullOnDelete`), `department_id` (nullable FK, `nullOnDelete`, snapshotted at creation), `date`, `start_time` (datetime), `end_time` (nullable datetime — null while a timer is running), `duration_minutes` (nullable int, computed when `end_time` is set), `task` (string), `work_category` (string), `description` (text), `reference_links` (nullable JSON), `deliverables` (nullable JSON), timestamps.
- `TimeEntry` model: `belongsTo` User, Project, Client, Department. Casts `reference_links` and `deliverables` to `array`. Accessor or service method to compute `duration_minutes` from `start_time`/`end_time`.
- `TimeEntryPolicy`: `viewAny`/`create` — any active user. `view`/`update`/`delete` — only the entry's own `user_id` matches the authenticated user (no admin/supervisor override yet).
- Validation/business rules (in a Form Request or a small `TimeEntryService`, not inline in the controller): no overlapping entries for the same user; `date` cannot be in the future; only one entry with `end_time = null` (running timer) per user at a time; `reference_links`/`deliverables` validated as nullable arrays of strings.
- `TimeEntryController` (self-service, not under `/admin`): `index` (own entries, optional date-range filter), `store` (manual entry), `update`, `destroy`, `startTimer`, `stopTimer`, `summary` (daily/weekly/monthly/current-payroll-period totals for the authenticated user, using the existing semi-monthly payroll period decision).
- New read-only, non-admin endpoints: `GET /api/projects` (any active user), `GET /api/clients` (any active user) — thin controllers reusing the existing `Project`/`Client` models, gated only by `auth:sanctum` + `active`.
- Routes: `/api/time-entries` (+ `/start`, `/{id}/stop`, `/summary`) and `/api/projects`, `/api/clients`, all under `auth:sanctum` + `active` (no `role:admin`).
- `TimeEntryFactory`.
- Feature tests: create manual entry, start/stop timer, duration computed correctly, reject overlapping entries, reject future-dated entries, reject starting a second timer while one is running, user cannot view/edit/delete another user's entry, summary totals are correct for day/week/month/payroll-period, non-admin can read `/api/projects` and `/api/clients`.

## Frontend Backlog

- `types/timeEntry.ts`: `TimeEntry`, `TimeEntrySummary`, create/update payload types.
- `lib/timeEntryApi.ts`: `listTimeEntries`, `createTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `startTimer`, `stopTimer`, `getSummary`, plus `listProjectsForSelf`/`listClientsForSelf` hitting the new non-admin endpoints.
- `pages/TimeTrackingPage.tsx` (regular protected route, **not** under `AdminRoute` — available to every role): live timer widget (Start/Stop, elapsed time while running), manual entry form (date, start, end, project, task, work category, description, plus simple add/remove list inputs for reference links and deliverables), a table of the user's own entries with Edit/Delete, and a summary panel (today/this week/this month/current payroll period totals).
- Update `AppLayout` nav: add a "Time Tracking" link visible to all authenticated users (not admin-gated).
- Update `App.tsx`: add `/time-tracking` route under the existing `ProtectedRoute`/`AppLayout`, outside `AdminRoute`.
- Vitest + RTL tests for the new API functions and the page (timer start/stop interaction, manual entry submission, summary display, edit/delete).

## Acceptance Criteria

Sprint 4 is complete when:

- Any active user can start a timer, see it running, and stop it, producing a time entry with a computed duration.
- Any active user can manually create a time entry with project/client/task/category/description, and optionally reference links and deliverables.
- A user cannot start a second timer while one is already running.
- A user cannot create an overlapping or future-dated entry.
- A user can edit and delete their own entries, but not another user's.
- A user can see accurate daily/weekly/monthly/current-payroll-period hour totals.
- A non-admin user can populate project/client dropdowns via the new read-only endpoints, without needing `role:admin`.
- All new backend and frontend logic has test coverage.
- No Smart Timesheet, Approval Workflow, KPI, payroll computation, attachment, scrum, dashboard, report, or AI code exists.

## Deliverables

- Backend: 1 migration, 1 model, 1 policy, validation rules/service, controllers for time entries and the two new read-only endpoints, routes, factory, feature tests.
- Frontend: types, API client functions, `TimeTrackingPage`, nav/routing updates, Vitest tests.
- This file (`sprints/SPRINT_04.md`).

## Implementation Order

1. Backend: migration → model → policy → validation rules → `TimeEntryController` (manual CRUD first, then start/stop, then summary) → read-only Project/Client endpoints → factory → tests. Run `php artisan test`.
2. Frontend: types → `timeEntryApi.ts` → `TimeTrackingPage` (manual entry + list first, then timer widget, then summary panel) → nav/routing.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: start a timer, stop it, confirm duration; manually add an entry; try an overlapping entry (rejected); try a future-dated entry (rejected); try starting two timers (rejected); edit and delete an entry; confirm summary totals; confirm a second user cannot see/edit the first user's entries.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-3: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.

## Risks

- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0.
- Free-text Task/Work Category (Decisions 1-2) may need to become constrained lists later if reporting/KPI linkage requires consistent values — acceptable, additive-migration risk, deferred rather than guessed at now.
- Adding non-admin read endpoints for Projects/Clients (Decision 8) is a new architectural pattern (first non-admin-gated data endpoint); if a future decision restricts which projects an employee may see (e.g., only projects they're assigned to), this endpoint will need filtering logic added — acceptable given Sprint 3's Decision 5 explicitly said any employee may reference any project for now.
- Duration/summary computation assumes a single timezone (server/UTC); no timezone-handling decision has been made and none is being invented here — flagged for a later sprint if it becomes relevant.

## Validation Checklist

- Confirm no Smart Timesheet, Approval Workflow, KPI, payroll, attachment, scrum, dashboard, report, or AI code was implemented.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm a user genuinely cannot view, edit, or delete another user's time entries (test via the API, not just hidden in the UI).
- Confirm overlapping and future-dated entries are rejected server-side, not just client-side.
- Confirm the new `/api/projects` and `/api/clients` endpoints are read-only (no store/update/destroy) and require only `active`, not `role:admin`.
- Confirm no secrets are committed.

## Manual Testing Plan

1. Log in as a non-admin active user (create and activate one via the Sprint 2 admin UI if needed).
2. Start a timer; confirm the UI shows it running with elapsed time.
3. Stop the timer; confirm a time entry appears with the correct duration.
4. Manually add a time entry for an earlier time today, selecting a project (created in Sprint 3) and filling task/category/description.
5. Attempt to manually add an entry overlapping the one just created; confirm it's rejected.
6. Attempt to add an entry dated tomorrow; confirm it's rejected.
7. Start a timer, then attempt to start a second one; confirm it's rejected.
8. Edit one of the entries; confirm the change is saved. Delete another; confirm it's removed.
9. Confirm the summary panel shows correct today/week/month/payroll-period totals.
10. Log in as a second user; confirm they cannot see the first user's entries anywhere, including by direct API call.

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
- No modules outside Time Tracking Foundation were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched by implementation (the eight Confirmed Decisions are already recorded as approved before implementation begins, same as prior sprints).

## Code Generation Prompt

Use this only after Sprint 4 is approved:

```text
Implement Sprint 4 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md
- sprints/SPRINT_01.md
- sprints/SPRINT_02.md
- sprints/SPRINT_03.md
- sprints/SPRINT_04.md

Objective:
Build Time Tracking Foundation only: time entry data model (including
reference_links and deliverables as JSON fields), start/stop timer,
manual entry, self-service CRUD, hour-total summaries, and the two new
non-admin read-only Project/Client endpoints it depends on.

Constraints:
- Do not implement Smart Timesheet submission, Supervisor Approval,
  KPI linkage, payroll computation, or file attachments/uploads.
- Do not give any role visibility into another user's time entries.
- Do not add a submitted/locked entry state.
- Do not resolve docs/QUESTIONS.md Section Q or the flagged P sub-items.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migration, model, policy, validation rules, controllers, routes,
  factory, and feature tests (backend)
- TimeTrackingPage, timeEntryApi/types, nav/routing updates (frontend)
- PASS or FAIL Sprint 4 review
```

## Validation Prompt

```text
Validate Sprint 4.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether a user can access another user's time entries via any route
- Whether overlapping/future-dated entries and double-running timers
  are rejected server-side
- Whether the new /api/projects and /api/clients endpoints are
  read-only and not admin-gated
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

Give final approval ("approved", "proceed", or "implement") to begin Sprint 4 implementation.
