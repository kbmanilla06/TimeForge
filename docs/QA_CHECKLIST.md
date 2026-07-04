# TimeForge Manual QA Checklist

The single, ordered end-to-end regression pass over every module, consolidated from the per-module walkthroughs in `docs/SETUP.md` (which keep the step-by-step detail). Execute top to bottom on a fresh database with both seeders; check items off as they pass. Best run on a date that is the 3rd day (or later) of a payroll period so the seeded "unsubmitted day" example exists.

Demo credentials (all passwords `password`, dev-only): `admin@` / `supervisor@` / `employee@` / `intern@` / `marketer@` / `hr@` — all `…@timeforge.test`.

## Phase 0 — Environment (Docker/Postgres runbook)

- [ ] `docker compose up -d --build` (requires Docker Desktop; see `docs/SETUP.md` Option B)
- [ ] `docker compose exec app composer install && docker compose exec app php artisan key:generate`
- [ ] `docker compose exec app php artisan migrate:fresh --seed`
- [ ] `docker compose exec app php artisan db:seed --class=DemoDataSeeder`
- [ ] Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173
- [ ] Smoke: log in as `admin@timeforge.test`; the Home page greets "TimeForge Admin (admin)"

*No Docker?* Option A (host PHP + a reachable PostgreSQL instance) with the same artisan commands. Automated suites (`php artisan test`, `npm run test/build/lint`) need no database and must be green before starting this checklist.

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

## Phase 12 — Auth/Onboarding Enhancement (Sprints 15–19)

- [ ] Landing/Login: unauthenticated `/login` renders the full landing page (hero, features, benefits, dashboard-preview mockup, footer) with the sign-in form embedded; a seeded demo account signs in successfully from it; wrong password shows an inline error; show/hide password toggle works; Forgot Password and Create Account links resolve correctly
- [ ] Forgot/Reset Password: submitting a real seeded email and a made-up email return the byte-identical generic message; the real reset link appears in `storage/logs/laravel.log`, points to `{FRONTEND_URL}/reset-password/{token}?email=...`; reset succeeds and the new password logs in; a reused or invalid token is rejected
- [ ] Create Account: `/register` loads a live department dropdown (real departments, not invented); required fields (first/last name, department, email, password+confirm, terms) submit successfully leaving every optional field (middle name, employee ID, position, contact number) blank; a duplicate email is rejected inline; submitting without the terms checkbox is blocked; the password-strength indicator visibly changes weak→strong; show/hide works on both password fields; success shows the "Registration Received" confirmation, not a silent redirect
- [ ] Pending Approval Gate: the just-registered account cannot log in ("not active yet"); it appears with status `pending` in Admin → Manage Users
- [ ] Admin Approve/Reject: Admin sees "Account Approvals" in the sidebar; the new request shows full applicant details; search finds it by name and by email; the status filter narrows to Submitted; Approve → status `approved`, reviewer + timestamp shown, applicant can now log in; a second registration, this time Rejected with an optional remark → status `rejected`, remark visible, applicant still cannot log in; the rejected user shows as `deactivated` in Manage Users and the **existing** Activate button un-blocks them (proves Sprint 17 didn't touch that button's behavior); re-approving/re-rejecting an already-decided request is blocked
- [ ] Email/Log Mail Verification: after each of the four events above, `storage/logs/laravel.log` contains the matching subject ("Registration Received", "New Account Request", "Account Approved", "Account Request Update") with correct body content (applicant name/email/department on the admin alert; a login link on approval; the remark on rejection when one was given) — confirm no real email is expected anywhere, `MAIL_MAILER` is still `log`
- [ ] Security Checklist: 6 rapid failed logins on one email → 429 on the 6th; 6 rapid `/register` attempts with one email → 429 on the 6th; rapidly reloading `/register` (which calls `/register/departments`) does **not** 429 (Sprint 19 fix); `GET`/`PATCH /api/admin/account-requests*` → 403 for a non-admin, 401 unauthenticated; `POST /api/register` with `role: admin` in the body still creates an Employee
- [ ] Full regression tie-in: re-run Phase 1 (Auth, Roles, Rate Limiting) of this checklist in full — the pre-existing admin-created-user path, Activate/Deactivate, and all 6 demo-account logins are unaffected by five sprints of auth-module changes

## Phase 13 — Home Dashboard & Attendance Widget (Sprints 20–22)

- [ ] Home greets the logged-in user by name/role; widgets render with no console errors for each of the six demo roles
- [ ] Attendance: Time In → Start Break → Resume Break → Time Out updates `working_minutes`/`break_minutes`/`total_minutes` correctly; a second Time In the same day is rejected
- [ ] Attendance session data never appears in Payroll figures (confirms the Sprint 22 "informational only" decision still holds — verified in code during the Sprint 30 pass: `AttendanceSession` is never referenced by `PayrollController`/`HoursSummaryCalculator`/`PayrollFigures`)

## Phase 14 — Notifications & Sidebar Badges (Sprint 23)

- [ ] Notification bell count matches unread count; opening/marking-read decrements it; dropdown list matches `NotificationsPage`
- [ ] Sidebar badges (Team Timesheets, Team Scrum, Account Approvals for Admin) match live counts (submitted timesheets / no-comment scrum entries / submitted account requests) and update after the polling interval
- [ ] No polling-related console errors; no WebSocket/Reverb/Pusher dependency was introduced (Sprint 23 guardrail — verified in code during the Sprint 30 pass: neither `composer.json` nor `package.json` references any realtime library)

## Phase 15 — Profile Settings & Sidebar Profile (Sprint 24)

- [ ] Update name/contact fields as any role; change password (wrong current password rejected); upload/replace/view profile picture; picture never exposes a raw storage path
- [ ] Sidebar profile summary reflects the updated name/picture immediately

## Phase 16 — KPI Redesign (Sprint 25)

- [ ] My/Team KPIs group correctly into Completed/Current/Pending using the exact Sprint 25 rule; "Assigned on" date renders; charts match underlying assignment data
- [ ] Admin KPI catalog page is still create-only, no update/delete (verified in code during the Sprint 30 pass: `admin/KpisPage.tsx` only calls `createKpi`/`listKpis`)

## Phase 17 — Team Timesheets Grouping & Analytics (Sprint 26)

- [ ] Entries group one card per employee, expand/collapse works, total hours = sum of all visible entries regardless of status
- [ ] Status + date filters narrow correctly; Department/Employee Progress, Completion Rate, Total Hours, Attendance Trend, Productivity Trend charts match Dashboard/trend-endpoint data; approve/reject/revision/reopen/export all still work unchanged

## Phase 18 — Team Scrum Kanban (Sprint 27)

- [ ] One card per employee, collapsed by default; Yesterday/Today/Blockers/Notes render correctly per entry; comment/"Add a comment" behavior unchanged

## Phase 19 — AI Assistant (Sprint 28)

- [ ] "Ask AI" toggle visible only to Admin/Supervisor (not Employee/HR-Finance); each of the six example questions returns the right category, with chart/table where expected
- [ ] Supervisor scope stays department-only; Admin gets org-wide; the KPI-decline question visibly states the "furthest below target" substitution rather than a fabricated decline
- [ ] Existing report tabs (Daily Summary → Payroll Validation) still work exactly as before the assistant was added (verified in code during the Sprint 30 pass: `visibleTabs`/`TAB_LABELS` logic in `AiInsightsPage.tsx` is untouched)

## Phase 20 — Registration Terms Fix (Sprint 29)

- [ ] Terms checkbox is disabled until "Read Terms and Conditions" is opened; modal shows real content; Create Account stays disabled until checked
- [ ] Full registration → pending → admin-approve → login path (Phase 12) still works end-to-end with this extra step added

## Phase 21 — Sprints 31–40 Regression & Runtime Verification (Sprint 42)

Covers profile picture repair, dashboard sidebar layout, department descriptions, the rebuilt attendance workflow, the AI floating assistant, registration OTP security, password-reset CAPTCHA, notification/badge fixes, the Postgres/Supabase production migration, and the Sprint 40 integration pass. Each line below is marked with how it's actually been verified — API/curl evidence exists for most of these already (Sprint 40's own regression pass plus the Sprint 42 pass that added this phase); a smaller number can only be confirmed by a human in a browser.

- [x] **Login/logout** — API-verified (token issued on login, correctly revoked on logout; rate limiting behaves correctly). Browser-only remainder: redirect behavior, "Signed in — redirecting…" UI feedback.
- [ ] **Admin dashboard** — underlying endpoints return correct role-scoped data; the dashboard's actual visual rendering (cards, charts) has not been confirmed in a browser.
- [x] **Profile picture upload/display persistence** — API-verified end-to-end: upload → logout → fresh re-login (new token) → re-fetch returns the correct image bytes, proving server-side persistence, not client caching. Browser-only remainder: does the sidebar `<img>`/avatar actually update after a real page refresh.
- [x] **Department description create/edit/display** — API-verified: Admin update persists; the public registration listing correctly omits the description field. Browser-only remainder: visual display on the Home Dashboard.
- [x] **Attendance Time In → Pause → Resume → Time Out** — API-verified full state machine against a fresh user: initial `null` state, Time In, Pause (and a second Pause correctly rejected — "Only one break is allowed per day"), Resume, Time Out, and a second Time In the same day correctly rejected. `GET /attendance/today` read-back (what the widget renders from) confirmed correct at every step. Browser-only remainder: the actual click sequence and live-updating timer.
- [x] **Registration OTP via `MAIL_MAILER=log`** — API-verified end-to-end this session: register → OTP code found in `storage/logs/laravel.log` → verify → admin-visibility gate correctly hides it until verified → approve → new user logs in. See "Finding the OTP in the log" below for the exact steps if you need to reproduce this by hand.
- [ ] **Password reset CAPTCHA with local Turnstile test keys** — backend gating API-verified (missing token → 422, valid test-key token → passes and proceeds). **Cannot be verified by curl at all** — the Turnstile widget itself is client-side JS loaded from Cloudflare; only a browser can confirm it actually renders and produces a token. This is the highest-priority remaining browser check.
- [x] **Notifications/sidebar badges** — API-verified: `GET /sidebar-counts` and `GET /notifications` agree on the unread count. Browser-only remainder: toast popup appearing/auto-dismissing after ~6s, bell dropdown open/close.
- [x] **AI floating assistant** — API-verified this session (Sprint 42): a supervisor's question returns a well-formed response (category, chart, table, recommendations); an employee is correctly forbidden with 403 ("Only Admin and Supervisor may use the AI Assistant"). Browser-only remainder: floating-button visibility by role, open/close, chat interaction.
- [x] **File uploads/downloads** — API-verified both directions for both profile pictures and time entry attachments (upload, download byte-for-byte correct, delete confirmed removed from disk).
- [x] **Payroll/report pages load** — API-verified this session (Sprint 42, closing a real gap — never tested against Postgres before this): `/api/payroll` returns correct seeded figures (e.g., Eve: rate $20/hr, 480 approved minutes, $160 estimated); PDF export returns a genuinely valid single-page PDF (`/Count 1` confirmed directly in the file's own object structure — `file`'s "0 pages" report was a red herring, not a real defect); Excel export returns a valid `.xlsx`. Browser-only remainder: do the downloaded files actually open/render correctly in a PDF/Excel viewer.
- [x] **No MySQL missing-table errors** — `migrate:fresh --seed` + `DemoDataSeeder` both completed with zero errors against the live Postgres container; every endpoint exercised above returned real data, not a 500.

### Browser Checklist (copy-paste executable — a human still needs to perform these)

1. Open `http://localhost:5173`, log in as `admin@timeforge.test` / `password`; confirm the Home Dashboard renders with no console errors.
2. Go to Profile, upload a picture, confirm it appears in the sidebar immediately, then hard-refresh (F5) and confirm it's still there.
3. Go to Manage Departments, edit a description, then log in as an employee in that department and confirm it displays on their Home Dashboard.
4. On the Home Dashboard, click Time In → Pause Break → Resume Break → Time Out, confirming the button set updates correctly at each step with no stale buttons.
5. Log out, go to Create Account, register a new account. Confirm the "Verify Your Email" screen appears (not a crash). Find the OTP in the log (see below), enter it, confirm "Registration Received" appears, and that the resend button shows a live countdown.
6. On Forgot Password, confirm the Cloudflare Turnstile widget actually renders (a visible checkbox/challenge, not a blank space or console error) before submitting.
7. As Admin, trigger two unread notifications; confirm the bell badge and the sidebar "Notifications" badge show the same number, and that a toast popup appears and auto-dismisses on its own after a few seconds.
8. Open the floating AI Assistant as a Supervisor or Admin; confirm it does *not* appear when logged in as a plain Employee.
9. Download the Payroll PDF and Excel exports from the browser and confirm both actually open correctly in a viewer/spreadsheet app.

### Finding the OTP in the log

With `MAIL_MAILER=log` (the safe local default), every notification — including the registration OTP — writes to `storage/logs/laravel.log` instead of attempting real delivery:

```bash
docker exec timeforge-app tail -60 storage/logs/laravel.log | grep -B2 -A2 "TimeForge"
```

Look for a 6-digit number inside a `<strong>` tag near "Enter this code to verify your email." The code expires in 10 minutes and allows 5 attempts; a resend is allowed after a 60-second cooldown.

**Status as of the Sprint 30 run (2026-07-04):** all automated suites green (`composer validate`, `php artisan test` 262/262, `npm run build`/`lint` clean, `npm run test` 258/258 across 48 files) — this is the primary regression signal for Phases 13–20, since every one of Sprints 20–29 shipped with its own passing test suite covering the behavior described above, and nothing has changed since. The three cross-cutting guarantees called out above (attendance never feeds payroll, no realtime dependency, KPI catalog still create-only, AI Assistant doesn't disturb existing report tabs) were independently re-verified directly in code, not just inferred from tests passing. No regressions found; no P0s to fix. Visual/click-through confirmation of all eight phases (does each screen *look* right, do charts/modals render as expected) still needs a human in a browser — see `docs/QA_RUN_2026-07-04.md`.

**Status as of the Sprint 20 run (2026-07-03):** every item above that doesn't require a browser click was executed and passed — live, against the real Docker/MySQL stack, not just the automated suite: the full register → pending-blocked → admin search/filter → approve → login-succeeds path; a second register → reject-with-remark → still-blocked → existing-Activate-button-reactivates path; both anti-brute-force limits (login, register) tripping on the 6th attempt; the Sprint 19 `lookup` limiter fix (20 rapid department-list calls, zero 429s); anti-enumeration (identical forgot-password response for a real vs. fake email); the role/status-injection defense (still creates a plain Employee); all four new notification subjects plus the pre-existing password-reset email confirmed in `storage/logs/laravel.log` with correct body content; 403/401 gating on the new admin endpoints. Visual/click-through confirmation (does the landing page *look* right, does the show/hide icon toggle on click) still needs a human in a browser — see `docs/QA_RUN_2026-07-03.md` for the full run log and one non-blocking observation found during this pass.

## Recording Results

Log the run (date, environment, commit, per-phase PASS/FAIL, defects found) in the sprint/handoff notes. Phase 0 (Docker/MySQL) executed successfully for the first time during the 2026-07-03 QA pass — see `docs/QA_RUN_2026-07-03.md`. Phase 12 (Sprints 15–19) executed the same day — see that log for the auth/onboarding results and the one known, pre-existing, out-of-scope observation found along the way. Phases 13–20 (Sprints 20–29) executed during the Sprint 30 QA pass on 2026-07-04 — see `docs/QA_RUN_2026-07-04.md` for the full run log; automated-only (no Docker/MySQL environment available during that pass), with visual/click-through confirmation still outstanding. Phase 21 (Sprints 31–40) executed during the Sprint 42 QA pass on 2026-07-05 — see `docs/QA_RUN_2026-07-05.md`; live against the real Docker/Postgres stack (API/curl-level, not browser), closing two prior gaps (payroll/reports and the AI floating assistant had never been exercised against Postgres before this pass) — the nine numbered browser-checklist items above remain the one outstanding category of verification.
