# TimeForge Local Development Setup

This document covers Sprint 0 (project foundation), Sprint 1 (Authentication And Role Foundation), Sprint 2 (Admin User And Department Management UI), Sprint 3 (Client And Project Management Foundation), Sprint 4 (Time Tracking Foundation), Sprint 5 (Smart Timesheet Submission And Supervisor Approval Foundation), Sprint 6 (KPI Management Foundation), Sprint 7 (Daily Scrum Reporting Foundation), and Sprint 8 (Payroll Preparation Foundation). No other business modules (AI, dashboards, reports, attachments) exist yet.

## Prerequisites

| Tool | Status on this machine | Notes |
| --- | --- | --- |
| PHP 8.5 | Installed via Homebrew (`brew install php`) | Required for Laravel. |
| Composer 2.10 | Installed via Homebrew (`brew install composer`) | Required for Laravel. |
| Node.js 22 / npm 10 | Already present | Required for Vite/React. |
| Docker Desktop | **Not installed** | Deferred by project decision. Install manually from docker.com when ready to run `docker-compose.yml`. |
| MySQL | **Not installed locally** | Intended to run via the `mysql` service in `docker-compose.yml` once Docker Desktop is installed. |
| Redis | **Not installed locally** | Intended to run via the `redis` service in `docker-compose.yml` (required for Laravel Horizon). |

## Option A: Run Backend/Frontend Directly On The Host

### Backend (`backend/`)

```bash
cd backend
composer install          # already run during scaffolding; re-run after pulling new commits
cp .env.example .env      # if .env does not already exist
php artisan key:generate  # already run during scaffolding
php artisan migrate       # requires a reachable MySQL database — see Option B if none is running
php artisan serve         # http://localhost:8000
```

The default `.env` is configured for MySQL (`DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=timeforge`, `DB_USERNAME=timeforge`, `DB_PASSWORD=secret`) and Redis-backed queues (`QUEUE_CONNECTION=redis`), matching the services defined in `docker-compose.yml`. Without a running MySQL/Redis instance, `php artisan migrate` and queue commands will fail to connect — this is expected until Option B is available. `php artisan test` does not require a live database; PHPUnit is configured to use an in-memory SQLite connection for tests.

`FRONTEND_URL` (default `http://localhost:5173`) tells the backend where the React SPA lives, so password-reset emails link to the SPA's `/reset-password/:token` page instead of a Laravel-named web route (this app is API-only, so no such route exists).

After migrating, seed the database to create the one bootstrap account (see "Seeded Admin Account" below):

```bash
php artisan db:seed
```

### Frontend (`frontend/`)

```bash
cd frontend
cp .env.example .env   # sets VITE_API_URL=http://localhost:8000
npm install             # already run during scaffolding; re-run after pulling new commits
npm run dev             # http://localhost:5173
```

## Seeded Admin Account

Only a System Administrator can create other users (`docs/DECISIONS.md`), so `DatabaseSeeder` creates exactly one bootstrap Admin account:

- Email: `admin@timeforge.test`
- Password: `password`

**Development only.** Do not use these credentials, or this seeder, against a production database.

## Testing The Auth Flow And Admin UI Manually

Once MySQL is reachable (Option B, or a locally installed MySQL) and both apps are running:

1. Log in at `http://localhost:5173/login` with the seeded Admin credentials.
2. You should land on `/` and see "Welcome, TimeForge Admin (admin)", with a top nav showing Home, Manage Users, Manage Departments, Manage Clients, and Manage Projects (admin-only links) plus a Log out button.
3. Go to Manage Departments; create a department (e.g., "Engineering").
4. Go to Manage Users; click Create User, fill in name/email/initial password/role/department, and submit. Confirm the new user appears in the list with status `pending`.
5. Click Activate on that user; confirm the status updates to `active` without a page reload.
6. Click Edit on that user; change their role or department and save; confirm the list reflects the change.
7. Click Deactivate on that user; confirm a browser confirmation dialog appears, and the status updates to `deactivated` after confirming.
8. Try deleting a department that still has a user assigned to it; confirm the browser dialog names how many users will be unassigned.
9. Go to Manage Clients; create a client (e.g., "Acme Corp").
10. Go to Manage Projects; create a project (e.g., "Website Redesign") and assign it to "Acme Corp"; confirm the list shows "Acme Corp" as its client.
11. Return to Manage Clients; confirm it shows 1 project for "Acme Corp". Delete "Acme Corp"; confirm the warning names 1 affected project, and that the project still exists afterward with no client.
12. Log out via the nav bar; confirm you're redirected to `/login`.
13. Log in as a non-admin user and confirm navigating directly to `/admin/users`, `/admin/clients`, or `/admin/projects` redirects you back to `/`.

## Testing Time Tracking Manually

Every authenticated role (not just Admin) has access to the "Time Tracking" nav link and page:

1. Log in as any active user (Admin or otherwise) and click "Time Tracking" in the nav bar.
2. Start a timer: fill in Task/Work Category/Description (project/client optional), click "Start Timer". Confirm the elapsed-time display starts counting up and the Start form is replaced by a running-timer view with a "Stop" button.
3. Click "Stop"; confirm the entry appears in "My Time Entries" with a computed duration, and the Timer section reverts to the Start form.
4. Add a manual entry via the "Add Manual Time Entry" form (date, start, end, project, task, category, description, optional reference links/deliverables — one per line). Confirm it appears in the list.
5. Try adding a manual entry that overlaps an existing one; confirm it's rejected with an error message.
6. Try adding a manual entry dated tomorrow; confirm it's rejected.
7. Start a timer, then try starting a second one before stopping the first; confirm it's rejected.
8. Confirm the summary panel shows correct Today / This Week / This Month / Payroll Period totals, and that Edit/Delete are disabled for the currently-running entry (only available once stopped).
9. Log in as a second user; confirm they cannot see the first user's time entries (via the UI or by calling `GET /api/time-entries` directly with their own token).

## Testing Smart Timesheet Submission And Supervisor Approval Manually

You need at least two users in the same department with different roles (Employee + Supervisor), plus the seeded Admin — create/assign via the Sprint 2 admin UI if not already present.

1. Log in as the Employee; go to Time Tracking; log some time for today (timer or manual entry).
2. Under "My Time Entries", find today's date group; confirm it shows "Status: not submitted" and a "Submit Timesheet" button.
3. Click "Submit Timesheet"; confirm the status changes to `submitted` and Edit/Delete on that date's entries become disabled.
4. Log out; log in as that Employee's department Supervisor; click "Team Timesheets" in the nav; confirm the submission appears with the employee's name, date, and linked entries.
5. Type a comment and click "Reject"; confirm it requires a comment (try submitting empty first).
6. Log back in as the Employee; confirm the rejection comment is visible under that date's entries, but the entries remain locked (rejection is terminal for MVP — only Supervisor/Admin actions unlock).
7. Repeat steps 1-4 with a fresh date, but this time click "Request Revision" with a comment instead of Reject.
8. Log back in as the Employee; confirm the comment is visible AND that date's entries are now editable again. Edit one, then click "Submit Timesheet" again for that same date.
9. Log in as the Supervisor; approve it with a comment; confirm entries stay locked and the comment history shows both the revision-request and approval comments (not overwritten).
10. Log in as a Supervisor from a *different* department; confirm "Team Timesheets" shows none of the above.
11. Log in as the seeded Admin; go to Team Timesheets; confirm the approved timesheet is visible with a "Reopen" button (Supervisors do not see this button); reopen it with a comment; confirm status returns to `revision_requested` and entries unlock again.
12. Check the "Notifications" page for each role at each step above (submitted, approved, rejected, revision requested, reopened); mark one as read.

## Testing KPI Management Manually

You need the same two-user setup as above (Employee + their department Supervisor), plus the seeded Admin.

1. Log in as the seeded Admin; go to "Manage KPIs"; create a KPI (e.g., name "Bugs Resolved", target 10, unit "bugs").
2. Log in as the Supervisor; go to "Team KPIs"; assign "Bugs Resolved" to the Employee (select the KPI, "Assign to a person", pick them from the list). Confirm it appears in the table with progress `0 / 10 bugs`.
3. Also assign "Bugs Resolved" directly to your own department ("Assign to my department"); confirm a second row appears showing the department name.
4. Log in as the Employee; go to "Time Tracking"; add a manual entry (or use the timer) and pick "Bugs Resolved" from the KPI dropdown — confirm you see both your individual assignment and the department's assignment as separate options — enter a progress value (e.g., 3).
5. Go to "My KPIs"; confirm the assignment is listed but progress is still `0 / 10 bugs` (progress has not been credited yet — only submission/approval trigger it).
6. Submit that day's timesheet; confirm progress is still `0`.
7. Log in as the Supervisor; go to "Team Timesheets"; approve it. Confirm progress now shows `3 / 10 bugs` on both "Team KPIs" (Supervisor) and "My KPIs" (Employee, after logging back in).
8. Log in as the Admin; reopen that timesheet from "Team Timesheets"; confirm progress does not change. Have the Employee resubmit without editing the KPI fields, then have the Supervisor re-approve; confirm progress is still `3 / 10 bugs` (not `6`) — this is the double-counting protection.
9. Log in as a Supervisor from a different department; confirm "Team KPIs" does not show the assignment above, and that attempting to assign a KPI to a user or department outside their own department is rejected.
10. As the Supervisor, remove one of the assignments via "Remove" on "Team KPIs"; confirm it disappears from both "Team KPIs" and the Employee's "My KPIs".

## Testing Daily Scrum Manually

You need the same two-user setup as above (Employee + their department Supervisor), plus the seeded Admin.

1. Log in as the Employee; go to "Daily Scrum"; submit today's entry (previous work, planned work, a blocker, a note).
2. Edit the entry (change the previous-work text) and save; confirm the change persists.
3. Log in as that Employee's department Supervisor; go to "Team Scrum"; confirm the entry appears with the employee's name, date, and blocker visible.
4. Add a comment; confirm it's saved.
5. Log in as the Employee; go to "Daily Scrum"; confirm the comment is visible under that date's entry, and that the form for today is now disabled with a "reviewed and can no longer be edited" message.
6. Log in as the Supervisor; add a second comment to the same entry; confirm both comments are retained (not overwritten).
7. Log in as a Supervisor from a *different* department; confirm the entry does not appear in their "Team Scrum" view, and that commenting on it directly via the API is rejected.
8. Log in as the seeded Admin; confirm every department's entries are visible in "Team Scrum" and commentable.
9. Confirm an Employee has no way to comment on their own entry (no comment box appears on "Daily Scrum").

## Testing Payroll Preparation Manually

You need an Employee, their department Supervisor, the seeded Admin, and an HR/Finance user (create one via Manage Users with role "hr_finance" — this role has existed since Sprint 1 but had no permissions until this sprint).

1. Log in as the seeded Admin; go to Manage Users; edit the Employee; set their Hourly Rate (e.g., 20.00); save.
2. Log in as the Employee; log an 8-hour manual entry for one day and a 10-hour manual entry for a different day within the same payroll period (1st-15th or 16th-end of month); submit both days' timesheets.
3. Log in as the Supervisor; approve both submitted timesheets.
4. Log in as the HR/Finance user; go to "Payroll"; confirm the Employee's row shows Approved Hrs `18.00`, Overtime Hrs `2.00`, an Estimated Payroll of `(16 x $20) + (2 x $20 x 1.25) = $370.00`, and Attendance `2`.
5. Log a third day's time but leave its timesheet unsubmitted (or submitted but not yet approved), and get a fourth day's timesheet rejected by the Supervisor; confirm those hours appear under Pending Hrs / Rejected Hrs, not Approved Hrs.
6. Change the date picker to a date in a different payroll period; confirm the numbers reset to reflect only that period.
7. Log in as the Admin; go to "Payroll"; confirm the same table is visible.
8. Log in as the Supervisor and then as the Employee; confirm neither sees a "Payroll" nav link, and that calling `GET /api/payroll` directly with their token returns 403.

## Option B: Run Everything Via Docker (Once Docker Desktop Is Installed)

```bash
docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```

- Backend (via nginx): http://localhost:8000
- Frontend (Vite dev server): http://localhost:5173
- MySQL: localhost:3306 (user `timeforge` / password `secret` / database `timeforge`)
- Redis: localhost:6379

This has not been run or validated on this machine yet because Docker Desktop is not installed. `docker-compose.yml` has been checked for valid YAML syntax only.

Laravel Horizon (queue dashboard) is not started automatically. Once queue-driven features exist in a later sprint, start it manually inside the app container: `docker compose exec app php artisan horizon`.

## Validation Commands

Run these after any change to confirm the foundation still works:

```bash
# Backend
cd backend
php artisan test

# Frontend
cd frontend
npm run build
npm run lint
npm run test
```

## Known Deferred Items

These are intentionally out of scope so far and must not be assumed when their sprint is reached — see `docs/QUESTIONS.md` Section Q, and the flagged sub-items in Section P:

- Dashboard role-scoping and refresh behavior.
- Attachment malware scanning and retention period. Attachment upload/storage itself is not implemented yet (Sprint 4 deferred it entirely — see `docs/DECISIONS.md` Sprint 4 decisions).
- Docker Desktop installation and container validation (`docker compose up`).
- Production deployment target and CI/CD.
- Employee-to-project assignment restrictions (currently: any employee may reference any project — see `docs/DECISIONS.md` Sprint 3 decisions).
- HR/Finance can now view live payroll summaries (Sprint 8), but still cannot view raw Timesheet records directly (e.g., `GET /api/timesheets/team` remains Supervisor/Admin-only, unchanged from Sprint 5) — only the computed payroll numbers are exposed. Direct timesheet-record visibility for HR/Finance, if needed, is a future follow-up.
- Field-level "flagged" revision requests — revision request reopens the whole day's entries, not specific fields.
- Email notifications and a nav notification bell/badge — only a "Notifications" list page exists for now.
- Rejected timesheets are currently terminal (no owner resubmission path) — only "Request Revision" reopens entries for editing. This is a faithful implementation of the approved decisions but a known usability gap worth revisiting if it proves too restrictive in practice.
- KPI Productivity Dashboards (charts, real-time visualizations) — Sprint 6 only exposes plain numeric progress; see `docs/DECISIONS.md` Sprint 6 decisions.
- KPI role-based and project-based assignment, periodic KPI resets, and automatic KPI-progress reversal on timesheet reopen — all explicitly deferred by Sprint 6 decisions.
- KPI progress can become stale relative to an entry's edited value if an approved timesheet is reopened and the employee changes the reported progress afterward, since progress is only credited once (via `kpi_progress_applied_at`) and never re-evaluated. A documented Sprint 6 limitation, not a bug.
- Daily Scrum has no approval workflow, no notification events, no linkage to time entries/timesheets/KPIs, and no automated (or AI-based) recurring-blocker detection — all explicitly deferred by Sprint 7 decisions. A Supervisor's team view lists blockers in plain text only; spotting patterns is a manual human task for MVP.
- Employees cannot reply/comment on their own Daily Scrum entries in MVP — only Supervisors/Admins comment. A documented Sprint 7 limitation, not a bug.
- PDF/Excel export, stored/historical payroll reports, queue-based report generation, and the "payroll report ready" notification event — all deferred to a future Reporting And Exports sprint; Sprint 8 only exposes live-computed payroll data as JSON and an in-app table. See `docs/DECISIONS.md` Sprint 8 decisions.
- Payroll periods are fixed semi-monthly (1st-15th, 16th-end of month) with no admin-configurable period length; the overtime multiplier is a single global `config('payroll.overtime_multiplier')` value (`.env`-overridable), not a per-employee override or in-app settings screen — all explicitly deferred by Sprint 8 decisions.
- Supervisors and Employees cannot view payroll data in Sprint 8 — only Admin and HR/Finance can. This is narrower than every other module's Supervisor-sees-own-department default, because neither the PRD nor `docs/DECISIONS.md` names Supervisors as payroll viewers (only as report exporters, a separate deferred feature).
- Taxes, deductions, benefits, and allowances remain out of scope for MVP, as already decided prior to Sprint 8.
