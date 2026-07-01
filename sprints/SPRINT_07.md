# Sprint 7 - Daily Scrum Reporting Foundation

## Sprint Goal

Build the Daily Scrum module (PRD §7.3): a structured daily standup replacement where employees report previous-day work, today's plan, blockers, and notes; Supervisors review, comment, and manually scan for recurring operational issues. No approval workflow, no KPI/timesheet linkage, no AI.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Authentication, users, departments, projects, time tracking, timesheet submission/approval, and KPI foundation all exist (Sprints 1-6). Daily Scrum is the next PRD module with fully resolved decisions already on record (`docs/DECISIONS.md` "Daily Scrum", `docs/QUESTIONS.md` Section H — RESOLVED) and no dependency on any module that doesn't exist yet. It is architecturally simpler than Timesheet approval (no state machine) and independent of KPI/payroll, making it a clean next increment.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`, "Daily Scrum":

- One daily scrum submission expected per workday.
- Employees can edit their scrum entry before supervisor review.
- Supervisors comment on scrum entries; formal approval is not required in MVP.
- Recurring blocker detection is manual for MVP; AI detection deferred.

From `docs/PRD.md` §7.3, each submission must capture:

- Work completed during the previous working day
- Planned activities for the current day
- Existing blockers or issues
- Additional notes requiring supervisor attention

And Supervisors must be able to: review submissions, provide comments, monitor recurring operational issues.

## Hard Constraint From An Already-Locked Decision

`docs/DECISIONS.md` "Notifications" already locks the full notification trigger list: "timesheet submitted, approved, rejected, revision requested, payroll report ready." Daily scrum submission/comments are **not** on that list. Sprint 7 does not add any new notification type — this was recorded explicitly as Confirmed Decision 9 below rather than left as an implicit assumption.

## Current Architecture This Sprint Builds On

- `TimeEntry::isLocked()` (Sprint 5) derives lock state from a related record's status rather than storing a separate boolean — the template for how a scrum entry's lock state is derived here too (see Confirmed Decision 1).
- `TimesheetPolicy`'s owner-or-department-scoped-reviewer-or-admin pattern (Sprint 5) is the direct template for `DailyScrumPolicy`.
- `TimesheetController::teamIndex()`'s Admin-sees-all / Supervisor-sees-own-department / else-403 branching (Sprint 5, reused again in Sprint 6's `KpiAssignmentController::team()` and `TeamMemberController::index()`) is the established, repeated pattern for `DailyScrumController::teamIndex()`.
- `TimesheetComment` (a permanent history table, not an overwritable field) is the template for `ScrumComment` — except simpler, since there is no `action` enum (no state transitions here).
- `Timesheet::firstOrNew(['user_id'=>.., 'date'=>..])` (Sprint 5's submit/resubmit upsert) is the template for `DailyScrum`'s one-row-per-workday upsert.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 7 Implementation Decisions (Approved)". The notifications guardrail (previously called out separately as a "Hard Constraint") is now recorded as Decision 9 alongside the others.

1. **Lock mechanism:** A scrum entry locks for employee edits once it has at least one Supervisor/Admin comment — derived from `comments()->exists()`, not a separate `reviewed_at` flag. This mirrors `TimeEntry::isLocked()`'s "derive, don't store" pattern and is the simplest reading of the decision text: the first comment *is* the review.
2. **Employee replies:** Only Supervisors (own department) or Admins (any) can comment — matching "Supervisors must be able to... provide comments" (PRD) and "Supervisors comment on scrum entries" (Decisions). Employees cannot reply/comment on their own entries in MVP.
3. **Comment history:** A permanent, append-only comment history (`scrum_comments` table), not a single overwritable remarks field — same reasoning as Sprint 5's `TimesheetComment`, so an ongoing conversation isn't destructively overwritten.
4. **Entry date:** The API accepts an explicit `date` field (validated non-future, same `before_or_equal:today` rule as time entries), even though the UI's primary flow only ever submits "today." This matches the existing TimeEntry/Timesheet API design rather than hardcoding "today" server-side, and allows a Supervisor to still see yesterday's entry that was submitted late in the day. One entry per `(user_id, date)` is enforced via a unique constraint plus upsert, mirroring the one-timesheet-per-day rule.
5. **Approval workflow:** No approve/reject/revision-request states. Comments are the only Supervisor action — a direct, literal implementation of "formal approval is not required in MVP."
6. **Blocker detection:** The Supervisor's team view lists blockers in plain text, sorted so a human can visually scan across entries/employees; no tagging, keyword-matching, frequency counting, or AI. Matches "manual for MVP; AI detection deferred" exactly.
7. **Linkage:** Daily Scrum is a standalone narrative report for MVP. Neither the PRD nor `docs/DECISIONS.md` establishes any cross-module linkage, so none is invented.
8. **Visibility:** Employees see only their own entries; Supervisors see their whole department's; Admins see all — identical to the Timesheet and KPI visibility pattern already established in Sprints 5-6.
9. **Notifications:** No new notification trigger event is added. The locked Notifications decision's trigger list ("timesheet submitted, approved, rejected, revision requested, payroll report ready") does not include daily scrum events, and Sprint 7 does not expand it.

## User Stories

1. As an Employee, I want to submit today's scrum entry (previous work, today's plan, blockers, notes).
2. As an Employee, I want to edit my entry until a Supervisor has commented on it.
3. As a Supervisor, I want to see my department's scrum entries and comment on them.
4. As a Supervisor, I want to visually scan blockers across my team's entries to notice recurring issues myself.
5. As an Admin, I want to see every department's scrum entries.
6. As an Employee, I want to see any Supervisor comments on my own past entries.

## Explicitly Out Of Scope This Sprint

- Any approve/reject/revision-request workflow for scrum entries (Confirmed Decision 5).
- Automated recurring-blocker detection or AI-generated summaries (Confirmed Decision 6; PRD §7.9 AI Integration is a separate future sprint).
- Any new notification trigger event (Confirmed Decision 9).
- Linkage between scrum entries and time entries, timesheets, or KPIs (Confirmed Decision 7).
- Employee comments/replies on their own entries (Confirmed Decision 2).
- Dashboards, payroll, reports, attachments.
- `docs/QUESTIONS.md` Section H is already RESOLVED and is not reopened; other sections remain untouched.

## Backend Backlog

- Migration: create `daily_scrums` table — `id`, `user_id` (FK, cascadeOnDelete), `date`, `previous_work` (text), `planned_work` (text), `blockers` (nullable text), `notes` (nullable text), timestamps; unique (`user_id`, `date`).
- Migration: create `scrum_comments` table — `id`, `daily_scrum_id` (FK, cascadeOnDelete), `author_id` (FK to `users`, cascadeOnDelete), `comment` (text), timestamps.
- `DailyScrum` model: `belongsTo` User, `hasMany` ScrumComment (`->latest()`); `isLocked(): bool` returns `$this->comments()->exists()`.
- `ScrumComment` model: `belongsTo` DailyScrum, `belongsTo` User (author).
- `DailyScrumPolicy`: `view` — owner or department-scoped-reviewer-or-admin (same `isReviewerFor()` shape as `TimesheetPolicy`); `create`/`update` — owner and not locked.
- `StoreDailyScrumRequest`: `date` required, `before_or_equal:today`; `previous_work`/`planned_work` required strings; `blockers`/`notes` nullable strings; custom check aborting if the existing row for that date is already locked.
- `StoreScrumCommentRequest`: `comment` required string; `authorize()` via a department-scoped-reviewer check (reusing the same shape as `ApproveTimesheetRequest`'s authorization, minus the state-transition guard since there is no state machine).
- `DailyScrumController`: `index` (own entries, newest first), `teamIndex` (Admin all / Supervisor own department / else 403), `show`, `store` (upsert by `(user_id, date)`, 422 if locked).
- `ScrumCommentController` (or a `comment()` action on `DailyScrumController`): `store` — creates a `ScrumComment`.
- Routes: `GET /daily-scrums`, `GET /daily-scrums/team`, `POST /daily-scrums`, `GET /daily-scrums/{dailyScrum}`, `POST /daily-scrums/{dailyScrum}/comments` (registered so `/team` resolves before the `{dailyScrum}` wildcard, same ordering discipline as every prior sprint).
- Factories: `DailyScrumFactory`, `ScrumCommentFactory`.
- Feature tests: one-entry-per-day upsert; cannot submit for a future date; entry editable until a comment exists, then locked (owner's further `store` calls for that date rejected); only Supervisor(own dept)/Admin can comment; Supervisor cannot view or comment on another department's entries; Admin sees/comments on any; Employee cannot comment at all.

## Frontend Backlog

- `types/scrum.ts`: `DailyScrum`, `ScrumComment`, `SubmitScrumPayload`, `AddScrumCommentPayload`.
- `lib/scrumApi.ts`: `listMyScrums`, `getScrum`, `submitScrum`, `listTeamScrums`, `addScrumComment`.
- `pages/DailyScrumPage.tsx` (every role): a submit/edit form for today's entry (previous work, planned work, blockers, notes), disabled once locked, plus a list of the user's past entries showing any Supervisor comments.
- `pages/TeamScrumPage.tsx` (Supervisor/Admin, under `SupervisorRoute`): list of the team's (or, for Admin, everyone's) scrum entries sorted newest-first, blockers rendered plainly and visibly, with a comment box per entry.
- Update `AppLayout`: add "Daily Scrum" (everyone) and "Team Scrum" (Supervisor/Admin) nav links.
- Update `App.tsx`: add `/daily-scrum` and `/team-scrum` (under `SupervisorRoute`) routes.
- Vitest + RTL tests for `scrumApi.ts` and both new pages.

## Acceptance Criteria

Sprint 7 is complete when:

- An Employee can submit and edit today's scrum entry until a Supervisor/Admin comments on it.
- Attempting to edit a commented-on entry is rejected (backend) and disabled (frontend).
- A Supervisor can view and comment on their department's entries only; an Admin can view/comment on any.
- An Employee cannot comment on any entry, including their own.
- Blockers are visible in the Supervisor/Admin team view without any automated analysis.
- No new notification events, no approval workflow, no cross-module linkage exist.
- All new backend and frontend logic has test coverage.

## Deliverables

- Backend: 2 migrations, 2 models, 1 policy, 2 Form Requests, 1-2 controllers, factories, feature tests.
- Frontend: 2 new pages, new API client + types, nav/routing updates, Vitest tests.
- This file (`sprints/SPRINT_07.md`).

## Implementation Order

1. Backend: migrations (`daily_scrums` → `scrum_comments`) → models → `DailyScrumPolicy` → Form Requests → controller(s) → routes → factories → tests. Run `php artisan test`.
2. Frontend: types → `scrumApi.ts` → `DailyScrumPage` → `TeamScrumPage` → nav/routing.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: submit today's entry as an Employee → confirm it's editable → have the department Supervisor comment on it → confirm it's now locked for the Employee → confirm a different-department Supervisor cannot see or comment on it → confirm Admin can see and comment on everything.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-6: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- Manual testing needs the same two-user-same-department setup (Employee + Supervisor) used in Sprints 5-6.

## Risks

- If "before supervisor review" is meant to describe workflow timing rather than a hard technical gate, Confirmed Decision 1's comment-triggers-lock design would be stricter than intended — flagged explicitly for override before implementation.
- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0.
- Restricting comments to Supervisor/Admin only (Confirmed Decision 2) means an Employee cannot respond to a Supervisor's comment in-app; if that proves too restrictive, it's a small, isolated follow-up (loosen the policy), not a redesign.

## Validation Checklist

- Confirm no approval workflow, dashboards, payroll, reports, AI, or scrum-to-timesheet/KPI linkage was implemented.
- Confirm no new notification trigger event was added.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm the lock check is enforced server-side (via `DailyScrumPolicy`/Form Request), not just hidden in the UI.
- Confirm Supervisor department-scoping is verified via API tests, not just UI hiding.
- Confirm no secrets are committed.

## Manual Testing Plan

1. Log in as an Employee; go to Daily Scrum; submit today's entry (previous work, planned work, a blocker, a note).
2. Edit the entry; confirm the change saves.
3. Log in as that Employee's department Supervisor; go to Team Scrum; confirm the entry appears with the blocker visible; add a comment.
4. Log in as the Employee; confirm the comment is visible and the form is now disabled/read-only for that date.
5. Log in as a Supervisor from a different department; confirm the entry does not appear in their Team Scrum view, and that calling the comment endpoint directly against it is rejected.
6. Log in as the Admin; confirm every department's entries are visible and commentable.

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
- No modules outside Daily Scrum Reporting Foundation were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched by implementation (the nine Confirmed Decisions are already recorded as approved before implementation begins, same as prior sprints).

## Code Generation Prompt

Use this only after Sprint 7 is approved:

```text
Implement Sprint 7 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_06.md
- sprints/SPRINT_07.md

Objective:
Build Daily Scrum Reporting foundation: one entry per workday
(previous work, planned work, blockers, notes), employee-editable
until a Supervisor/Admin comments, department-scoped Supervisor
review with Admin-sees-all, comment-only (no approval workflow).

Constraints:
- Do not implement any approve/reject/revision-request workflow.
- Do not implement automated blocker detection or AI.
- Do not add any new notification trigger event.
- Do not link scrum entries to time entries, timesheets, or KPIs.
- Do not allow employees to comment on their own entries.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migrations, models, policy, Form Requests, controller(s), routes,
  factories, and feature tests (backend)
- DailyScrumPage, TeamScrumPage, API client/types, nav/routing
  updates (frontend)
- PASS or FAIL Sprint 7 review
```

## Validation Prompt

```text
Validate Sprint 7.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether the lock-on-first-comment rule is enforced server-side
- Whether Supervisor visibility/comment ability is genuinely
  department-scoped, not just hidden in the UI
- Whether any unapproved business features were implemented
  (approval workflow, notifications, cross-module linkage, AI)
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

Give final approval ("approved", "proceed", or "implement") to begin Sprint 7 implementation.
