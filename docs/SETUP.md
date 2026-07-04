# TimeForge Local Development Setup

This document covers Sprint 0 (project foundation), Sprint 1 (Authentication And Role Foundation), Sprint 2 (Admin User And Department Management UI), Sprint 3 (Client And Project Management Foundation), Sprint 4 (Time Tracking Foundation), Sprint 5 (Smart Timesheet Submission And Supervisor Approval Foundation), Sprint 6 (KPI Management Foundation), Sprint 7 (Daily Scrum Reporting Foundation), Sprint 8 (Payroll Preparation Foundation), Sprint 9 (Reporting And Exports Foundation), Sprint 10 (Dashboard And Analytics Foundation), Sprint 11 (AI Integration Foundation, stub provider only), Sprint 12 (AI Analysis Suite, stub provider only), Sprint 13 (Time Entry Attachments Foundation), and Sprint 14 (Final QA And Handoff — rate limiting, demo seeder, documentation set). Every PRD business module now exists; the handoff documentation index is in `README.md`.

## Prerequisites

| Tool | Status on this machine | Notes |
| --- | --- | --- |
| PHP 8.5 | Installed via Homebrew (`brew install php`) | Required for Laravel. |
| Composer 2.10 | Installed via Homebrew (`brew install composer`) | Required for Laravel. |
| Node.js 22 / npm 10 | Already present | Required for Vite/React. |
| Docker Desktop | **Not installed** | Deferred by project decision. Install manually from docker.com when ready to run `docker-compose.yml`. |
| PostgreSQL | **Not installed locally** | Intended to run via the `postgres` service in `docker-compose.yml` once Docker Desktop is installed (Sprint 39 — moved off MySQL for dev/prod parity with Supabase-hosted Postgres). |
| Redis | **Not installed locally** | Intended to run via the `redis` service in `docker-compose.yml` (required for Laravel Horizon). |

## Option A: Run Backend/Frontend Directly On The Host

### Backend (`backend/`)

```bash
cd backend
composer install          # already run during scaffolding; re-run after pulling new commits
cp .env.example .env      # if .env does not already exist
php artisan key:generate  # already run during scaffolding
php artisan migrate       # requires a reachable Postgres database — see Option B if none is running
php artisan serve         # http://localhost:8000
```

The default `.env` is configured for Postgres (`DB_CONNECTION=pgsql`, `DB_HOST=127.0.0.1`, `DB_PORT=5432`, `DB_DATABASE=timeforge`, `DB_USERNAME=timeforge`, `DB_PASSWORD=secret`) and Redis-backed queues (`QUEUE_CONNECTION=redis`), matching the services defined in `docker-compose.yml`. Without a running Postgres/Redis instance, `php artisan migrate` and queue commands will fail to connect — this is expected until Option B is available. `php artisan test` does not require a live database; PHPUnit is configured to use an in-memory SQLite connection for tests. See `docs/DEPLOYMENT.md` for the production database (Supabase-hosted Postgres) and storage (Supabase Storage) setup.

`FRONTEND_URL` (default `http://localhost:5173`) tells the backend where the React SPA lives, so password-reset emails link to the SPA's `/reset-password/:token` page instead of a Laravel-named web route (this app is API-only, so no such route exists).

**Mail (Sprint 18, extended Sprint 36):** the default `.env` ships `MAIL_MAILER=log`, so every email — password reset, the registration OTP code, registration/approval/rejection notifications — writes to `storage/logs/laravel.log` instead of being delivered anywhere. This is deliberate for local dev/demo: zero external calls, zero mail credentials to provision. To see real inbox delivery, point the standard `MAIL_*` variables at a real or local-catch-all SMTP server (e.g. Mailpit/Mailhog), or at Google's SMTP relay (`smtp.gmail.com:587` with a Gmail address + [App Password](https://myaccount.google.com/apppasswords) — requires 2-Step Verification; see the commented block in `.env.example`) — no code changes are required, only `.env`. All five notifications (`RegistrationOtpIssued`, `RegistrationReceived`, `NewAccountRequestSubmitted`, `AccountApproved`, `AccountRejected`) send synchronously, same as every existing notification in the app — `QUEUE_CONNECTION=redis` is set and Redis is reachable via the Docker stack, but no queue worker (`php artisan queue:work` or Horizon) runs by default, so marking anything `ShouldQueue` today would mean it's enqueued and never processed. Queuing mail is a deferred, environment-dependent enhancement, not implemented here.

After migrating, seed the database to create the one bootstrap account (see "Seeded Admin Account" below):

```bash
php artisan db:seed
```

For demos and manual QA there is an optional, **dev/demo-only** dataset covering every module (two departments, one user per role, two payroll periods of reviewed time, KPIs, scrums with a recurring blocker — credentials in `docs/DEMO.md`). It is deliberately not part of the default seed:

```bash
php artisan db:seed --class=DemoDataSeeder
```

Sprint 14 added rate limiting: the public auth endpoints (`/api/login`, `/api/forgot-password`, `/api/reset-password`) allow 5 requests/minute per email+IP and authenticated API traffic 60 requests/minute per user — worth knowing if you script against the API (HTTP 429 beyond the limit).

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

Once Postgres is reachable (Option B, or a locally installed Postgres) and both apps are running:

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

## Testing Account Registration And Approval Manually

Covers the post-MVP auth/onboarding enhancement (Sprints 15–19): the landing page, self-service registration, the pending-approval gate, and the Admin approval workflow. Requires a department to already exist (create one via Manage Departments first, per the walkthrough above).

1. Log out (or open a private/incognito window) and visit `http://localhost:5173/login`. Confirm the full landing page renders — hero headline, an embedded sign-in form, a features grid, a benefits list, a static dashboard-preview graphic (labeled "Illustrative preview"), and a footer — not a bare login box.
2. In the embedded form, click the eye icon next to Password; confirm it toggles between hidden and visible text. Click "Create Account".
3. Fill in First Name, Last Name, pick a real Department from the dropdown, an email not already in use, and a password (watch the strength indicator change as you type), confirm the password, and check "I agree to the Terms and Conditions." Leave Middle Name, Employee ID, Position, and Contact Number blank. Submit.
4. Confirm a "Verify Your Email" panel replaces the form (not a redirect, not the pending-approval confirmation yet) and shows the email you registered with (Sprint 36).
5. Check `storage/logs/laravel.log` for a "Verify Your Email" message containing a 6-digit code; enter it and click "Verify Email". Confirm the panel now becomes "Registration Received" and mentions administrator approval. Try requesting a resend immediately — confirm the button is disabled with a "Resend code in Ns" countdown (60s cooldown); entering an obviously wrong code first should show "Invalid or expired code." without revealing which part was wrong.
6. Try logging in with the new account's credentials immediately; confirm it's rejected with "Your account is not active yet."
7. Check `storage/logs/laravel.log` for two more new emails, sent only after step 5's verification (not at initial submission): "Registration Received" (to the applicant) and "New Account Request" (to the seeded Admin, naming the applicant and their department).
8. Log in as the seeded Admin; confirm "Account Approvals" appears in the sidebar's Administration group. Open it; confirm the new (now-verified) request appears with the applicant's name, email, department, and any optional details you provided. An applicant who submitted but never completed OTP verification should **not** appear in this list at all.
9. Use the search box to find the request by typing part of the applicant's name, then by email; confirm both work. Use the status filter to show only "Submitted".
10. Click Approve. Confirm the row's status updates to `approved` with your name and a timestamp. Check the log for an "Account Approved" email. Log in as the applicant; confirm it now succeeds.
11. Repeat steps 1–5 with a second email address, but this time click Reject on the new request, entering an optional remark first. Confirm the status becomes `rejected` with your remark visible, and that this applicant still cannot log in. Check the log for an "Account Request Update" email containing your remark.
12. Go to Manage Users; confirm the rejected applicant shows status `deactivated` — the same status a deactivated employee would have. Click the existing Activate button on that row; confirm it works exactly as it always has (this proves the approval workflow didn't change pre-existing Activate/Deactivate behavior).
13. Try clicking Approve or Reject again on either already-decided request (e.g., via a second browser tab still showing the old state); confirm it's rejected rather than silently reapplied.
14. On the login page, submit "Forgot your password?" once with a real seeded email and once with a made-up one; confirm both show the exact same message. Check the log — only the real email produces a reset-link email.

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

## Testing Reporting And Exports Manually

Uses the same Employee/Supervisor/Admin/HR-Finance set from the Payroll walkthrough above, with the same 8-hour and 10-hour approved days already logged.

1. Log in as HR/Finance; go to "Payroll"; click "Export PDF"; confirm a PDF downloads and, when opened, shows the same numbers as the on-screen table — including the Employee's hourly rate and estimated payroll.
2. Click "Export Excel"; confirm an `.xlsx` file downloads and contains the same numbers in spreadsheet form.
3. Log in as the department Supervisor; go to "Team Timesheets"; click "Export Hours PDF" then "Export Hours Excel"; confirm both show approved/overtime/pending/rejected hours and attendance for their department only, with **no hourly rate or estimated-payroll column anywhere**.
4. Log in as a Supervisor from a different department; confirm their exported Team Hours Report only covers their own department's employees, not the first Supervisor's.
5. Confirm that second Supervisor cannot reach the Payroll Report at all: no "Payroll" nav link, and `GET /api/payroll/export/pdf` / `/export/excel` called directly return 403.
6. Log in as an Employee; confirm no export buttons appear anywhere, and all four export endpoints (`/api/payroll/export/pdf`, `/export/excel`, `/api/team-hours-report/export/pdf`, `/export/excel`) return 403 if called directly.
7. Log in as the Admin; confirm they can export both report types, for any department, exactly like HR/Finance.

## Testing Dashboard And Analytics Manually

Uses the same Employee/Supervisor/Admin/HR-Finance set and logged time from the Payroll and Reporting manual tests above (8-hour and 10-hour approved days for the Employee, in the same department as the Supervisor).

1. Log in as HR/Finance; go to "Dashboard"; confirm it's labeled "Organization-wide" and shows Total Hours `18.00`, Billable/Non-Billable hours, a Pending Approvals count, a Department Performance chart bar for the Employee's department, a Project Allocation chart, an Attendance Trend chart covering every day in the period, KPI Completion progress bars (if any KPIs are assigned), an Employee Productivity table row for the Employee, and a Payroll Summary card matching the on-screen Payroll page's totals.
2. Change the date picker to a different period; confirm every metric updates to reflect only that period.
3. Log a new time entry in another browser tab as the Employee, then click "Refresh" on the Dashboard (without changing the date); confirm the numbers update — and confirm they do *not* update automatically without clicking Refresh or reloading.
4. Log in as the department Supervisor; go to "Dashboard"; confirm it's labeled "Department: <name>", shows the same metrics scoped to that department only, and has **no Payroll Summary card anywhere**.
5. Log in as a Supervisor from a different department; confirm their Dashboard shows different numbers, scoped to their own department only.
6. Log in as an Employee; confirm no "Dashboard" nav link appears, and `GET /api/dashboard` returns 403 if called directly.
7. Log in as the Admin; confirm they see the same organization-wide view HR/Finance sees, including the Payroll Summary card.

## Testing AI Insights Manually

Uses the same Employee/Supervisor/Admin/HR-Finance set, logged time, and daily scrum entries from the earlier manual tests. No AI credentials or internet access are needed — the stub provider is fully local.

1. Log in as the Employee; open "AI Insights"; on "Daily Summary", pick a day with logged time and click Generate. Verify every number, task, project name, timesheet status, scrum detail, and KPI value in the text against the raw records, and confirm the output carries an "AI-generated" badge with provider `stub`, a timestamp, and the generator's name.
2. Click Regenerate; confirm a new version appears and the previous one moves under "Previous generations" (nothing is overwritten or deleted).
3. Still as the Employee: confirm the subject is fixed to "yourself", no "Recurring Blockers" tab exists, and `POST /api/ai-outputs` with another user's `user_id` returns 403.
4. Log in as the Supervisor; generate a "Weekly Report" for a department employee; confirm the approved/overtime/pending numbers match that week's Time Tracking/Payroll figures; confirm a cross-department `user_id` via the API returns 403.
5. As the Supervisor, open "Recurring Blockers" for a period where the same blocker text appears in scrum entries on two or more distinct days (log them first if needed); confirm the blocker is listed with its occurrence count, dates, and employee names, and that a one-off blocker is not listed as recurring.
6. Log in as the Admin; confirm all three types can be generated for any employee and any department.
7. Log in as HR/Finance; confirm "AI Insights" shows **only** the "Payroll Validation" tab (subject: entire organization — no subject picker); generate for the seeded payroll period; verify the period totals against the Payroll page, that the unrated employee is named under missing hourly rates, that pending/rejected hours match, and that unsubmitted days and open timers are reported; confirm `POST /api/ai-outputs` with any other type returns 403.
8. Log in as the Supervisor; open "KPI Analysis"; verify every assignment's progress/target/completion percentage against Team KPIs, and that "credited this period" matches the approved entries; open "Recommendations" and verify each numbered item's count (pending timesheets and the oldest date, recurring blocker text, zero-hour members, unsubmitted days, KPI assignments without targets or progress) against reality; confirm the Payroll Validation tab is absent for the Supervisor and `POST /api/ai-outputs` with `type=payroll_validation` returns 403.
9. Log in as the Employee; open "Productivity Trend"; verify each of the six periods' approved/overtime/pending numbers and the period-to-period deltas against the Payroll/Time Tracking figures; confirm another user's trend returns 403 via the API.
10. Log in as the Admin; confirm all seven tabs are present and all four Sprint 12 types generate successfully for any subject.

## Testing Time Entry Attachments Manually

Uses the same Employee/Supervisor/Admin/HR-Finance set from the earlier manual tests.

1. As the Employee, on "Time Tracking", use "Attach file" on an editable entry to add a PDF and a PNG; confirm both appear with name and size, download intact via their links, and that a `.txt` file or one over 10MB is rejected with a clear message.
2. Submit that day's timesheet; confirm "Attach file" and "Remove" disappear while the download links remain, and that direct `POST`/`DELETE` calls to `/api/time-entries/{id}/attachments/...` return 403.
3. As the Supervisor, open the submitted timesheet in "Team Timesheets"; download the attachments from the entry list; request revision; as the Employee, confirm the attachment controls are back, replace a file, and resubmit.
4. As a Supervisor from a different department and as HR/Finance, confirm the download endpoint returns 403 (and nothing renders in their views).
5. As the Admin, download any attachment; reopen an approved timesheet and confirm the owner can modify attachments again.
6. Delete an attachment while editable, then delete a whole entry that still has attachments; confirm the files are gone from `storage/app/private/time-entry-attachments/` in both cases.
7. Confirm an attachment URL under a different entry id returns 404, and that no API response anywhere contains a storage path.

## Option B: Run Everything Via Docker (Once Docker Desktop Is Installed)

```bash
docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```

- Backend (via nginx): http://localhost:8000
- Frontend (Vite dev server): http://localhost:5173
- PostgreSQL: localhost:5432 (user `timeforge` / password `secret` / database `timeforge`)
- Redis: localhost:6379

Validated on this machine as part of Sprint 39 (Postgres migration): the stack builds and starts cleanly, `migrate:fresh` and `db:seed` both run successfully against the real Postgres container, and login/`/me`/rate-limiting were smoke-tested against it directly. A full manual walkthrough of every module below has not been repeated against Postgres specifically — the automated test suite (SQLite in-memory) remains the primary regression signal.

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

These are intentionally out of scope, each backed by a recorded decision in `docs/DECISIONS.md` (every question in `docs/QUESTIONS.md` Sections A-R is now resolved). A handoff-facing summary lives in `README.md` → Known Limitations:

- Attachment malware scanning and retention period. Attachment upload/storage itself is not implemented yet (Sprint 4 deferred it entirely — see `docs/DECISIONS.md` Sprint 4 decisions).
- Docker Desktop installation and container validation (`docker compose up`).
- Production deployment target and CI/CD.
- Employee-to-project assignment restrictions (currently: any employee may reference any project — see `docs/DECISIONS.md` Sprint 3 decisions).
- HR/Finance can now view live payroll summaries (Sprint 8), but still cannot view raw Timesheet records directly (e.g., `GET /api/timesheets/team` remains Supervisor/Admin-only, unchanged from Sprint 5) — only the computed payroll numbers are exposed. Direct timesheet-record visibility for HR/Finance, if needed, is a future follow-up.
- Field-level "flagged" revision requests — revision request reopens the whole day's entries, not specific fields.
- Email notifications now exist for the auth/onboarding flow only (Sprint 18: registration received, new-request admin alert, approval, rejection, plus the pre-existing password reset; Sprint 36 added the registration OTP code) — every other module (Timesheets, Daily Scrum, KPIs) remains in-app-only via the "Notifications" list page. No nav notification bell/badge anywhere yet (that's the separate `NotificationCenter`/sidebar-badge feature, Sprint 23).
- Email verification (a code the applicant must enter before an Admin can review their registration) — explicitly considered and deferred in Sprint 18, **implemented in Sprint 36** as a 6-digit OTP step between submission and Admin visibility. `email_verified_at` on `users` is now genuinely used, not just reserved for a future sprint.
- Mail queuing was explicitly considered and deferred in Sprint 18 — `QUEUE_CONNECTION=redis` is reachable but no queue worker runs by default; all mail sends synchronously, same as every other notification in the app.
- CAPTCHA/reCAPTCHA on registration was evaluated and explicitly not implemented in Sprint 19 — no external service keys were introduced. The admin-approval gate is the primary anti-abuse control: a bot can register unlimited times and still never gain access without a human Admin approving each one. Revisit only if real registration abuse is observed.
- Password policy is currently Laravel's bare default (8-character minimum, no complexity or breach-check rule) — Sprint 19 flagged raising this as recommended but left it undecided, since the seeded demo password (`password`, 8 characters) and every QA doc referencing it would need to change too. See `docs/DECISIONS.md` → Decisions Still Required.
- No explicit `config/cors.php` allowed-origins allowlist has been published — CORS runs on Laravel's framework defaults. Sprint 19 flagged this as defense-in-depth, not urgent, given the app's stateless Bearer-token (non-cookie) auth architecture. See `docs/DECISIONS.md` → Decisions Still Required.
- Any protected API route (not specific to auth/onboarding — reproduced identically on the pre-existing `/api/dashboard`) returns an HTTP 500 instead of 401 if a request omits the `Accept: application/json` header, because Laravel's default `Authenticate` middleware tries to build a redirect to a named `login` web route that doesn't exist in this API-only app. The real frontend and every automated test always send that header, so this never triggers in normal use; severity is further bounded by `APP_DEBUG=false` in production. Found and recorded, not fixed, during the Sprint 20 QA pass (`docs/QA_RUN_2026-07-03.md`) — the fix would touch global exception handling used by every module, out of scope for an auth-only enhancement.
- Rejected timesheets are currently terminal (no owner resubmission path) — only "Request Revision" reopens entries for editing. This is a faithful implementation of the approved decisions but a known usability gap worth revisiting if it proves too restrictive in practice.
- KPI Productivity Dashboards (charts, real-time visualizations) — Sprint 6 only exposes plain numeric progress; see `docs/DECISIONS.md` Sprint 6 decisions.
- KPI role-based and project-based assignment, periodic KPI resets, and automatic KPI-progress reversal on timesheet reopen — all explicitly deferred by Sprint 6 decisions.
- KPI progress can become stale relative to an entry's edited value if an approved timesheet is reopened and the employee changes the reported progress afterward, since progress is only credited once (via `kpi_progress_applied_at`) and never re-evaluated. A documented Sprint 6 limitation, not a bug.
- Daily Scrum has no approval workflow, no notification events, no linkage to time entries/timesheets/KPIs, and no automated (or AI-based) recurring-blocker detection — all explicitly deferred by Sprint 7 decisions. A Supervisor's team view lists blockers in plain text only; spotting patterns is a manual human task for MVP.
- Employees cannot reply/comment on their own Daily Scrum entries in MVP — only Supervisors/Admins comment. A documented Sprint 7 limitation, not a bug.
- Payroll periods are fixed semi-monthly (1st-15th, 16th-end of month) with no admin-configurable period length; the overtime multiplier is a single global `config('payroll.overtime_multiplier')` value (`.env`-overridable), not a per-employee override or in-app settings screen — all explicitly deferred by Sprint 8 decisions.
- Supervisors and Employees cannot view payroll data on-screen — only Admin and HR/Finance can. This is narrower than every other module's Supervisor-sees-own-department default, because neither the PRD nor `docs/DECISIONS.md` names Supervisors as payroll viewers (only as report exporters, which Sprint 9 satisfies via the separate, non-financial Team Hours Report).
- Taxes, deductions, benefits, and allowances remain out of scope for MVP, as already decided prior to Sprint 8.
- Queue-based/asynchronous export, any stored report record, and the "payroll report ready" notification event — all explicitly deferred by Sprint 9 decisions. Every export in Sprint 9 is generated fresh, synchronously, on each request.
- No new on-screen report-preview page exists for either report type — "Export PDF"/"Export Excel" buttons were added to the existing `PayrollPage` and `TeamTimesheetsPage` instead. See `docs/DECISIONS.md` Sprint 9 decisions.
- `maatwebsite/excel` could not be installed (its pinned `phpoffice/phpspreadsheet` dependency requires `php <8.5.0`; this environment runs PHP 8.5.7). Excel export uses `phpoffice/phpspreadsheet` directly instead — the same underlying engine, used via its own API rather than the Laravel wrapper. If a future environment runs an older PHP, `maatwebsite/excel` could be reconsidered, but there's no reason to revisit this while on PHP 8.5.
- Employees do not get a Dashboard in Sprint 10 — only Supervisor (own department), Admin, and HR/Finance (organization-wide) do. Employees' own productivity monitoring remains available via the Time Tracking summary and My KPIs page, per Sprint 10's resolution of `docs/QUESTIONS.md` Section Q.
- No real-time push or scheduled background refresh for the Dashboard — data is recomputed on page load and via a manual "Refresh" button only, per Sprint 10 decisions.
- No export button on the Dashboard, no new database migrations, and no `billable` schema field — billable/non-billable is inferred from whether a time entry has a linked project/client, an heuristic with no prior precedent in the schema. All explicitly scoped by Sprint 10 decisions.
- "Employee productivity" and "department performance" use simple, literal definitions (approved hours; approved hours plus average KPI completion) rather than any weighted scoring formula, since none is defined anywhere in the PRD or decisions.
- All seven PRD §7.8 AI capabilities now exist: daily work summaries, weekly productivity reports, and recurring blocker identification (Sprint 11), plus KPI performance analysis, payroll validation, supervisor recommendations, and productivity trend analysis (Sprint 12) — every one rendered by the local stub provider.
- The AI layer is stub-only: `AI_PROVIDER` supports only `stub` (any other value throws at boot), and there are no external AI providers, credentials, HTTP clients, or network calls anywhere in `app/Ai/`. Real provider selection and external data privacy rules remain open — see `docs/DECISIONS.md` Decisions Still Required.
- AI generation is on-demand and synchronous only (Generate/Regenerate buttons). No scheduled jobs, queues, Horizon workers, or background generation, per Sprint 11's approved reading of "automatic daily work summaries".
- HR/Finance's AI Insights access is payroll validation only (opened by Sprint 12, mirroring Sprint 8 payroll visibility) — every other AI output type returns 403 for HR/Finance, and payroll validation returns 403 for Supervisors and Employees.
- AI outputs are append-only: regeneration inserts a new `ai_outputs` row carrying the full source-data JSON snapshot, provider, and prompt version; no update or delete endpoint exists. "Recurring blocker" matching is mechanical text normalization (trimmed, whitespace-collapsed, case-insensitive, on 2+ distinct days) — paraphrased blockers are not grouped; a real provider could improve that later.
- No Admin "AI configurations" UI exists yet (PRD §6.4) — AI configuration is the single `AI_PROVIDER` env value until a real provider makes a settings screen meaningful.
- Payroll validation is facts-only per Sprint 12 decisions: missing hourly rates, period totals, pending/rejected hours, unsubmitted days, open timers, and the largest approved day. No anomaly thresholds, risk scores, compliance labels, or business judgments exist — real validation rules would need sponsor definitions first.
- Productivity trend analysis covers a fixed window of six consecutive semi-monthly payroll periods; KPI performance analysis is department-scoped (no personal-subject KPI narrative yet); payroll validation rows are organization-shaped (`ai_outputs` with both subject foreign keys null). All per Sprint 12 decisions.
- No attachment malware scanning — an accepted Sprint 13 MVP risk with compensating controls (extension + server-detected MIME allowlist, 10MB cap, private non-web-served storage with hashed names, authorized download-only access), to be revisited at deployment/security hardening. Attachments are retained indefinitely as audit evidence; no purge jobs or retention scheduler exist.
- Attachments exist on time entries only (PRD §7.1), on whichever private disk `FILESYSTEM_DISK` names (local by default in dev; Supabase Storage's S3-compatible bucket in production, Sprint 39/44 — a config change only, no code difference between them, verified by tests that fake a non-local disk), with no previews/thumbnails, no versioning, and no per-entry count cap (none is defined anywhere; the 10MB/file limit and API throttling bound abuse). HR/Finance cannot download raw time-entry attachments — consistent with the standing raw-records rule. All per Sprint 13 decisions.
- The frontend ships one >500kB JavaScript chunk (recharts); code-splitting is a future polish item, not a functional issue (noted by the Sprint 14 performance review).
- `hourly_rate` is serialized only by the Admin user-management endpoints (Sprint 14 security fix); every other response — including `/api/me` and supervisor-facing timesheet views — omits it by model-level hiding.
