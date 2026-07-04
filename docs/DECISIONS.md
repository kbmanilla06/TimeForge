# TimeForge Approved Decisions

This file records confirmed project decisions. Claude Code must preserve these decisions unless the user explicitly changes them.

## Confirmed From Project Brief

- Project name: TimeForge.
- Project type: Enterprise SaaS web application.
- Core purpose: AI-powered workforce performance, timesheet, daily scrum, and payroll preparation management.
- Primary users:
  - Employee / Intern
  - Supervisor
  - Human Resources and Finance
  - System Administrator
- Required modules:
  - Authentication and role management
  - Time tracking and attendance logging
  - Smart timesheet management
  - Daily scrum reporting
  - KPI performance management
  - Supervisor approval workflow
  - Payroll preparation reports
  - AI-generated work summaries and analytics
  - Productivity dashboards
  - Administrative management portal
- Payroll period examples:
  - 1st to 15th
  - 16th to end of month
- Required export formats:
  - PDF
  - Excel

## Locked Technical Decisions

- Backend: Laravel, PHP, MySQL, Laravel Sanctum, Laravel Queues, Horizon.
- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router.
- Tools: Docker, Git, GitHub, Postman, PHPUnit, Pest if applicable.

## Initial Implementation Decisions

These are safe Sprint 0 decisions that do not change business requirements:

- Use separate backend and frontend application folders unless a later decision says otherwise.
- Keep business logic in Laravel service classes when behavior becomes non-trivial.
- Use Laravel policies or gates for authorization.
- Use migrations, seeders, factories, and tests from the beginning.
- Use TypeScript interfaces/types for frontend API data shapes.
- Use environment variables for secrets and external AI credentials.
- Do not hard-code AI provider details until approved.

## Approved MVP Business Decisions

These decisions were approved as the MVP scope on 2026-07-01. Full question-to-answer traceability is in `docs/QUESTIONS.md` (Sections A-R). Claude Code must preserve these unless the user explicitly changes them.

### Business Model / Multi-Tenancy

- MVP is single-company only. Do not implement full multi-tenancy.
- Design the database cleanly so multi-tenancy can be added later, but do not add organization isolation unless needed for MVP.
- Subscriptions, plans, payments, and billing are out of scope for v1.0.

### Roles And Permissions

- Four roles: Employee, Supervisor, HR/Finance, System Administrator.
- Each user has one primary role only for MVP.
- Supervisors see only employees assigned to their team or department.
- HR/Finance can view approved timesheets, attendance summaries, payroll reports, and exports. They cannot edit employee-submitted timesheets.
- Only System Administrators can create, edit, deactivate, and assign users.

### Authentication And Security

- Login uses email and password.
- Email verification is not required for MVP.
- Password reset is required.
- Two-factor authentication is not required for MVP.
- New accounts require admin approval before active use.

### Time Tracking

- Employees can use start/stop timers and manually add time entries.
- Draft entries are editable; submitted entries are locked unless a supervisor requests revision.
- Overlapping time entries are not allowed.
- Break time tracking, idle detection, and screenshot/activity monitoring are all out of scope for MVP.
- Future-dated work logs are not allowed.

### Timesheet Approval Workflow

- Approval is per submitted daily timesheet.
- On revision request, the employee edits the flagged fields and resubmits.
- Only a System Administrator can reopen a finally-approved timesheet.
- No second-level HR/Finance approval in MVP.
- Approval actions generate in-app notifications.

### Payroll

- Formula: estimated payroll = (approved regular hours × hourly rate) + (approved overtime hours × overtime rate).
- Hourly rate stored per employee.
- Overtime rate defaults to 1.25x hourly rate, admin-configurable.
- Overtime = any approved work beyond 8 hours in one day.
- Taxes, deductions, benefits, and allowances are out of scope for MVP.
- Payroll reports are estimates only, not final disbursement records.
- Payroll periods are semi-monthly by default: 1st-15th and 16th-end of month.

### KPI Management

- KPIs are numeric for MVP.
- System Administrator creates KPIs; Supervisors assign KPIs to their team/department.
- KPIs may be assigned by role, department, project, or individual, but MVP prioritizes individual and department assignment.
- Approved work logs update KPI progress only when the log is linked to a KPI with a completed quantity/value.
- Employees report KPI progress through work logs; approval happens via timesheet approval, not a separate KPI approval step.

### Daily Scrum

- One daily scrum submission expected per workday.
- Employees can edit their scrum entry before supervisor review.
- Supervisors comment on scrum entries; formal approval is not required in MVP.
- Recurring blocker detection is manual for MVP; AI detection deferred.

### AI Integration

- AI provider is not locked. Build behind an interface/service layer for later configuration.
- Implement AI as a stub/mock service first for MVP unless API credentials are provided.
- AI outputs are saved permanently with a source data reference.
- Users with permission can regenerate AI summaries.
- AI output must be labeled as AI-generated; supervisor approval of AI output is not required.
- Do not send sensitive employee data to external AI services until a provider and privacy rules are approved.

### Reporting And Exports

- Report layouts proposed during the reporting sprint.
- MVP branding is text-only (no final logo yet).
- System Administrator and HR/Finance can export reports; Supervisors can export team reports.
- Small exports run synchronously; large exports use queues.
- Generated reports need not be stored for MVP unless queue-based export is used.
- Claude Code may propose Laravel-friendly PDF and Excel libraries during the relevant sprint.

### Notifications

- Email notifications are optional and can be deferred.
- In-app notifications are required for approval events in MVP.
- Trigger events: timesheet submitted, approved, rejected, revision requested, payroll report ready.
- Missing-timesheet/scrum reminders can be deferred.

### UI / UX

- No final brand guide exists yet.
- UI is responsive, desktop-first but usable on mobile.
- Clockify may be used as an interaction reference only, not for branding.
- Dark mode is not required for MVP.
- Claude Code may propose a chart library during the dashboard sprint.

### Deployment

- Deployment target not final.
- Docker required for local development; production Docker planned later.
- CI/CD recommended, can be added after the app foundation is stable.

### Leave And Holidays

- Leave and holiday handling are entirely out of scope for MVP.

### Client And Project Management

- MVP includes basic client and project records, since time entries require client and project fields.
- Advanced project management is out of scope.
- Client and Project CRUD ownership, lifecycle/status, cardinality, and employee-project assignment are resolved — see "Sprint 3 Implementation Decisions (Approved)" below.

### Attachments

- Permitted file types: PDF, PNG, JPG, JPEG, DOCX, XLSX.
- Maximum file size: 10MB per file.
- Storage: local disk for MVP, behind an abstraction that can later support cloud storage.
- Malware scanning and retention period were resolved with the Sprint 13 plan — see "Sprint 13 Implementation Decisions (Approved)".

### General Policy

- If a requirement remains undefined when its sprint is reached, stop and ask. Do not invent additional business rules.

## Sprint 1 Implementation Decisions (Approved)

Approved alongside the Sprint 1 (Authentication And Role Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_01.md` and must be preserved unless explicitly changed.

- **Initial password provisioning:** The Admin sets the initial password directly when creating a user account. No invite-email flow for MVP; that is deferred.
- **Team/department model:** A single `departments` table. For MVP, a Supervisor's "team" means every user who shares the same `department_id` as that Supervisor. No separate teams table.
- **Sanctum authentication style:** Token-based Sanctum authentication for MVP, because the backend and frontend are separate applications and the deployment target is not yet final. Cookie-based SPA (stateful) authentication may be revisited if frontend and backend are later deployed under one domain.

## Sprint 2 Implementation Decisions (Approved)

Approved alongside the Sprint 2 (Admin User And Department Management UI) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_02.md` and must be preserved unless explicitly changed.

- **Department user count:** Add `withCount('users')` to the existing `Admin\DepartmentController::index()` query only, so the UI can warn before deleting a department with assigned users. No new endpoint, no new business rule.
- **Frontend test runner:** Vitest + React Testing Library, for Sprint 2 and going forward — Vite-native, fits the existing React/TypeScript stack.
- **User edit scope:** The Admin edit form may update only `name`, `email`, `role`, and `department_id`, matching the existing `UpdateUserRequest`. Status changes remain separate Activate/Deactivate actions. No admin-triggered password reset for other users in Sprint 2.

## Sprint 3 Implementation Decisions (Approved)

Approved alongside the Sprint 3 (Client And Project Management Foundation) plan. These resolve `docs/QUESTIONS.md` Section O and the implementation-level gaps flagged in `sprints/SPRINT_03.md`, and must be preserved unless explicitly changed.

- **Client CRUD:** Admin-only for MVP, mirroring the Department pattern.
- **Project CRUD:** Admin-only for MVP.
- **Project lifecycle/status:** None for MVP. Project fields stay minimal: `name` and optional `client_id`. No `description` field — one was not already planned in `sprints/SPRINT_03.md`, so the "if already planned" condition in the approval does not apply; none is added.
- **Project-client cardinality:** A project may belong to zero or one client (nullable foreign key). No many-to-many relationship in MVP.
- **Employee-project assignment:** No employee-project assignment table in MVP. When Time Tracking is built, any employee may reference any active/available project unless a later approved decision changes this.

## Sprint 4 Implementation Decisions (Approved)

Approved alongside the Sprint 4 (Time Tracking Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_04.md` and must be preserved unless explicitly changed.

- **Task field:** Free text for MVP. No separate `tasks` table.
- **Work category field:** Free text for MVP, stored as `work_category`. No separate work-categories table.
- **Reference links and deliverables:** In scope for Sprint 4 (not deferred with attachments). Stored as nullable JSON array fields (`reference_links`, `deliverables`) on `time_entries`, cast to `array` on the model, validated as Laravel array/string rules — whichever fits existing code style. Distinct from attachments: these are plain text/URL data, not file uploads, so they don't carry the still-open malware-scanning/retention questions.
- **Time entry ownership and visibility:** Any active user, regardless of role, may create and manage their own time entries. In Sprint 4, a user can only see their own entries. Supervisor/team visibility is deferred to a later reporting or approval sprint.
- **Running timer rule:** A user may have only one running timer at a time.
- **Attachments:** Deferred entirely from Sprint 4 — no upload fields or storage yet. The attachment rules already recorded elsewhere in this file (permitted file types, 10MB limit, local storage) and the still-open malware-scanning/retention questions in `docs/QUESTIONS.md` Section P remain for the sprint that actually implements attachment upload.
- **Submission/locking:** No submitted/approved/rejected status in Sprint 4. Time entries remain editable by their owner until Smart Timesheet / Approval Workflow is implemented in a later sprint.
- **Read-only clients/projects access:** Add authenticated, read-only client/project list endpoints for non-admin users (`GET /api/projects`, `GET /api/clients`), so employees can select a client/project when logging time. Non-admins get no create/update/delete access — the existing `/api/admin/*` CRUD endpoints are unchanged.

## Sprint 5 Implementation Decisions (Approved)

Approved alongside the Sprint 5 (Smart Timesheet Submission And Supervisor Approval Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_05.md` and must be preserved unless explicitly changed.

- **KPI linkage:** Deferred entirely from Sprint 5. The KPI module does not exist yet, so no KPI progress behavior is invented here. A future KPI Management sprint must revisit timesheet approval to wire this in, per the already-locked KPI decision that approval happens via timesheet approval.
- **Supervisor comments:** Stored in a separate comments/history table (`timesheet_comments`), not a single overwritable remarks field, so comments remain permanently attached across multiple review cycles.
- **Task status:** Free-text `task_status` on `time_entries` for MVP. No task-status lookup table yet.
- **Revision behavior:** Requesting revision reopens the whole daily timesheet for employee edits. No field-level revision controls.
- **Reviewer scope:** Supervisors can review timesheets only for users in their own department. Admins can review any timesheet. Nobody — including a Supervisor or Admin — can review their own timesheet.
- **Notifications:** Minimal in-app notifications for timesheet submitted, approved, rejected, revision requested, and reopened. No email notifications, no notification bell/badge widget — a simple notifications list page only.
- **HR/Finance visibility:** Deferred until the payroll/reporting sprint.
- **One-timesheet-per-day rule:** Enforced — one `Timesheet` row per `(user_id, date)`.

## Sprint 6 Implementation Decisions (Approved)

Approved alongside the Sprint 6 (KPI Management Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_06.md` and must be preserved unless explicitly changed.

- **KPI fields:** `name`, optional `target_value`, optional `unit` for MVP. No fixed KPI type catalog.
- **KPI assignment model:** A `kpi_assignments` row belongs to exactly one KPI and targets either one user or one department, never both. Each assignment tracks independent `progress_value`.
- **Time entry KPI reference:** Time entries reference a specific `kpi_assignment_id`, not a raw KPI, so progress attribution is unambiguous when a KPI is assigned to both an individual and their department.
- **Progress credit timing:** KPI progress is credited once, when the containing timesheet is approved — not on submit, reject, or revision-request.
- **Idempotency / reopen behavior:** A `kpi_progress_applied_at` marker on the time entry tracks whether its progress has already been applied, preventing double-counting if a timesheet is reopened and re-approved.
- **No automatic reversal:** Approved KPI progress is not automatically reversed if the timesheet is later reopened, even if the entry's reported value is edited afterward. Documented as an MVP limitation, in the same spirit as Sprint 5's "rejected is terminal" caveat.
- **Period resets:** None in MVP. KPI progress is an all-time running total.
- **Visibility:** Mirrors Sprint 5 exactly — Employees see their own assignments/progress, Supervisors see their department's, Admins see all.
- **Dashboards:** Not built in Sprint 6. Plain numeric progress only; charts/visualizations belong to the future Productivity Dashboards sprint (PRD §7.7).

## Sprint 7 Implementation Decisions (Approved)

Approved alongside the Sprint 7 (Daily Scrum Reporting Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_07.md` and must be preserved unless explicitly changed.

- **Lock mechanism:** A daily scrum entry becomes read-only for the employee after the first Supervisor/Admin comment. Derived from comment existence; no separate lock flag.
- **Employee replies:** Employees cannot reply/comment on their own daily scrum entries in MVP.
- **Comment history:** Supervisor/Admin comments are stored in a permanent comment history table, not a single overwritable comment field.
- **Entry date:** The API accepts an explicit date, validated as non-future. The UI may default to today.
- **Approval workflow:** No approval state machine for Daily Scrum in MVP. Supervisor/Admin comments are the only review action.
- **Blocker detection:** No automated blocker detection in Sprint 7. AI-based recurring blocker detection is deferred.
- **Linkage:** Daily Scrum entries are not linked to time entries, timesheets, or KPIs in Sprint 7.
- **Visibility:** Mirrors Sprints 5-6 — Employees see their own entries, Supervisors see their department's, Admins see all.
- **Notifications:** No Daily Scrum notification events in Sprint 7, because the locked Notifications decision's trigger list only includes timesheet events.

## Sprint 8 Implementation Decisions (Approved)

Approved alongside the Sprint 8 (Payroll Preparation Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_08.md` and must be preserved unless explicitly changed.

- **Hourly rate:** Stored per employee/user (`hourly_rate`). Admin edits it through the existing user edit flow — no separate payroll settings screen.
- **Overtime multiplier:** One global overtime multiplier, default 1.25, configurable via environment/config, not a database-backed settings UI.
- **Payroll period:** Fixed semi-monthly periods (1st-15th and 16th-end of month). The existing payroll-period helper logic (from Sprint 4's `TimeEntryController`) is extracted and reused, not duplicated.
- **Overtime calculation:** Calculated per day — approved minutes beyond 8 hours in a day are overtime. Daily overtime is summed across the payroll period.
- **Hour buckets:** Approved, pending, and rejected hours derive directly from timesheet status. No new payroll-specific status schema.
- **Attendance summary:** The distinct count of days with time entries in the payroll period. No clock-in/out attendance behavior is invented.
- **Live computation:** Payroll reports are live-computed estimates only. No generated payroll reports are stored in Sprint 8.
- **Visibility:** Only Admin and HR/Finance can view payroll estimates in Sprint 8. Supervisors and employees cannot view payroll estimates yet.
- **Notifications and exports:** No payroll notifications, PDF export, Excel export, stored reports, or queue-based report generation in Sprint 8. These belong to later reporting/export sprints.

## Sprint 9 Implementation Decisions (Approved)

Approved alongside the Sprint 9 (Reporting And Exports Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_09.md` and must be preserved unless explicitly changed.

- **Export libraries:** `barryvdh/laravel-dompdf` for PDF exports. `maatwebsite/excel` failed to install (its pinned `phpoffice/phpspreadsheet` dependency requires `php <8.5.0`, and this environment runs PHP 8.5.7) — reported and approved for substitution with `phpoffice/phpspreadsheet` directly (the same underlying engine `maatwebsite/excel` wraps), used via its own `Spreadsheet`/`Xlsx` writer API instead of the Laravel abstraction layer.
- **Report types:** Two separate report types — Payroll Report (Admin and HR/Finance only; includes rates and estimated pay) and Team Hours Report (Supervisor own department, Admin/HR-Finance any department; excludes hourly rates and estimated pay).
- **Synchronous export:** Synchronous export generation in Sprint 9. No queues yet.
- **Stored reports:** No generated report records are stored in Sprint 9.
- **Payroll report ready notification:** Not implemented in Sprint 9, because exports are synchronous and there is no delayed "ready" event.
- **Shared calculation:** Sprint 8's payroll/hour bucketing logic is extracted into a reusable calculator/service so the Payroll Report and Team Hours Report do not duplicate logic.
- **Export UI placement:** Export buttons are added to the existing `PayrollPage` and `TeamTimesheetsPage`. No new report browsing pages in Sprint 9.
- **Branding:** Text-only TimeForge branding in exported reports. No logo required.
- **Scope:** No dashboards, charts, stored reports, queued exports, AI summaries, or new report types in Sprint 9.

## Sprint 10 Implementation Decisions (Approved)

Approved alongside the Sprint 10 (Dashboard And Analytics Foundation) plan. These resolve `docs/QUESTIONS.md` Section Q (previously OPEN, now RESOLVED — see that section) plus the implementation-level gaps flagged in `sprints/SPRINT_10.md`, and must be preserved unless explicitly changed.

- **Dashboard role scoping (resolves Section Q, Question 1):** Admin and HR/Finance see organization-wide dashboard metrics. Supervisors see their own department's dashboard metrics. Employees do not get a dedicated Dashboard page in Sprint 10, because their self-productivity needs are already covered by the Time Tracking summary and My KPIs page.
- **Refresh behavior (resolves Section Q, Question 2):** No real-time push, no scheduled dashboard jobs, and no background refresh in Sprint 10. Dashboard data is recomputed on page load and when the user clicks a manual Refresh button.
- **Metric definitions:** Productivity = approved hours. Department performance = approved hours plus KPI completion. Billable vs. non-billable is inferred from whether the time entry has an associated project/client, because no explicit billable flag exists yet.
- **Period behavior:** Reuse the existing semi-monthly payroll period helper. Add a day-by-day breakdown only where needed, for attendance trends.
- **Chart library:** Recharts for frontend dashboard charts.
- **Payroll summary visibility:** Payroll summary appears only for Admin and HR/Finance. It is omitted entirely from Supervisor dashboard responses.
- **Dashboard export:** No export button on the dashboard in Sprint 10. Sprint 9 already covers exports.

## Sprint 11 Implementation Decisions (Approved)

Approved alongside the Sprint 11 (AI Integration Foundation) plan. These resolve the five Clarification Questions in `sprints/SPRINT_11.md` — including the PRD §11 "AI prompt storage and audit rules" gap — and must be preserved unless explicitly changed.

- **AI provider:** Sprint 11 is stub-only. No external AI providers, API credentials, HTTP clients, or network calls anywhere in the AI layer. Real provider selection and external data privacy rules remain deferred (see Decisions Still Required) and now gate only the future swap to a real external provider, not this foundation.
- **Capability scope:** Sprint 11 implements only daily work summaries, weekly productivity reports, and recurring blocker identification. KPI performance analysis, payroll validation, supervisor recommendations, and productivity trend analysis are deferred to a later sprint.
- **Automatic generation semantics:** On-demand synchronous Generate/Regenerate only. No scheduled jobs, queues, Horizon workers, or automatic background generation in Sprint 11.
- **Permission matrix:** Employees can generate/view their own AI summaries. Supervisors can generate/view their own department's summaries and department blocker reports. Admins can generate/view all. HR/Finance has no AI access in Sprint 11.
- **Prompt storage and audit:** Append-only `ai_outputs` records storing the source-data JSON snapshot, provider, prompt_version, generator user, subject/period metadata, and the generated output. Regeneration appends a new row. Prior AI outputs are never overwritten or deleted.

## Sprint 12 Implementation Decisions (Approved)

Approved alongside the Sprint 12 (AI Analysis Suite) plan. These resolve the four Clarification Questions in `sprints/SPRINT_12.md` and must be preserved unless explicitly changed. All Sprint 11 AI safety rules are explicitly carried forward: stub provider only, no external AI calls, no credentials, synchronous Generate/Regenerate only, append-only `ai_outputs`, source-data snapshots, AI-generated labeling, and no queues or scheduled jobs.

- **AI subject shapes:** KPI performance analysis and supervisor recommendations are department-scoped. Payroll validation is organization-wide, stored with both subject foreign keys null. Productivity trend analysis is user-scoped. The Sprint 11 subject helper is refactored only as needed to support user, department, and organization-wide subject shapes. No new schema.
- **Permission matrix:** Payroll validation is Admin and HR/Finance only, mirroring Sprint 8 payroll visibility. HR/Finance gains AI Insights access only for payroll validation and must receive 403 on all other AI output types. Other roles receive 403 on payroll validation unless explicitly allowed. All Sprint 11 matrix rules otherwise stand unchanged.
- **Trend window:** Productivity trend analysis covers the six consecutive semi-monthly payroll periods ending with the reference date's period.
- **Payroll validation content:** Facts only — missing hourly rates, period totals, pending/rejected hours, unsubmitted days, open timers, and largest approved day. No anomaly thresholds, risk scores, compliance labels, or business judgments are invented.

## Sprint 13 Implementation Decisions (Approved)

Approved alongside the Sprint 13 (Time Entry Attachments Foundation) plan. These resolve `docs/QUESTIONS.md` Section P questions 3-4 (previously OPEN, now RESOLVED — see that section) plus the storage, permission, and lifecycle gaps flagged in `sprints/SPRINT_13.md`, and must be preserved unless explicitly changed.

- **Malware scanning:** Not implemented in Sprint 13. Accepted as an MVP risk with compensating controls: extension allowlist, server-detected MIME validation, 10MB per-file limit, private non-web-served storage, hashed server-generated filenames, and authorized download-only access. Malware scanning is revisited at deployment/security hardening.
- **Retention period:** Attachments are retained indefinitely for MVP as audit evidence. No purge jobs or retention scheduler in Sprint 13.
- **Storage behavior:** Attachments are stored on Laravel's private local filesystem disk behind the filesystem abstraction, under server-generated paths (`time-entry-attachments/{timeEntryId}/{hash}`). The original filename is stored in the database only. Physical storage paths are never exposed to clients.
- **Download permissions:** The owner can download their own time-entry attachments; Supervisors can download attachments for users in their own department; Admins can download all. HR/Finance cannot download raw time-entry attachments in Sprint 13.
- **Lifecycle:** Attachment modification follows `TimeEntry::isLocked()` — upload/delete are allowed only while the time entry is editable; attachments freeze when the entry is submitted/approved/rejected; they become editable again only when the timesheet is revision-requested or reopened; deleting a time entry deletes attachment rows and stored files; no attachment versioning in MVP.

## Sprint 14 Implementation Decisions (Approved)

Approved alongside the Sprint 14 (Final QA, Documentation, Demo And Deployment Readiness) plan. These resolve the four Clarification Questions in `sprints/SPRINT_14.md` and must be preserved unless explicitly changed. Sprint 14 adds no new business features, modules, endpoints, migrations, dependencies, dashboards, AI capabilities, export types, attachment features, or UX redesigns.

- **Docker/MySQL validation:** If Docker Desktop is available during Sprint 14, the full Docker/MySQL validation and manual regression run end-to-end. If it remains unavailable, a complete validated runbook ships instead and Docker/MySQL execution is recorded as the single remaining, externally blocked known limitation.
- **Demo seeder:** A dev-only `DemoDataSeeder` is added: two departments; one user per role with documented demo credentials; clients and projects; KPIs with progress; two payroll periods of time entries covering every relevant timesheet state, an overtime example, and one unrated employee; and daily scrum entries with a recurring blocker. It is excluded from production/default seeding and documented as dev/demo only.
- **Documentation set:** `README.md` is refreshed, and the following are added/updated: `docs/ROUTES.md`, `docs/DATABASE.md`, `docs/QA_CHECKLIST.md`, `docs/DEMO.md`, `docs/USER_GUIDE.md`, a Known Limitations section, and a `docs/SETUP.md` accuracy pass.
- **Hardening budget:** Sprint 14 code changes are limited to rate limiting with tests, extracting `useAuth` to remove the remaining lint warning, completing `.env.example`, and P0-only bug fixes found during regression — each reported before fixing.

## Sprints 15–19 Implementation Decisions (Approved) — Post-MVP Authentication & Onboarding Enhancement

Approved sprint-by-sprint alongside the Landing Page (15), Create Account (16), Admin Account Approval (17), Email Notifications & Password Recovery Hardening (18), and Auth Security Hardening (19) plans. Scope was deliberately limited to the auth/onboarding module throughout — no Dashboard, Timesheets, Daily Scrum, Payroll, KPI, Reports, AI, or Attachments file was touched across all five sprints.

- **Landing page exception (Sprint 15):** the unauthenticated entry point (`/login`) gets a full marketing-style landing page — hero, feature overview, benefits, a static (non-live) dashboard-preview mockup, footer — with the sign-in form embedded directly in it. This explicitly overrides the earlier general UI-polish instruction of "no marketing hero pages," but **only** for this one unauthenticated entry surface; every authenticated page keeps the enterprise-density direction from that earlier pass.
- **Self-registration is additive, not a replacement (Sprint 16):** extends, does not reverse, the Sprint 1 decision that only an Admin can provision accounts. `POST /api/register` is a second, approval-gated entry path; the Admin-creates-a-user path (`UserFormPage`, `Admin\UserController`) is unchanged.
- **Role/status are never user-selected (Sprint 16):** self-registration always creates `role=Employee`, `status=Pending`, regardless of request input — `RegisterRequest`'s validation rules don't even accept a `role`/`status` field, so this is enforced structurally, not just by convention. Verified by a dedicated test that injects `role: admin` into the payload and asserts the created account is still a plain Employee.
- **No new `rejected` status (Sprint 16/17):** a rejected applicant's account reuses the existing `UserStatus::Deactivated` value — zero new enum cases. The existing Admin "Activate" button (unchanged since Sprint 1/2) is the same mechanism that reactivates a rejected applicant if needed. Decision history (who rejected, when, why) lives on a new, dedicated `account_requests` table, not on `users`.
- **No username login (Sprint 16):** login remains email + password only; `AuthController::login`'s lookup logic was never touched. "Username" was dropped from the registration field set entirely rather than collected as an inert display-only field.
- **Real departments only (Sprint 16):** the registration form's department picker reads from the actual `departments` table via a new public, read-only `GET /api/register/departments` endpoint (id + name only) — no invented or free-text department scheme.
- **Email verification deferred (Sprint 18):** explicitly evaluated and not implemented. The Admin's manual review of every registration already serves as the identity check; a required verify-click would add a workflow step and a mail dependency with no real security benefit in an environment where `MAIL_MAILER=log` has no actual inbox to verify against. `email_verified_at` and Laravel's `MustVerifyEmail` remain available if a future sprint wants this.
- **Mail stays local/log-only (Sprint 18):** no external mail provider credentials were introduced. All four new notifications (`RegistrationReceived`, `NewAccountRequestSubmitted`, `AccountApproved`, `AccountRejected`) send synchronously through the existing `MAIL_MAILER=log` driver, matching every notification already in the app. Queuing was evaluated and deferred: `QUEUE_CONNECTION=redis` is reachable, but no queue worker runs by default in this environment, so marking anything `ShouldQueue` today would mean it's enqueued and never processed.
- **Forgot-password anti-enumeration (Sprint 18):** `POST /api/forgot-password` now returns an identical 200 response ("If an account exists for that email, a password reset link has been sent.") regardless of whether the email exists — an approved, deliberate behavior change to a Sprint-1-era endpoint, closing a real enumeration signal. Password reset itself (token generation, 60-minute expiry, single use) is otherwise unchanged.
- **CAPTCHA not implemented (Sprint 19):** evaluated (Turnstile / reCAPTCHA v3 / hCaptcha) and deliberately deferred — no external service keys were introduced. The admin-approval gate is treated as the primary anti-abuse control: a bot can submit unlimited registrations and still never gain access without a human Admin approving each one. Revisit only if real registration abuse is observed.
- **Rate-limiter scoping (Sprint 19):** `GET /register/departments` was moved off the `throttle:auth` (anti-brute-force, email+IP-keyed) bucket onto its own generous per-IP `throttle:lookup` bucket, after finding that a request with no `email` field always keyed to a single shared `''|{ip}` bucket — meaning a legitimate applicant reloading the registration page could exhaust the same budget meant to stop brute-force login/registration. The real anti-brute-force protection on `/login`, `/forgot-password`, `/reset-password`, and `/register` itself is untouched.
- **No account-level lockout (Sprint 19):** considered and explicitly not added. Current IP+email rate limiting already matches modern guidance (NIST 800-63B specifically advises against forced lockout, since it hands an attacker a free way to lock a legitimate user out).

## Sprint 25 Implementation Decisions (Approved)

Approved for the Sprint 25 (KPI Pages UX Redesign) plan. Frontend-only: no migrations, no new KPI routes, no `DashboardController` changes, no backend logic changes.

- **History section:** No progress history/audit table. Lightweight history only — "Assigned on {date}" rendered from the existing `kpi_assignments.created_at` timestamp (already serialized by the API; no new endpoint or migration needed). No invented progress-over-time data.
- **Admin KPI page scope:** `Admin\KpisPage` remains KPI catalog management only (define KPIs), not progress assignments. Sprint 25 only polishes its spacing, typography, form layout, and table styling — no Current/Pending/Completed restructuring, no update/delete of KPI definitions, no backend route changes.
- **KPI categorization:** Computed on the frontend only, via `frontend/src/lib/kpiInsights.ts`, and applied to `MyKpisPage`/`TeamKpisPage` (not the Admin catalog page): Completed = has a target and `progress_value >= target_value`; Current = `progress_value > 0` and not completed, or no target but progress exists; Pending = `progress_value === 0`.
- **Analytics/charts:** KPI summary/analytics (category breakdown, completion-rate charts) are computed client-side from already-fetched `kpi_assignments`, using the existing Recharts dependency. No calls to the Dashboard endpoint, no backend aggregation.

## Sprint 26 Implementation Decisions (Approved)

Approved for the Sprint 26 (Team Timesheet Grouping And Analytics) plan.

- **Chart data source:** Reuse the existing `GET /dashboard` endpoint (already tested, already role-scoped per the Sprint 10 decision) for Employee Progress, Department Progress, Completion Rate, Total Hours, and Attendance Trend. No payroll-period, attendance-trend, completion-rate, or status-bucketing logic is duplicated on the frontend. Dashboard data is used only for chart/summary analytics; the employee-grouped entry list itself still comes from the existing `GET /timesheets/team` data. No new backend endpoint for these five metrics.
- **Completion Rate definition:** KPI target completion — reuses `kpi_completion_rates` / `average_kpi_completion_rate` from the dashboard payload. No new timesheet-approval-rate metric is introduced. Timesheet statuses remain visible per grouped entry, but do not redefine Completion Rate.
- **Employee Progress definition:** Approved hours per employee, reusing `employee_productivity` from the dashboard payload. Does not duplicate the KPI-progress-per-employee visuals already in Sprint 25's `TeamKpisPage`.
- **Productivity Trend:** No existing structured data source (Sprint 12's AI "productivity trend" is a stored text insight, not chart-ready series data), so one small new JSON endpoint is added, reusing `HoursSummaryCalculator` and `PayrollPeriod` (the same helpers `TeamHoursReportController` already uses for exports) to return per-period totals across recent payroll periods. No migration, no schema change, no new business rules. Access matches existing team/report visibility: Supervisor sees their own department, Admin/HR-Finance see org-wide — same scoping already used by `TeamHoursReportController`/`DashboardController`. Used only for the Productivity Trend chart in Sprint 26.
- **Grouped employee total hours:** In the employee-grouped list, an employee's displayed total is the sum of all their visible time entries regardless of timesheet status (reflects what the reviewer currently sees on screen). This is distinct from the dashboard's approved-only hours figures, which remain approved-only for dashboard/payroll analytics.
- **Filters:** Status filter and date-range filter only, applied client-side against the existing (unbounded) `/timesheets/team` payload. No department filter in Sprint 26 (existing Supervisor department-scoping and Admin global-visibility rules are unaffected either way); Admin department filtering is deferred to a later sprint if needed.
- **Scope guardrails:** No changes to existing approve/reject/revision-request behavior, authorization rules, payroll logic, or KPI logic. No migrations. No new business rules beyond what's listed above. Backend changes limited to the one small Productivity Trend endpoint, added only because the existing dashboard endpoint cannot provide multi-period trend data.

## Approved Guardrails For Future Feature-Adjustment Sprints (Not Yet Scheduled Or Implemented)

Recorded for when each of these specific sprints is opened; none of this work has been started or approved for implementation yet, per the "plan one sprint at a time" workflow rule.

- **AI Assistant approach:** Pattern-matched local question handling only — no external LLM providers, no new API keys/credentials, no internal data (company, employee, payroll, KPI, scrum, timesheet, attendance) leaves the app. Supported question categories map to existing computed data only. Responses return a natural-language explanation plus charts/tables where applicable, plus actionable recommendations; unsupported questions get a fallback message listing supported examples. Preserves the existing AI provider architecture and append-only `ai_outputs` behavior (Sprint 11/12) where applicable.
- **Notification update strategy:** Polling-based auto-refresh only — no Laravel Reverb, WebSockets, Pusher, Soketi, or other new realtime infrastructure. Poll notification counts/history at a reasonable interval and update the dropdown, badge counters, and module badges from the polled data. True WebSocket push is documented as a future enhancement, not built now.
- **Attendance scope:** The attendance widget/session tracking stays informational/display-only. No changes to payroll or overtime calculations; payroll continues to read only from approved time entries/timesheets. No automatic creation or modification of time entries from attendance sessions. Attendance sessions may store `time_in`, pause/resume break timestamps, `time_out`, working duration, break duration, and total rendered time. Any future payroll integration requires its own separate planning and approval.
- **Sidebar badges / messages scope:** No real messaging/chat feature, no `messages` table, no chat UI or messaging routes — "Messages (4)" was only an illustrative example of the sidebar-badge pattern. Unread/actionable-count badges may be applied to existing real modules where a count already makes sense or can be safely computed (e.g., Notifications, Account Approvals, Team Timesheets/Approvals, Team Scrum, and KPI only if a safe existing unread/actionable count is available).

## Decisions Still Required

The following remain open and must be resolved before their related sprint begins. Do not invent answers — ask when the sprint is reached:

- Deployment target and production hosting details (including the malware-scanning revisit deferred by the Sprint 13 decisions).
- AI provider selection and external data privacy rules (Sprint 11 is stub-only per its approved decisions; this item now gates only the future swap to a real external provider).
- Whether to raise the password minimum length beyond Laravel's bare 8-character default (Sprint 19 flagged this as recommended, not required — the seeded demo password and every QA doc referencing it would need to change too, so it needs an explicit decision, not a default assumption).
- Whether to publish an explicit `config/cors.php` allowed-origins allowlist instead of relying on Laravel's framework defaults (Sprint 19, defense-in-depth — no known exploit path today given the stateless Bearer-token architecture).
- Real SMTP/mail provider selection, whenever production deployment is decided (currently `MAIL_MAILER=log` for all environments, Sprint 18).

Full question text and traceability: `docs/QUESTIONS.md`.

