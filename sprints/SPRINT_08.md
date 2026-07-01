# Sprint 8 - Payroll Preparation Foundation

## Sprint Goal

Build the Payroll Preparation module (PRD §7.6): live, on-demand computation of each employee's approved/pending/rejected hours, overtime, attendance days, and estimated payroll for a semi-monthly period, viewable by System Administrators and — for the first time — HR/Finance. No PDF/Excel export, no stored reports, no notifications yet.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Timesheet approval (Sprint 5) and its `Timesheet.status` state already establish exactly which hours are "approved," "pending" (submitted or revision-requested), or "rejected." Payroll Preparation is the next PRD module and the first to actually consume that distinction for a business calculation, and the first to activate the `hr_finance` role — which has existed in `UserRole` since Sprint 1 but has never been granted any permission.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`, "Payroll":

- Formula: estimated payroll = (approved regular hours × hourly rate) + (approved overtime hours × overtime rate).
- Hourly rate stored per employee.
- Overtime rate defaults to 1.25x hourly rate, admin-configurable.
- Overtime = any approved work beyond 8 hours in one day.
- Taxes, deductions, benefits, and allowances are out of scope for MVP.
- Payroll reports are estimates only, not final disbursement records.
- Payroll periods are semi-monthly by default: 1st-15th and 16th-end of month.

From `docs/DECISIONS.md`, "HR/Finance can view approved timesheets, attendance summaries, payroll reports, and exports. They cannot edit employee-submitted timesheets."

From `docs/PRD.md` §7.6, the module must summarize: approved hours, pending hours, rejected hours, overtime, attendance summary, hourly rate, estimated payroll.

## Hard Constraints From Already-Locked Decisions

1. `docs/DECISIONS.md` "Notifications" locks the trigger list including "payroll report ready" — but that event describes an actual report being *generated*. Sprint 8 only builds live, on-demand viewing (nothing is ever "generated" or stored), so there is no discrete moment to notify about. This event is deferred to whichever future sprint actually generates/exports a report, not invented here.
2. `docs/DECISIONS.md` "Reporting And Exports" is a distinct, separately-tracked decision section ("Report layouts proposed during the reporting sprint") from "Payroll." PDF/Excel export — explicitly required by PRD §7.6 — belongs to that future Reporting sprint, not this one.

## Current Architecture This Sprint Builds On

- `TimeEntryController::currentPayrollPeriod()` (Sprint 4) already computes the exact semi-monthly boundaries this sprint needs — it is extracted into a shared helper and reused, not duplicated (see Confirmed Decision 3 below).
- `Timesheet.status` (Sprint 5: `submitted`/`approved`/`rejected`/`revision_requested`) is the sole source of truth for which time entries count as approved/pending/rejected — no new schema needed for that distinction.
- `UserRole::HrFinance` and `UserFactory::hrFinance()` (Sprint 1) already exist but have never been used by any policy or route — this is the first sprint that actually grants that role something.
- `SupervisorRoute` (Sprint 5, allows `supervisor` or `admin`) is the direct template for a new `PayrollRoute` (allows `admin` or `hr_finance`).
- `Admin\UserController::update()` (Sprint 1) is the existing Admin-only user-edit endpoint; adding `hourly_rate` there follows the same "extend, don't duplicate" reasoning already used across every prior sprint.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 8 Implementation Decisions (Approved)". Decision 1 was split into two (1 and 2) during approval for clarity; Decisions 7 and 8 (notifications, export) were combined into a single Decision 9; no substantive change either way.

1. **Hourly rate:** Stored per employee/user (`hourly_rate`, nullable decimal, on `users`). Admin edits it through the *existing* `Admin\UserController::update()` endpoint and `UserFormPage` — no new dedicated "manage rates" endpoint or page, no separate payroll settings screen.
2. **Overtime multiplier:** One global overtime multiplier, default 1.25, configurable via environment/config (`config('payroll.overtime_multiplier')`, `.env`-overridable) — not a database-backed settings UI, not a per-employee override in Sprint 8.
3. **Payroll period:** Fixed semi-monthly periods (1st-15th and 16th-end of month); no admin-configurable period length in Sprint 8. `TimeEntryController::currentPayrollPeriod()` is extracted into `app/Support/PayrollPeriod.php` and reused, not duplicated, refactoring Sprint 4's existing logic without changing its behavior.
4. **Overtime calculation:** Calculated per day — approved minutes beyond 8 hours (480 minutes) in a day are overtime; the rest is regular. Daily overtime is summed across the payroll period — no weekly aggregation.
5. **Hour buckets:** Approved, pending, and rejected hours derive directly from the linked timesheet's status (`approved` → approved hours, `submitted`/`revision_requested` → pending hours, `rejected` → rejected hours). Entries with no linked timesheet aren't counted in any bucket. No new payroll-specific status schema.
6. **Attendance summary:** The distinct count of days with time entries in the payroll period, regardless of approval status. No clock-in/out or absence-tracking behavior is invented.
7. **Live computation:** Payroll reports are live-computed estimates only, recomputed from `time_entries`/`timesheets` on every request. No `payroll_reports` table, no stored/generated report in Sprint 8.
8. **Visibility:** Only Admin and HR/Finance can view payroll estimates in Sprint 8. Supervisors and employees cannot view payroll estimates yet — a deliberate narrowing relative to every prior sprint's Supervisor-sees-own-department default, since neither the PRD nor `docs/DECISIONS.md` names Supervisors as payroll *viewers* (only as report *exporters*, a separate deferred feature).
9. **Notifications and exports:** No payroll notifications, PDF export, Excel export, stored reports, or queue-based report generation in Sprint 8. These belong to later reporting/export sprints.

## User Stories

1. As HR/Finance, I want to see every employee's approved/pending/rejected hours, overtime, attendance, and estimated payroll for the current period.
2. As HR/Finance or Admin, I want to view a past payroll period, not only the current one.
3. As an Admin, I want to set an employee's hourly rate.
4. As an Admin, I want the same payroll visibility HR/Finance has.
5. As a Supervisor or Employee, I should not be able to view payroll data in Sprint 8.

## Explicitly Out Of Scope This Sprint

- PDF/Excel export (Confirmed Decision 9; Hard Constraint 2).
- Any new notification trigger event (Confirmed Decision 9; Hard Constraint 1).
- Stored/historical payroll reports; only live computation exists (Confirmed Decision 7).
- Admin-configurable payroll period length or an in-app overtime-rate settings screen (Confirmed Decision 2, 3).
- Taxes, deductions, benefits, allowances (already out of scope per `docs/DECISIONS.md`).
- Supervisor or Employee payroll visibility (Confirmed Decision 8).
- Dashboards, AI, attachments, any other future module.
- `docs/QUESTIONS.md` Section F is already RESOLVED and is not reopened; other sections remain untouched.

## Backend Backlog

- Migration: add `hourly_rate` (nullable decimal) to `users`.
- `config/payroll.php`: `overtime_multiplier` (default 1.25, reads `env('PAYROLL_OVERTIME_MULTIPLIER', 1.25)`).
- `app/Support/PayrollPeriod.php`: extracted from `TimeEntryController::currentPayrollPeriod()` — a static method resolving a reference date to `[start, end]` Carbon instances for its semi-monthly period. Update `TimeEntryController` to use it instead of its private copy; existing Sprint 4 tests must still pass unchanged.
- `User` model: add `isHrFinance(): bool`.
- Update `Admin\UserController`'s update Form Request to accept optional `hourly_rate` (nullable numeric, min 0).
- `PayrollController::index(Request $request)`: `date` query param (optional, defaults to today) resolves the period via `PayrollPeriod`; guards with an inline `$user->isAdmin() || $user->isHrFinance()` check (403 otherwise, no new Policy class needed since this isn't an Eloquent-backed resource); returns one row per active user: `user_id`, `name`, `department`, `hourly_rate`, `approved_minutes`, `pending_minutes`, `rejected_minutes`, `overtime_minutes`, `attendance_days`, `estimated_payroll`, `period_start`, `period_end`.
- Route: `GET /api/payroll`.
- Factories: none new (reuses `User`, `TimeEntry`, `Timesheet` factories already in place).
- Feature tests: rate storage via the existing user-update endpoint; period resolution matches `TimeEntryController::summary()`'s existing behavior after the refactor; approved/pending/rejected bucketing per timesheet status; overtime correctly caps at 8 hours/day and only for approved days; attendance day count; estimated payroll formula arithmetic; Admin and HR/Finance can access `GET /api/payroll`; Supervisor and Employee get 403.

## Frontend Backlog

- `types/payroll.ts`: `PayrollSummaryRow`.
- `lib/payrollApi.ts`: `getPayrollSummary(date?: string): Promise<PayrollSummaryRow[]>`.
- `components/PayrollRoute.tsx`: allows `admin` or `hr_finance`, mirroring `SupervisorRoute`.
- `pages/PayrollPage.tsx` (under `PayrollRoute`): a date picker (defaulting to today) and a table — Employee, Department, Hourly Rate, Approved Hours, Pending Hours, Rejected Hours, Overtime Hours, Attendance Days, Estimated Payroll.
- Update `pages/admin/UserFormPage.tsx`: add an optional `hourly_rate` input.
- Update `AppLayout`: add a "Payroll" nav link visible to Admin and HR/Finance only.
- Update `App.tsx`: add the `/payroll` route under `PayrollRoute`.
- Vitest + RTL tests for `payrollApi.ts`, `PayrollRoute.tsx`, `PayrollPage.tsx`, and the `UserFormPage` rate field.

## Acceptance Criteria

Sprint 8 is complete when:

- An Admin can set an employee's hourly rate through the existing user-edit form.
- HR/Finance and Admin can view a table of every active employee's approved/pending/rejected/overtime hours, attendance days, and estimated payroll for a given semi-monthly period.
- Overtime is computed per day (any minutes beyond 8 hours that day), only for approved days, and correctly summed across the period.
- Estimated payroll matches the locked formula exactly.
- A Supervisor or Employee cannot access payroll data (backend 403, frontend redirected).
- `TimeEntryController::summary()` still behaves identically after the `PayrollPeriod` extraction (existing Sprint 4 tests unchanged and passing).
- No export, no stored reports, no new notification event, and no per-employee overtime-rate override exist anywhere in the diff.
- All new backend and frontend logic has test coverage.

## Deliverables

- Backend: 1 migration, 1 config file, 1 extracted support class, 1 model method, 1 updated Form Request, 1 controller, 1 route, feature tests.
- Frontend: 1 new route guard, 1 new page, updated `UserFormPage`, new API client + types, nav/routing updates, Vitest tests.
- This file (`sprints/SPRINT_08.md`).

## Implementation Order

1. Backend: migration (`hourly_rate`) → `config/payroll.php` → extract `PayrollPeriod` and refactor `TimeEntryController` onto it (confirm existing tests still pass) → `User::isHrFinance()` → update the Admin user-update Form Request → `PayrollController` → route → tests. Run `php artisan test`.
2. Frontend: types → `payrollApi.ts` → `PayrollRoute` → `PayrollPage` → `UserFormPage` rate field → nav/routing.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: set an employee's hourly rate as Admin → log time, submit, and approve some of it across a couple of days (including one day exceeding 8 hours) → view the payroll table as HR/Finance → confirm approved/overtime/estimated-payroll numbers are correct → confirm a Supervisor and an Employee cannot reach `/payroll`.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-7: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- Manual testing needs an HR/Finance user (`User::factory()->hrFinance()` exists since Sprint 1 but has never been exercised through the UI) in addition to the usual Employee/Supervisor/Admin set.

## Risks

- Refactoring `TimeEntryController::currentPayrollPeriod()` into a shared helper touches Sprint 4 code; if done carelessly it could silently change `TimeEntryController::summary()`'s behavior. Mitigated by running the full existing test suite immediately after the extraction, before adding anything new.
- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0.
- A single global overtime multiplier (Confirmed Decision 2) means it cannot yet differ by employee or role; if that turns out to be required, it's a small, isolated follow-up (add a nullable per-user override column), not a redesign.
- Restricting visibility to Admin/HR-Finance only (Confirmed Decision 8) is a deliberate narrowing relative to every prior sprint's Supervisor-sees-own-department default; if Supervisors are later found to need payroll visibility, that's a policy change, not a schema change.

## Validation Checklist

- Confirm no export, stored reports, new notification events, or per-employee overtime overrides were implemented.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm the overtime/approved-hours math is verified by tests with concrete numbers, not just "endpoint returns 200."
- Confirm Supervisor and Employee are genuinely blocked from `GET /api/payroll` (test via API, not just hidden in UI).
- Confirm `TimeEntryController::summary()`'s existing Sprint 4 tests still pass unchanged after the `PayrollPeriod` extraction.
- Confirm no secrets are committed.

## Manual Testing Plan

1. Log in as the seeded Admin; edit an Employee's profile; set their hourly rate (e.g., 20.00).
2. Log in as that Employee; log and submit approved-looking time: one day with 8 hours, one day with 10 hours (2 hours of overtime).
3. Log in as their Supervisor; approve both days.
4. Log in as an HR/Finance user (create one via the Admin Manage Users page with role HR/Finance); go to "Payroll"; confirm the employee's row shows 8 approved regular hours + 2 overtime hours for the 10-hour day, correct attendance day count, and an estimated payroll matching (regular hours × rate) + (overtime hours × rate × 1.25).
5. Submit a third day's time but leave it unapproved (pending) and a fourth day that gets rejected; confirm they appear in the Pending/Rejected columns, not Approved.
6. Change the date picker to a different payroll period; confirm the numbers update to that period only.
7. Log in as the Supervisor and then as the Employee; confirm neither can reach `/payroll` (redirected in the UI; 403 if called directly).
8. Log in as the Admin; confirm they see the same table HR/Finance sees.

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
- No modules outside Payroll Preparation Foundation were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched by implementation (the nine Confirmed Decisions are already recorded as approved before implementation begins, same as prior sprints).

## Code Generation Prompt

Use this only after Sprint 8 is approved:

```text
Implement Sprint 8 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_07.md
- sprints/SPRINT_08.md

Objective:
Build Payroll Preparation foundation: per-employee hourly rate,
live per-period payroll summary (approved/pending/rejected hours,
per-day-capped overtime, attendance days, estimated payroll),
viewable by Admin and HR/Finance only.

Constraints:
- Do not implement PDF/Excel export or any stored/historical report.
- Do not add a new notification trigger event.
- Do not add per-employee overtime-rate overrides or an in-app
  settings screen for the overtime multiplier.
- Do not grant Supervisor or Employee payroll visibility.
- Do not make payroll periods admin-configurable in length.
- Extract TimeEntryController::currentPayrollPeriod() into a shared
  helper without changing its existing behavior; confirm Sprint 4's
  tests still pass.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migration, config, PayrollPeriod extraction, User::isHrFinance(),
  updated Admin user-update Form Request, PayrollController, route,
  and feature tests (backend)
- PayrollRoute, PayrollPage, updated UserFormPage, API client/types,
  nav/routing updates (frontend)
- PASS or FAIL Sprint 8 review
```

## Validation Prompt

```text
Validate Sprint 8.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether the payroll formula, overtime cap, and hour bucketing are
  verified with concrete test numbers
- Whether Supervisor/Employee are genuinely blocked from GET
  /api/payroll, not just hidden in the UI
- Whether TimeEntryController::summary() still behaves identically
  after the PayrollPeriod extraction
- Whether any unapproved business features were implemented (export,
  stored reports, notifications, per-employee overtime overrides)
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

Give final approval ("approved", "proceed", or "implement") to begin Sprint 8 implementation.
