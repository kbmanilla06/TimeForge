# Sprint 5 - Smart Timesheet Submission And Supervisor Approval Foundation

## Sprint Goal

Let employees bundle a day's time entries into a submittable Timesheet (PRD §7.2), and let Supervisors (and Admins) approve, reject, or request revision on it (PRD §7.5), with supervisor comments permanently retained and in-app notifications on every workflow transition. Once approved, entries lock — this is the gate PRD requires before payroll computation, though Payroll itself (§7.6) is a later sprint.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Sprint 4 explicitly deferred this: "the draft-vs-submitted distinction belongs to the Smart Timesheet & Approval Workflow sprint, which will introduce the concept a time entry is submitted *into*." Time entries currently stay editable forever, which PRD does not intend — §7.5 requires a real approval gate, and `docs/DECISIONS.md` already locks the core shape of it (per-day submission, revision-request-then-resubmit cycle, admin-only reopen of a finally-approved timesheet, in-app notifications). This sprint builds that gate.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`:

- **Timesheet Approval Workflow:** Approval is per submitted daily timesheet. On revision request, the employee edits the flagged fields and resubmits. Only a System Administrator can reopen a finally-approved timesheet. No second-level HR/Finance approval in MVP. Approval actions generate in-app notifications.
- **Roles And Permissions:** Supervisors see only employees assigned to their team/department (Sprint 1's department-based team model — this is the sprint that finally uses it).
- **Notifications:** In-app notifications required for approval events. Trigger events (as approved for this sprint): timesheet submitted, approved, rejected, revision requested, and reopened. Email notifications remain optional/deferred.

## Current Architecture This Sprint Builds On

- `time_entries` (Sprint 4): owned by `user_id`, currently editable/deletable indefinitely by the owner, no lock state.
- `User` already has the `Notifiable` trait (added Sprint 1, unused until now) — Laravel's built-in database notification channel is the natural fit, requiring no new package.
- `User.department_id` + `role` (Sprint 1) is the existing "team" model: a Supervisor's team = users sharing their `department_id`.
- Admin-only vs. self-service route patterns are both established (Sprints 1-4); this sprint introduces a **third** pattern: "Supervisor of the owner's department, or Admin" — new territory, not a reuse of `role:admin`.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 5 Implementation Decisions (Approved)". Decision 6 differs slightly from what was originally proposed — see note below.

1. **Task status field:** PRD §7.2 requires it but no value set is defined anywhere. Add `task_status` as a free-text nullable string on `time_entries` (additive migration), matching the Sprint 4 precedent for `task`/`work_category`. No fixed enum for MVP.
2. **KPI linkage deferred entirely:** PRD §7.2 lists "Corresponding KPIs achieved" as a timesheet requirement, and `docs/DECISIONS.md`'s KPI section already says KPI progress approval happens "via timesheet approval, not a separate KPI approval step" — but no KPI module exists yet. This sprint does not add any KPI field, table, or linkage. When the future KPI Management sprint is built, timesheet approval will need to be revisited to wire this in, per the already-locked decision.
3. **Supervisor comment history:** A separate `timesheet_comments` table (one row per review action: approve/reject/request-revision), not a single overwritable field on `timesheets`. This is what actually satisfies "must remain permanently attached... for future reference," since a single field would lose history across multiple review cycles.
4. **Revision-request granularity:** "The employee edits the flagged fields and resubmits" is implemented as: requesting revision reopens *all* of that day's time entries for editing (not field-by-field flagging of specific entries/fields). The supervisor's comment communicates in plain text what needs fixing.
5. **Who can review:** A Supervisor may approve/reject/request-revision for timesheets belonging to users in their own department. An Admin may do the same for any user's timesheet, plus the exclusive "reopen an approved timesheet" action. Nobody may review their own timesheet, even a Supervisor or Admin (mirrors the existing self-deactivation guard from Sprint 1/2).
6. **Notifications implementation:** *(Changed from the original proposal.)* Laravel's built-in database notification channel (`Notifiable` trait, already on `User`). Scope: backend sends notifications on submit, approve, reject, revision-request, **and reopen** (five trigger events, not four); a simple "My Notifications" list page with mark-as-read. No nav bell/badge widget, no email (already deferred) — kept minimal for this foundation sprint.
7. **HR/Finance visibility deferred:** `docs/DECISIONS.md` grants HR/Finance viewing rights over approved timesheets, but nothing consumes that view meaningfully until Payroll Preparation (§7.6) exists. Deferred to that sprint rather than building an unused read screen now.
8. **Submission granularity:** One `Timesheet` row per `(user_id, date)`, created only at first submission (no pre-existing "draft timesheet" row for every date). Submitting a date with zero time entries is rejected. Resubmission after a revision request reuses the same `Timesheet` row, so comment history accumulates across review cycles on one record.

## User Stories

1. As an Employee, I want to submit a day's time entries as a timesheet, so my supervisor can review my work.
2. As an Employee, I want my submitted entries to lock, so I can't quietly change what was reviewed.
3. As an Employee, I want to see my timesheet's status (submitted/approved/rejected/revision requested) and any supervisor comments.
4. As an Employee, when revision is requested, I want to edit my entries and resubmit.
5. As a Supervisor, I want to see submitted timesheets from my department's employees, so I can review them.
6. As a Supervisor, I want to approve, reject, or request revision, with a comment attached.
7. As a System Administrator, I want to reopen a finally-approved timesheet if a correction is needed after the fact.
8. As any user, I want an in-app notification when my timesheet is submitted, reviewed (approved/rejected/revision requested), or reopened, or when I (as a Supervisor) have a new submission to review.

## Explicitly Out Of Scope This Sprint

- KPI Management (PRD §7.4) and any KPI-progress linkage from timesheet approval (Confirmed Decision 2).
- Payroll Preparation (PRD §7.6): approved timesheets are the future input to payroll, not computed here. HR/Finance visibility into approved timesheets is deferred to that sprint.
- Field-level "flagged" revision requests (Confirmed Decision 4) — whole-day reopen only.
- Email notifications, notification badges/real-time push.
- Daily scrum, dashboards, reports, AI, attachments.
- `docs/QUESTIONS.md` Section Q and the flagged P sub-items remain untouched.

## Backend Backlog

- Migration: add `timesheet_id` (nullable FK to `timesheets`, `nullOnDelete`) and `task_status` (nullable string) to `time_entries`.
- Migration: create `timesheets` table — `id`, `user_id` (FK), `date`, `status` (string: `submitted`, `approved`, `rejected`, `revision_requested`), `submitted_at`, `reviewed_by` (nullable FK to `users`), `reviewed_at`, timestamps; unique on `(user_id, date)`.
- Migration: create `timesheet_comments` table — `id`, `timesheet_id` (FK), `author_id` (FK to `users`), `action` (string: `approved`/`rejected`/`revision_requested`/`reopened`), `comment` (nullable text — optional on approve/reopen, required on reject/revision-request), timestamps.
- `php artisan notifications:table` + migrate (Laravel's standard database-notifications stub).
- `Timesheet` model: `belongsTo` User (owner) and `User` (reviewer, via `reviewed_by`), `hasMany` TimeEntry, `hasMany` TimesheetComment.
- `TimesheetComment` model: `belongsTo` Timesheet, `belongsTo` User (author).
- `TimesheetPolicy`: `view` — owner, same-department Supervisor, or Admin. `create`/submit — owner only. `review` (approve/reject/request-revision) — same-department Supervisor or Admin, excluding self-review. `reopen` — Admin only.
- Update `TimeEntryPolicy::update`/`delete`: deny if the entry's `timesheet_id` is set and that timesheet's status is not `revision_requested` (i.e., entries linked to a `submitted`/`approved`/`rejected` timesheet are locked).
- `TimesheetController`: `index` (own timesheets), `show`, `store` (submit — validates entries exist for the date, creates or reuses the `(user_id, date)` row, sets `timesheet_id` on that date's entries), `teamIndex` (submitted timesheets visible to the acting Supervisor/Admin), `approve`, `reject`, `requestRevision`, `reopen`. Each review action (including reopen) creates a `TimesheetComment` row and fires the relevant notification.
- Notification classes (database channel): `TimesheetSubmitted` (to the relevant Supervisor(s)/Admin), `TimesheetApproved`, `TimesheetRejected`, `TimesheetRevisionRequested` (to the employee), `TimesheetReopened` (to the employee, and to the reviewer who originally approved it, if different from the reopening Admin).
- `NotificationController`: `index` (own notifications), `markRead`.
- Routes: `/api/timesheets` (+ `/team`, `/{id}/approve`, `/{id}/reject`, `/{id}/request-revision`, `/{id}/reopen`) and `/api/notifications` (+ `/{id}/read`), under the existing `auth:sanctum` + `active` group.
- Factories: `TimesheetFactory`, `TimesheetCommentFactory`.
- Feature tests: submit creates/locks entries; cannot submit an empty date; cannot submit someone else's date; Supervisor sees only their department's submissions; Supervisor/Admin cannot review their own timesheet; approve/reject/request-revision each create a comment and a notification; revision request unlocks entries for editing; resubmission reuses the same timesheet row; only Admin can reopen an approved timesheet; locked entries reject update/delete via `TimeEntryPolicy`.

## Frontend Backlog

- `types/timesheet.ts`: `Timesheet`, `TimesheetComment`, submission/review payload types.
- `types/notification.ts`: `AppNotification` type.
- `lib/timesheetApi.ts`: `listMyTimesheets`, `getTimesheet`, `submitTimesheet`, `listTeamTimesheets`, `approveTimesheet`, `rejectTimesheet`, `requestRevision`, `reopenTimesheet`.
- `lib/notificationApi.ts`: `listNotifications`, `markNotificationRead`.
- Update `TimeTrackingPage.tsx`: group the entries list by date with a per-date status badge and a "Submit Timesheet" button (enabled only when that date has no timesheet yet, or is `revision_requested`); show supervisor comments inline for a rejected/revision-requested date; disable Edit/Delete on entries whose timesheet is locked (mirrors the backend policy).
- `pages/TeamTimesheetsPage.tsx` (new, visible to Supervisor and Admin roles — not `AdminRoute`, a new role check): list of submitted timesheets awaiting review, each showing the employee, date, linked entries, and Approve / Reject / Request Revision actions with a comment field.
- `pages/NotificationsPage.tsx` (new, visible to every role): list of the user's notifications with a "Mark read" action.
- `components/SupervisorRoute.tsx` (new): role-gated route wrapper for Supervisor-or-Admin, following the `AdminRoute` pattern.
- Update `AppLayout`: add "Team Timesheets" (Supervisor/Admin only) and "Notifications" (everyone) nav links.
- Update `App.tsx`: add `/team-timesheets` (under `SupervisorRoute`) and `/notifications` routes.
- Vitest + RTL tests for the new API functions, `TeamTimesheetsPage`, `NotificationsPage`, `SupervisorRoute`, and the updated `TimeTrackingPage` submission/lock behavior.

## Acceptance Criteria

Sprint 5 is complete when:

- An Employee can submit a day's time entries as a timesheet; submission fails if that date has no entries.
- Once submitted, that date's entries cannot be edited or deleted by the owner (server-enforced, not just hidden in the UI) until revision is requested.
- A Supervisor sees only submitted timesheets from their own department; an Admin sees all.
- Approve, reject, and request-revision each require (or allow, for approve) a comment, and every comment is preserved and visible later — never overwritten.
- A revision-requested timesheet's entries become editable again; resubmitting reuses the same timesheet record.
- Nobody can review their own timesheet, even as a Supervisor or Admin.
- Only an Admin can reopen a finally-approved timesheet.
- Submit, approve, reject, request-revision, and reopen each generate an in-app notification to the correct recipient, visible on the Notifications page and markable as read.
- All new backend and frontend logic has test coverage.
- No KPI, payroll, dashboard, report, AI, attachment, or scrum code exists.

## Deliverables

- Backend: 3 migrations (+ notifications stub), 2 models, 1 policy + 1 policy update, 1 service/validation layer, 2 controllers, 5 notification classes, factories, feature tests.
- Frontend: 2 new pages, 1 new route guard, updated `TimeTrackingPage`, 2 new API clients + types, nav/routing updates, Vitest tests.
- This file (`sprints/SPRINT_05.md`).

## Implementation Order

1. Backend: migrations (`time_entries` additions → `timesheets` → `timesheet_comments` → notifications stub) → models → `TimesheetPolicy` → `TimeEntryPolicy` lock update → `TimesheetController` (submit first, then review actions, then team index) → notification classes wired into controller actions → `NotificationController` → routes → factories → tests. Run `php artisan test`.
2. Frontend: types → `timesheetApi`/`notificationApi` → `SupervisorRoute` → `TeamTimesheetsPage` → `NotificationsPage` → `TimeTrackingPage` updates → nav/routing.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: submit a day's entries → confirm entries lock → log in as that user's department Supervisor → see the submission → reject with a comment → confirm employee sees the comment and entries unlock → edit and resubmit → approve → confirm entries stay locked and a notification appeared at each step → confirm a different-department Supervisor cannot see or act on it → confirm only Admin can reopen the approved timesheet.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-4: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- Manual testing needs at least two users in the same department with different roles (Employee + Supervisor) — create/assign via the Sprint 2 admin UI if not already present.

## Risks

- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0.
- This sprint changes `TimeEntryPolicy` behavior from Sprint 4 (previously: owner can always edit/delete). Existing Sprint 4 tests asserting unconditional owner-edit rights will need updating to account for the locked state — expected, not a regression.
- Deferring KPI linkage (Decision 2) means the KPI Management sprint, when built, must explicitly revisit and modify timesheet approval — flagging this now so it isn't forgotten.
- Supervisors with no assigned department, or users with no department, have nobody positioned to review their timesheets except Admin — an acceptable fallback given Sprint 1's existing department-based team model, not a new gap introduced here.

## Validation Checklist

- Confirm no KPI, payroll, dashboard, report, AI, attachment, or scrum code was implemented.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm locked entries reject edit/delete at the API level (not just UI-hidden).
- Confirm a Supervisor genuinely cannot see or act on another department's timesheets (test via API, not just hidden in UI).
- Confirm comments are never overwritten — each review action adds a new row.
- Confirm no secrets are committed.

## Manual Testing Plan

1. Log in as an Employee with time entries logged today; go to Time Tracking, submit today's timesheet.
2. Confirm today's entries can no longer be edited/deleted.
3. Log in as that Employee's department Supervisor; go to Team Timesheets; confirm the submission appears.
4. Reject it with a comment; log back in as the Employee; confirm the comment is visible and today's entries are editable again.
5. Edit an entry and resubmit; log in as the Supervisor again; confirm the same timesheet now shows both the old and new comments (history preserved) once a second review action is taken.
6. Approve it; confirm entries stay locked and the Employee sees an approval notification.
7. Log in as a Supervisor from a *different* department; confirm they cannot see or act on this timesheet.
8. Log in as the seeded Admin; confirm the approved timesheet can be reopened, and that a non-admin cannot reopen it. Confirm the employee (and original reviewer, if different) receive a reopened notification.
9. Check the Notifications page for each role at each step above (submitted, approved, rejected, revision requested, reopened); mark one as read.

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
- All automated validation commands pass, including updated Sprint 4 `TimeEntryPolicy` tests reflecting the new locked state.
- Manual Testing Plan executed and results recorded in the sprint review (PASS/FAIL), noting explicitly if MySQL was unreachable and manual steps were skipped as a result.
- No modules outside Smart Timesheet/Approval Foundation were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched by implementation (the eight Confirmed Decisions are already recorded as approved before implementation begins, same as prior sprints).

## Code Generation Prompt

Use this only after Sprint 5 is approved:

```text
Implement Sprint 5 only.

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

Objective:
Build Smart Timesheet submission and Supervisor Approval foundation:
per-day timesheet submission that locks time entries, department-scoped
Supervisor (and Admin) review with permanently-retained comments,
admin-only reopen of approved timesheets, and in-app notifications on
every transition (submitted, approved, rejected, revision requested,
reopened — five trigger events).

Constraints:
- Do not implement KPI linkage, payroll computation, dashboards,
  reports, AI, attachments, or daily scrum.
- Do not build field-level "flagged" revision requests — whole-day
  reopen only.
- Do not add email notifications or a nav notification badge.
- Do not resolve docs/QUESTIONS.md Section Q or the flagged P sub-items.
- Update Sprint 4's TimeEntryPolicy and its tests to reflect the new
  locked-entry behavior; this is an expected, approved change, not a
  regression.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migrations, models, policies (new + updated), controllers,
  notification classes, routes, factories, and feature tests (backend)
- TeamTimesheetsPage, NotificationsPage, SupervisorRoute, updated
  TimeTrackingPage, API clients/types, nav/routing updates (frontend)
- PASS or FAIL Sprint 5 review
```

## Validation Prompt

```text
Validate Sprint 5.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether locked time entries genuinely reject edit/delete server-side
- Whether Supervisor visibility is genuinely department-scoped, not
  just hidden in the UI
- Whether supervisor comments are preserved as history, never overwritten
- Whether self-review is genuinely blocked
- Whether any unapproved business features (especially KPI linkage)
  were implemented
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

Give final approval ("approved", "proceed", or "implement") to begin Sprint 5 implementation.
