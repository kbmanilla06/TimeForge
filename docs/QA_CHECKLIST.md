# TimeForge Manual QA Checklist

The single, ordered end-to-end regression pass over every module, consolidated from the per-module walkthroughs in `docs/SETUP.md` (which keep the step-by-step detail). Execute top to bottom on a fresh database with both seeders; check items off as they pass. Best run on a date that is the 3rd day (or later) of a payroll period so the seeded "unsubmitted day" example exists.

Demo credentials (all passwords `password`, dev-only): `admin@` / `supervisor@` / `employee@` / `intern@` / `marketer@` / `hr@` — all `…@timeforge.test`.

## Phase 0 — Environment (Docker/MySQL runbook)

- [ ] `docker compose up -d --build` (requires Docker Desktop; see `docs/SETUP.md` Option B)
- [ ] `docker compose exec app composer install && docker compose exec app php artisan key:generate`
- [ ] `docker compose exec app php artisan migrate:fresh --seed`
- [ ] `docker compose exec app php artisan db:seed --class=DemoDataSeeder`
- [ ] Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173
- [ ] Smoke: log in as `admin@timeforge.test`; the Home page greets "TimeForge Admin (admin)"

*No Docker?* Option A (host PHP + a reachable MySQL) with the same artisan commands. Automated suites (`php artisan test`, `npm run test/build/lint`) need no database and must be green before starting this checklist.

## Phase 1 — Auth, Roles, Rate Limiting (Sprints 1-2, 14)

- [ ] Log in/out as each of the six demo users; each lands on Home with role-appropriate nav links
- [ ] A `pending` user (create one as Admin) cannot log in until Activated
- [ ] Six rapid failed logins on one email → HTTP 429 on the sixth
- [ ] Password reset flow: forgot-password → email link (log/mailer) → reset → login with new password
- [ ] Non-admin hitting `/admin/users` (UI) is redirected; `GET /api/admin/users` returns 403

## Phase 2 — Admin Portal (Sprints 1-3, 6)

- [ ] Create/edit/activate/deactivate a user; set an hourly rate; department reassignment reflects everywhere
- [ ] Department delete warns with assigned-user count; client delete warns and detaches its projects
- [ ] Create a client, a project (with client), and a KPI (name/target/unit)

## Phase 3 — Time Tracking + Attachments (Sprints 4, 13)

- [ ] As `employee@`: start/stop a timer; totals update (Today/Week/Month/Period)
- [ ] Manual entry with project, reference links, deliverables; overlapping and future-dated entries rejected
- [ ] Only one running timer allowed; running entry can't be edited/deleted until stopped
- [ ] Attach a PDF and a PNG to an editable entry; download both intact; `.txt` and >10MB rejected with clear errors
- [ ] Second user cannot see the first's entries

## Phase 4 — Timesheets And Approval (Sprint 5)

- [ ] Submit a day → status `submitted`, entries lock (edit/delete/attach disabled), attachments still downloadable
- [ ] As `supervisor@`: Team Timesheets shows the seeded `submitted` day; reject requires a comment; request-revision unlocks the day for the employee (including attachments); resubmit → approve
- [ ] Comment history accumulates (never overwritten); notifications fire for submit/approve/reject/revision/reopen
- [ ] Cross-department supervisor sees none of it; only Admin sees/uses Reopen

## Phase 5 — KPIs (Sprint 6)

- [ ] Seeded: Bugs Resolved 6/10 for Eve, Docs Written 0/10 (Engineering), Sales Calls no-target (Mark)
- [ ] Log an entry with a KPI + progress value → progress credits **only** after supervisor approval
- [ ] Reopen + re-approve does not double-credit; cross-department assignment attempts rejected

## Phase 6 — Daily Scrum (Sprint 7)

- [ ] As `employee@`: today's scrum editable until a reviewer comments, then read-only
- [ ] As `supervisor@`: Team Scrum shows seeded entries incl. the recurring "VPN keeps dropping"; comments accumulate
- [ ] Cross-department supervisor sees nothing; employees cannot comment on their own entries

## Phase 7 — Payroll (Sprint 8)

- [ ] As `hr@`: previous period shows Eve ≈ 18h approved / 2h overtime / est. pay from her rate; Iris flagged rateless (no estimate); pending/rejected buckets match the seeded states
- [ ] Date picker to another period changes every number; Supervisor and Employee get no Payroll nav and 403 on `/api/payroll`

## Phase 8 — Reports/Exports (Sprint 9)

- [ ] As `hr@`: Payroll PDF + Excel match the on-screen table (rates and estimates included)
- [ ] As `supervisor@`: Team Hours PDF + Excel — own department only, **no rate/pay columns anywhere**
- [ ] Employee gets 403 on all four export endpoints

## Phase 9 — Dashboard (Sprint 10)

- [ ] As `hr@`/`admin@`: organization-wide metrics + Payroll Summary card; every chart shows seeded data
- [ ] As `supervisor@`: department-scoped, **no Payroll Summary anywhere**; Employee gets 403
- [ ] Date picker changes the period; Refresh recomputes (new data appears only after Refresh)

## Phase 10 — AI Insights (Sprints 11-12)

- [ ] As `employee@`: Daily Summary / Weekly Report / Productivity Trend for self — every number verifiable against the raw records; AI-generated badge with provider `stub`; Regenerate appends to history
- [ ] As `supervisor@`: Blockers (recurring "VPN keeps dropping" with counts/dates), KPI Analysis (60% ranking, zero-progress list), Recommendations (numbered, counts match reality) — own department only
- [ ] As `hr@`: exactly one tab — Payroll Validation (org-wide; names Iris under missing rates); 403 on every other type
- [ ] As `admin@`: all seven tabs work; everything succeeds with **no AI credentials and no network**

## Phase 11 — Cross-Cutting Security Spot Checks (Sprint 14)

- [ ] No response anywhere contains `hourly_rate` except Admin user management (spot-check a supervisor's timesheet JSON)
- [ ] No response anywhere contains an attachment storage `path`
- [ ] An attachment URL under the wrong entry id → 404; other users' resources → 403 (not 404-by-obscurity in UI only)
- [ ] `/horizon` is inaccessible when `APP_ENV` is not `local`

## Recording Results

Log the run (date, environment, commit, per-phase PASS/FAIL, defects found) in the sprint/handoff notes. As of Sprint 14, this checklist has not yet been executed against MySQL — Docker Desktop remains uninstalled; automated suites and all feature tests pass on SQLite in-memory. This is the single known remaining verification gap.
