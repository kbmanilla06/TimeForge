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

> **Amended in Sprint 39:** the database was explicitly changed from MySQL to PostgreSQL (self-hosted via Docker locally, Supabase-hosted in production) — a deliberate, explicitly-authorized override of this original Sprint 0 decision, not an accidental drift. See "Sprint 39 Implementation Decisions" below for the full reasoning. This line is left as-written above as the historical record of what Sprint 0 actually decided.

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

## Sprint 27 Implementation Decisions (Approved)

Approved for the Sprint 27 (Team Scrum Kanban Redesign) plan. Frontend-only: no backend, route, or migration changes — `GET /daily-scrums/team` is already unbounded and already eager-loads `user`/`comments.author`, so grouping is entirely client-side, same as Sprint 26's timesheet grouping.

- **Employee header collapse:** Interactive expand/collapse per employee card, collapsed by default, matching the Sprint 26 timesheet-grouping interaction pattern for consistency.
- **Notes placement:** Kept as a 4th section alongside Yesterday/Today/Blockers (only rendered when notes exist, same as the pre-redesign behavior) rather than being dropped or folded into another section.
- **Section layout:** Yesterday/Today/Blockers render as side-by-side mini-columns per day-entry (stacking to one column on narrow screens), with a muted "No blockers reported." placeholder when `blockers` is null so the three-column grid stays visually aligned.
- **Preserved unchanged:** comment thread rendering, the "Add a comment" input and `addScrumComment` call, `isScrumLocked` semantics, and the separate `DailyScrumPage` (employee's own single-entry submission page) — this sprint only touches `TeamScrumPage`.

## Sprint 28 Implementation Decisions (Approved)

Approved for the Sprint 28 (AI Insights Chat Assistant) plan, implementing the "AI Assistant approach" guardrail recorded below. No migration — reuses the existing `ai_outputs` table/columns.

- **Architecture:** A new, dedicated `AiAssistantController::ask()` (`POST /ai-assistant/ask`), not a new date/subject-picker flow through the existing `AiOutputController`/`AiSummaryService` — a free-text question doesn't fit that model. `DashboardController`'s private metric methods were extracted into `App\Support\DashboardMetrics` (pure relocation, verified behavior-identical) so both controllers share the same tested department-performance/attendance-trend/KPI-completion-rate logic instead of duplicating it.
- **Query interpretation:** Fully local, deterministic keyword-containment matching (`AssistantCategory::classify()`) — no external NLP or LLM call. Unmatched questions return the required fallback message listing the supported example questions.
- **Permissions:** Admin (organization-wide) and Supervisor (own department only) exclusively — narrower than the full existing AI matrix, which also covers Employee and HR/Finance. Scope is always derived from the requester's role, never user-selected.
- **"Behind schedule" definition:** Employees with logged time but no submitted timesheet for one or more days in the current payroll period — reuses the exact unsubmitted-day concept `SupervisorRecommendationsGatherer` already computes per department, applied to whichever employee set (department or organization) is already scoped for the requester.
- **"Which KPIs declined this week?" reinterpretation:** Answered honestly, not fabricated. Since `progress_value` is an all-time running total with no automatic reversal and no history (Sprint 6/25 decisions), nothing can "decline." The assistant substitutes the nearest real, existing metric — KPIs furthest below their target (ascending `completion_rate` from `kpi_completion_rates`) — and its executive summary explicitly states this substitution rather than pretending to show a decline.
- **Persistence:** Each question is appended as a new `AiOutputType::AssistantQuery` row in the existing `ai_outputs` table (Organization-shaped — both subject foreign keys null, regardless of whether the actual runtime scope was organization-wide or one department; the real scope and full answer are recorded in `source_data`, the audit snapshot). This type is explicitly walled off from the generic `/ai-outputs` endpoints (404) since it doesn't fit their date/subject model; it's served only by its own dedicated endpoint.
- **UI placement:** An Admin/Supervisor-only "Ask AI" mode toggle added alongside the existing report tabs on `AiInsightsPage` (default: "Reports", unchanged for Employee/HR-Finance, who never see the toggle). Charts/tables reuse the existing Recharts setup and `TableCard` components — no new chart library, no new table component.

## Sprint 29 Implementation Decisions (Approved)

Approved for the Sprint 29 (Registration Terms And Conditions Fix) plan. Frontend-only: no migrations, no changes to `RegisterRequest`'s validation rules or `RegistrationController`, no changes to `AccountRequest.terms_accepted_at`.

- **Bugs found and fixed:** No Terms and Conditions document or modal existed anywhere in the codebase — the registration checkbox referenced content that could never actually be opened/read. Separately, the registration `<form>` has `noValidate`, which silently disabled the checkbox's HTML `required` attribute; client-side, nothing previously stopped submitting with the box unchecked (only the server's existing `terms_accepted => required|accepted` 422 caught it). Both are fixed: a real terms modal now exists, and "Create Account" is now explicitly `disabled` client-side until `termsAccepted` is true.
- **Terms content:** Placeholder MVP copy (`TermsAndConditionsContent` in `RegisterPage.tsx`) — six standard sections (acceptance, platform use, data/privacy, account responsibilities, termination, changes to terms). Explicitly **not reviewed by legal** and must be replaced before a real production launch, matching the existing "MVP branding is text-only, no final logo" precedent (Sprint 9/14).
- **Read enforcement:** Opened-once, not scroll-to-bottom. The acceptance checkbox is `disabled` until the new "Read Terms and Conditions" link has opened the modal at least once (`hasViewedTerms` state); closing the modal (via the close button, backdrop click, or Escape) does not revoke that state.
- **Presentation:** A new, first-of-its-kind `components/ui/Modal.tsx` (reusable overlay + centered panel, closes on close-button/backdrop-click/Escape) — no new route, no separate `/terms` page.
- **Backend:** Deliberately unchanged. "Must open before checking" is inherently a client-side-only signal (the server can't verify a modal was opened), so it's enforced entirely in `RegisterPage`. The existing server-side `terms_accepted` validation and `terms_accepted_at` audit timestamp remain the source of truth for actual acceptance.

## Sprint 36 Implementation Decisions (Approved)

Approved for the Sprint 36 (Registration Security) plan — email OTP verification inserted between registration submission and Admin approval: Registration → Email OTP → OTP Verification → Admin Approval → Account Activated.

- **Data model:** Option A — `User`(pending) + `AccountRequest`(submitted) are still created immediately at `POST /register`, exactly as before. A new `email_otps` table (one row per email, overwritten on resend) tracks verification separately; `Admin\AccountRequestController::index()` hides a still-`submitted` request until its user's `email_verified_at` is set. Approved/rejected history remains visible unconditionally regardless of verification status — no backfill needed for pre-Sprint-36 accounts.
- **Notification timing:** `RegistrationReceived` (applicant) and `NewAccountRequestSubmitted` (admins) no longer fire at submission — only the OTP email does. Both fire together once `POST /register/verify-otp` succeeds, matching the approved flow order.
- **OTP parameters:** 6-digit numeric code, hashed at rest (`Hash::make`, never stored or returned in plain text after the outgoing email), 10-minute expiry, 60-second resend cooldown (enforced via the OTP row's own `last_sent_at`, same direct-model-check style as Attendance's "one break per day" rather than a generic rate-limit bucket), 5-attempt cap per code.
- **Anti-enumeration:** `verify-otp` returns the same generic "Invalid or expired code." for a wrong code, an expired code, an exceeded-attempts code, *and* an email with no OTP at all — no distinguishing signal. `resend-otp` mirrors the Sprint 18 forgot-password shape: an email with no pending registration gets the identical generic response as a real resend. The resend cooldown's "please wait Ns" message *is* email-specific (not generic) — accepted low-risk since this only matters to the requester's own just-submitted email, not an arbitrary-email probe.
- **`approve()` guard:** Server-side check that `email_verified_at` is set, independent of the list-hiding — defense in depth, not just UI-hiding.
- **SMTP:** Resolves the "Real SMTP/mail provider selection" item from "Decisions Still Required" below. Google's SMTP relay (`smtp.gmail.com:587`, a Gmail account + App Password) was chosen; `.env.example` documents the shape but ships with `MAIL_MAILER=log` still as the default — real credentials are supplied and tested by the user outside this session (this sandbox has no outbound path to a real SMTP relay to verify live delivery). No code change to `config/mail.php` — its existing generic `smtp` driver already supports any host. `MAIL_ENCRYPTION` is **not** read anywhere in this app's mail config (Laravel 13 uses `MAIL_SCHEME`/port-based negotiation instead) — the `.env.example` comment calls this out explicitly so it isn't documented as a working setting when it silently does nothing.
- **Known gotcha fixed during implementation:** `email_verified_at` is intentionally excluded from `User::$fillable` (never user-settable), so setting it via `update()` would have silently no-op'd exactly like the earlier `TimeEntry::kpi_progress_applied_at` case (Sprint 6) — fixed with the same `forceFill()` pattern.

## Sprint 37 Implementation Decisions (Approved)

Approved for the Sprint 37 (Password Security) plan. Resolves Sprint 19's deferred CAPTCHA evaluation, but only for the two public password endpoints — Sprint 19's own scope (registration) is untouched, and this doesn't reopen that decision.

- **Endpoint scope:** `POST /forgot-password` and `POST /reset-password` only. `ProfileController::changePassword()` (authenticated, already requires the correct current password + a valid session) is deliberately unchanged — CAPTCHA there would add little real security for unusual UX cost.
- **Provider:** Cloudflare Turnstile, behind a `CaptchaVerifier` interface (same swappable-provider shape as `AiProvider`, Sprint 11) so a future provider swap is a config/binding change, not an architecture change.
- **Test strategy:** `CAPTCHA_ENABLED=false` in `phpunit.xml` (same convention as the existing `MAIL_MAILER=array` override there), so none of the ~15 pre-existing forgot/reset-password tests needed any change. A dedicated set of new tests explicitly re-enables it (`config(['captcha.enabled' => true])`) with `Http::fake()` to exercise the real gating logic: missing-token rejection, failed-verification rejection, successful-verification pass-through.
- **Safe defaults:** `.env.example` (both backend and frontend) ships Cloudflare's own published "always passes" test site/secret key pair by default, so local dev works without real keys — swap for real keys from the Cloudflare dashboard before production.
- **Real bug caught during implementation:** the first version made `captcha_token` `['nullable', 'string', new ValidCaptcha]` — but Laravel only runs non-implicit rules (like a plain custom `ValidationRule`) on a field that's actually present; an entirely **absent** `captcha_token` would have skipped the rule altogether regardless of `captcha.enabled`, silently bypassing the whole feature. Fixed with `Rule::requiredIf(fn () => config('captcha.enabled'))` (implicit, so it runs even on absent fields) ahead of the custom rule, with `bail` so a missing token doesn't also duplicate `ValidCaptcha`'s own message. Verified by first confirming the *unfixed* version actually broke 5 existing tests as expected, before re-enabling the phpunit.xml override.

## Sprint 38 Implementation Decisions (Approved)

Approved for the Sprint 38 (Notification System Improvements) plan. No backend changes — `SidebarBadgeController` was already correct; everything here is a frontend reliability fix. "Repair realtime notifications" was scoped as fixing the reliability of the existing polling delivery (Sprint 23's decision), not introducing WebSocket/broadcast infrastructure — no such infrastructure was added.

- **Root cause, sidebar counters:** `NotificationCenter`'s own bell badge used to derive its unread count client-side from only the 5 most-recently-fetched notifications (`RECENT_LIMIT`), while the sidebar's "Notifications" nav-item badge already used the correct total from `SidebarBadgeController::index()` (`$user->unreadNotifications()->count()`). Once a user had more than 5 unread notifications, the two badges were guaranteed to disagree. Fixed by having `NotificationCenter` accept the already-correct count as an `unreadCount` prop instead of re-deriving its own — both badges are now backed by the exact same number.
- **Root cause, doubled polling / rate-limit pressure:** `useSidebarBadges` and `NotificationCenter` used to run two independent, unsynchronized 20-second polling loops, both counting against the same shared `throttle:api` bucket (60/min, keyed by user ID — shared across every open tab, not per-tab). `NotificationCenter` no longer polls on its own timer at all; its recent-notifications list (needed only for the dropdown's content, not the count) is now fetched on mount, when the dropdown opens, and when `unreadCount` increases — using the shared badge poll as the sole timing signal instead of a second independent interval.
- **Root cause, "Too Many Attempts" destroying sessions:** `AuthContext`'s one-time startup `/me` check treated *any* failure — a genuine 401, a transient 5xx, or a 429 from the shared rate limiter — identically, unconditionally clearing the auth token. Since the token lives in `localStorage` (shared across every tab of the same origin), one rate-limited `/me` call in any tab silently logged the user out everywhere, even though the token itself was never invalid. Fixed: the token (and thus the session) is now only cleared on a genuine 401; any other error just leaves the token in place so the next successful check restores the session with no re-login. The same rule now applies to `refreshUser()`, which previously had no error handling at all. A new backend test (`RateLimitTest::test_a_rate_limited_token_still_works_once_the_throttle_window_resets`) proves the same thing server-side: a 429 never touches the Sanctum token, which keeps working once the one-minute window rolls over.
- **Secondary fix, popup (toast) auto-dismiss fragility:** `ToastCard`'s auto-dismiss effect depends on an `onDismiss` callback that `AppLayout` used to pass as a fresh inline function every render, resetting the 6-second dismiss timer on every unrelated re-render (e.g. each badge poll). Latent rather than visibly broken today (poll interval > dismiss delay), but fixed defensively by memoizing `dismissToast`/`handleNewNotification` with `useCallback` in `AppLayout`. A new `Toast.test.tsx` includes a test that deliberately reproduces the old bug pattern (a fresh inline `onDismiss` every render) to prove it would in fact break auto-dismiss, alongside a test proving the current memoized version doesn't.

## Sprint 39 Implementation Decisions (Approved)

Approved for the Sprint 39 (Production Deployment Preparation) plan. Resolves the "Deployment target and production hosting details" item from "Decisions Still Required" below.

- **Explicit locked-stack override:** CLAUDE.md names Supabase as a forbidden stack switch ("Never switch to ... Supabase ... unless explicitly authorized"). Before implementing, I flagged this conflict directly and asked what role Supabase should play — the user explicitly chose a **full Postgres migration** (not storage-only, not Supabase Auth), which is the specific authorization CLAUDE.md requires for this override. A second question resolved file storage separately: **Supabase Storage**, chosen independently of the database decision.
- **Dev/prod parity:** local dev now runs Postgres too (a self-hosted `postgres:16-alpine` container via `docker-compose.yml`, replacing the old `mysql:8.0` service), rather than staying on MySQL locally while only production moves to Postgres. Avoids validating against a different SQL dialect than what actually runs in production. The Dockerfile's PHP extension changed from `pdo_mysql` to `pdo_pgsql` (`libpq-dev` added to the apt install list).
- **Migration risk was low in practice, and verified, not just assumed:** the codebase has zero raw SQL (`DB::raw`/`whereRaw`/etc.) anywhere and no `$table->enum()` migrations (only two `json()` columns, which Laravel translates natively to Postgres). `config/database.php` already ships Laravel's unmodified stock `pgsql` connection. Verified for real: rebuilt the local Docker stack, ran `php artisan migrate:fresh` and `db:seed` against a genuine Postgres container (all 27 migrations applied with zero errors), and smoke-tested login/`/me`/rate-limiting and a live CAPTCHA verification round-trip to Cloudflare's real endpoint against it — not just static review.
- **Real bug found and fixed:** `TimeEntryAttachment`, `TimeEntryAttachmentController`, and `ProfileController` (6 call sites) hardcoded `Storage::disk('local')`, so the `FILESYSTEM_DISK` env var had no effect on attachments or profile pictures regardless of its value. Fixed to use the default disk facade so `FILESYSTEM_DISK=s3` (pointed at Supabase Storage's S3-compatible endpoint) now actually takes effect. No change to `config/filesystems.php` — its existing generic `s3` disk driver already supports Supabase Storage.
- **Two real gaps found during live verification, deliberately not fixed this sprint** (out of the approved env/deployment-config scope): (1) the Google SMTP credentials already present in the local `.env` are rejected by Google (535 bad credentials) even though outbound connectivity itself works — a credential problem the user needs to fix, not a code problem; (2) `RegistrationController::store()` isn't transactionally safe against a mail-send failure — a real request during verification left an orphaned `User`/`AccountRequest` row with no OTP ever delivered when the notify() call threw. Both are documented in `docs/DEPLOYMENT.md`'s "Known Gaps" section as follow-up recommendations, not implemented here.
- **Docs updated for the new default stack:** `docs/DEPLOYMENT.md` (new), `docs/SETUP.md` and `README.md` (stale MySQL references corrected to Postgres; README's "Production Notes" section, which said deployment target was still an open decision, now points to `docs/DEPLOYMENT.md`).

## Sprint 45 Implementation Decisions (Approved)

Approved for the Sprint 45 (Reliable Production Email Readiness) plan. Resolves gap (2) from Sprint 39's "two real gaps... deliberately not fixed" note above.

- **Correction to the Sprint 39/40 framing:** `RegistrationController::store()` was already transaction-safe in the sense that mattered — the `User`/`AccountRequest` creation is wrapped in `DB::transaction()`, and `notify()` is called only after that commits, specifically so a mail failure can never roll back an otherwise-successful registration. The actual bug was narrower: no `try/catch` existed around the `notify()` call itself, so a mail failure still surfaced as a raw, uncaught 500 to the client, even though the account had already been created successfully.
- **A more serious finding than expected, uncovered while investigating the above:** `AuthController::forgotPassword()`'s unguarded `Password::sendResetLink()` call meant a *real* registered email hitting a genuine mail-send failure could return a distinguishable 500, while a *fake* email is never even attempted to be mailed (Laravel's broker checks existence first) and always returns the generic 200. This is a genuine enumeration side-channel undermining the Sprint 18 anti-enumeration guarantee — confirmed live against this environment's own broken Gmail credentials (repeated calls to the same real email intermittently returned 200 and 500, consistent with Laravel's internal per-email resend-throttle suppressing the actual send attempt on some calls).
- **Fix:** all six mail-triggering call sites (`RegistrationController::store()`/`verifyOtp()`/`resendOtp()`, `Admin\AccountRequestController::approve()`/`reject()`, `AuthController::forgotPassword()`) now catch failures and log via `report()`, returning the exact same response the endpoint already gives on success — since in every case the underlying state change had already succeeded independent of notification delivery. Each fix was proven, not assumed: a test exists per call site that simulates a mail outage (mocking `Illuminate\Contracts\Notifications\Dispatcher::send()` to throw) and was independently confirmed to fail against the un-fixed code before passing against the fix.
- **Mail provider choice stays undecided, deliberately:** `docs/DEPLOYMENT.md` now documents Google SMTP, SES, Postmark, Resend, and Mailgun as options with honest tradeoffs rather than presenting Google SMTP as the only choice. Only the generic `smtp` transport (Google's relay) works today with zero new dependencies; SES/Postmark/Resend/Mailgun each require an additional Composer package not currently installed — explicitly flagged as its own future decision, not silently added.
- **Still open, unchanged:** the Google SMTP credentials in the local `.env` are still rejected by Google (535 bad credentials) — a credential-rotation problem, not something a code sprint can fix.

## Sprint 47 Implementation Decisions (Approved)

Approved for the Sprint 47 (Backup and Restore Readiness) plan. Documentation and verification only — no application code, migrations, or `docker-compose.yml` changes; no new infrastructure or paid backup service.

- **Custom-format `pg_dump` (`-F c`), not plain SQL:** compressed, and supports `pg_restore`'s selective/parallel restore. Same command shape for Docker local and Supabase — only the connection target changes.
- **Restore-to-disposable-database as the standard verification pattern, not overwrite-in-place:** every restore documented in `docs/BACKUP_RESTORE.md` defaults to restoring into a brand-new, throwaway database name, with the destructive overwrite-the-real-database variant documented separately and explicitly labeled "only during an actual incident, never as a drill."
- **Local storage backup needs no Docker-specific step:** `docker-compose.yml` bind-mounts `./backend:/var/www/html` rather than using a named volume for the backend container, so `storage/app/private`/`storage/app/public` already exist directly on the host — confirmed via `config/filesystems.php`'s `local` disk root. A plain `tar` of that host path is a complete backup.
- **Supabase Dashboard-managed backups as the primary safety net, manual `pg_dump` as a supplementary on-demand snapshot:** rather than only documenting one or the other. Dashboard backups need no tooling and cover the general case; a manual dump is recommended immediately before a risky migration or credential rotation.
- **Backup dump files are gitignored by pattern, not by relying on people remembering not to commit them:** root `.gitignore` now excludes `backups/`, `*.dump`, `*.sql`, `*.sql.gz` (Sprint 47) — confirmed no such file was tracked in the repo before adding the rule, so this couldn't silently un-ignore something already committed.
- **Verified live, not just documented from memory:** a real `pg_dump` of the actual local Postgres database was restored into a disposable database (`timeforge_restore_test_sprint47`) and compared against the real one — table count, row counts on `users`/`timesheets`/`audit_logs`/`departments`, and field-level content (not just counts) all matched exactly. The disposable database was then dropped; the real `timeforge` database was never overwritten, dropped, or modified at any point. Full detail in `docs/BACKUP_RESTORE.md`'s "Verification Performed (Sprint 47)" section.

## Sprint 48 Implementation Decisions (Approved)

Approved for the Sprint 48 (Admin Company Settings Foundation) plan.

- **Overtime multiplier stays env-only, read-only in Company Settings:** Sprint 8's decision ("configurable via environment/config, not a database-backed settings UI") is preserved unchanged, resolving a direct conflict with this sprint's own initial scope wording ("edit if safe"). `GET /api/company-settings` surfaces the current value (still sourced from `config('payroll.overtime_multiplier')`) for display; no request field can set it, and `UpdateCompanySettingsRequest`'s validation rules don't include it at all.
- **Payroll period type is a static read-only label, not a new setting:** `PayrollPeriod::resolve()`'s fixed semi-monthly algorithm has no config today, and adding one would be a payroll formula redesign — explicitly this sprint's own non-scope. `CompanySetting::toDisplayArray()` returns a hardcoded string ("Semi-monthly: 1st–15th, 16th–end of month") describing the current fixed behavior. Configurable payroll periods, if ever wanted, require a dedicated future payroll sprint.
- **Default timezone is store-and-display only this sprint:** no per-organization timezone concept existed anywhere before this sprint (`config('app.timezone')` is hardcoded `'UTC'` and nothing reads it). Admins can set/view `default_timezone` in Company Settings, but it has zero effect on any date/time rendering anywhere else in the app yet — wiring it into actual display logic (e.g. formatting report timestamps) is left for a future sprint's explicit decision.
- **Table-based singleton, not config-only and not a key-value/EAV table:** company name, contact email, timezone, and logo are meant to be admin-editable at runtime, which env/config files can't support without a redeploy. Since there's exactly one organization (no multi-tenancy), a single-row `company_settings` table with typed columns is simpler than a generic key-value settings table — `CompanySetting::current()` always returns/creates the one row.
- **Read is broader than write:** `GET /api/company-settings` and `GET /api/company-logo` are available to any authenticated user (not admin-only), because the one approved "low-risk display area" — the AppLayout sidebar showing the configured company name/logo instead of a hardcoded "TimeForge" literal — renders for every role. Only the `PATCH`/logo-upload endpoints are gated `role:admin`, matching every other admin resource's existing middleware convention (no new Policy class).
- **Logo reuses the Sprint 44 profile-picture pattern exactly:** same private-disk storage, same replace-on-reupload behavior, same authenticated streamed-download approach (`Storage::response()`) rather than a public URL — consistent with this app's established "no public bucket access" security posture. A shared `CompanySettingsContext` (mirroring `AuthContext`'s `pictureUrl` pattern from Sprint 31) fetches the logo as an object URL once and shares it between the sidebar and the settings page, rather than each fetching independently.
- **Audit logging extended, not introduced as new scope:** `company_settings.updated` (only the fields that actually changed, `updated_at` excluded) and `company_settings.logo_uploaded` are recorded via the existing Sprint 46 `AuditLog::record()` system, consistent with every other admin-editable resource already instrumented — not a new mechanism.

## Sprint 49 Implementation Decisions (Approved)

Approved for the Sprint 49 (Leave and Holiday Management Foundation) plan.

- **Payroll calculations are untouched:** `HoursSummaryCalculator`, `PayrollController`, `DashboardController`, `PayrollValidationGatherer`, and `PayrollPeriod` are not modified. Neither `leave_requests` nor `holidays` is read by any of them this sprint — both tables are purely additive and inert from payroll's perspective, matching the sprint's explicit instruction and the non-scope items (no accrual balances, no paid/unpaid deduction automation).
- **`leave_requests` mirrors `Timesheet`'s exact approval shape:** `user_id`, a `status` enum (pending/approved/rejected), `reviewed_by`/`reviewed_at`. `LeaveRequestPolicy::review()` is a direct copy of `TimesheetPolicy::review()` — the owner's department Supervisor or an Admin may approve/reject, never the owner. `leave_type` is a simple three-value enum (vacation/sick/other) with no accrual or policy rules behind it, per this sprint's own non-scope ("no complex leave policies").
- **`holidays` is one row per calendar date, no recurrence rule:** adding a real recurrence engine (e.g. "every December 25th") would be exactly the kind of complexity the non-scope rules out ("no calendar integration"). A yearly holiday is simply re-added the following year by an Admin.
- **Read is broader than write, same split as Company Settings (Sprint 48):** `GET /api/holidays` is available to any authenticated user (needed for the Home dashboard banner and the employee-facing leave page), while `POST`/`PATCH`/`DELETE /api/admin/holidays` stay `role:admin`-gated with no dedicated Policy — matching Department/Client/Project's existing convention. Leave request routes, by contrast, use a dedicated `LeaveRequestPolicy` (like Timesheets) rather than route-group-only gating, since "reviewer" isn't a flat role check — it's department-scoped.
- **One low-risk display point chosen for the vaguer scope line** ("attendance/reporting may display leave/holiday context... where low-risk"): a small banner on the Home dashboard shows if today is a company holiday or the current user has an approved leave day today. Payroll/Team Hours Report exports are deliberately not touched this sprint — that would mean changing report response shape, a larger and separate change not required by scope.
- **Notifications are database-only, not mail:** `LeaveRequestSubmitted`/`Approved`/`Rejected` use `via() => ['database']` only, matching `TimesheetSubmitted`/`Approved`/`Rejected`'s exact precedent (an internal workflow between employee/supervisor, unlike account/auth notifications which use `['mail', 'database']`).
- **Audit logging extended, not introduced as new scope:** `leave_request.approved`, `leave_request.rejected`, `holiday.created`, `holiday.updated`, and `holiday.deleted` are recorded via the existing Sprint 46 `AuditLog::record()` system, consistent with every other admin-editable/reviewable resource already instrumented.
- **Rejection reason is optional, not required:** matches `AccountRequestController::reject()`'s Sprint 17 precedent (optional `remarks`), not `TimesheetController::reject()`'s (required `comment`) — a supervisor/admin isn't forced to explain a leave rejection, though they can.

## Sprint 50 Implementation Decisions (Approved)

Approved for the Sprint 50 (Payroll Exception Reports) plan. Read-only detection only — the payroll formula, `HoursSummaryCalculator`, `PayrollFigures`, and `PayrollPeriod` are not modified.

- **Only employees with at least one triggered exception are returned:** this is a problems list, not a full roster — a "clean" employee never appears in the report, keeping it focused and actionable rather than requiring HR/Admin to scan past rows that need no attention.
- **Unapproved-submitted and rejected/revision-requested are two separate counts, not one bucket:** `HoursSummaryCalculator` already bundles `Submitted` and `RevisionRequested` together into one `pending_minutes` figure for payroll math purposes, but the exception report needs to distinguish "awaiting first review" from "sent back to the employee" — these are different problems requiring different follow-up. `PayrollExceptionReport` queries `Timesheet` directly for this rather than trying to back-derive it from `HoursSummaryCalculator`'s output.
- **Attendance-without-entries only ever applies to employees who have at least one attendance session in the period:** never synthesizes an expectation of attendance where none was ever recorded, per the scope's own "if attendance exists" qualifier — this correctly stays silent for anyone who doesn't use the attendance widget at all.
- **Entries-without-submission surfaces exactly the gap `HoursSummaryCalculator` already silently skips:** confirmed by reading its code — a day's `TimeEntry` rows with no linked `Timesheet` (`timesheet_id IS NULL`) are `continue`'d past entirely today, meaning logged-but-never-submitted time is currently invisible anywhere in the app. This exception is the first thing to surface it.
- **Overtime threshold is a single new global, env-only config value** (`payroll.overtime_exception_threshold_hours`, `PAYROLL_OVERTIME_EXCEPTION_THRESHOLD_HOURS`, default 20 hours/period) — same precedent as Sprint 8's `overtime_multiplier`: not a per-employee override, not an in-app settings screen. Reuses `HoursSummaryCalculator`'s existing per-employee overtime-minutes computation rather than reimplementing the 8-hour/day daily overtime split.
- **Export reuses the existing Payroll/Team Hours Report pattern exactly, no new infrastructure:** same `Pdf::loadView()->download()` and `ExcelExporter::download()` calls, a new but structurally identical Blade view, and the same `payroll_exceptions.exported` `AuditLog::record()` pattern Sprint 46 already established for `payroll.exported`.
- **No auto-correction, no AI/anomaly detection, no automatic notifications** — explicit non-scope. HR/Admin views this on-demand, the exact same interaction model as the existing Payroll report; nothing is emailed or pushed to anyone as a result of viewing or exporting it.
- **`PayrollExceptionController` mirrors `PayrollController` structurally rather than sharing a base class:** same private `authorizeView()`/`resolvePeriod()` methods duplicated rather than extracted, matching the existing precedent that `PayrollController` and `TeamHoursReportController` already each maintain their own near-identical copies of this logic rather than sharing an abstraction.

## Sprint 51 Implementation Decisions (Approved)

Approved for the Sprint 51 (AI Source Transparency and Governance) plan.

- **Most of this sprint's scope was already implemented before it started, verified by inspection rather than assumed:** `AiOutputController::present()` already returned `provider`, `prompt_version`, `generated_by`/`generated_by_name`, and `generated_at`; `authorizeAccess()` already fully enforced the Sprint 11/12 permission matrix (Employee self-only, Supervisor own-department, HR/Finance payroll-validation-only, Admin everything), already covered by existing passing tests. The one genuine gap: `source_data` was — and to a large extent still is — completely invisible client-side, even in condensed form, and `prompt_version` was fetched by the API but never rendered in the UI.
- **`source_summary` is a new derived field, not a change to what `source_data` stores:** no gatherer was modified. `AiSourceSummary::summarize()` computes counts and categorical facts from the existing `source_data` shape at serialization time in `present()` — after `authorizeAccess()` has already run, so it introduces no new exposure surface for an unauthorized viewer, only new (safe) content for an already-authorized one.
- **Counts and categorical facts only — never free text, raw values, or employee name lists, even for an already-authorized viewer:** confirmed by inspection that several gatherers include verbatim task descriptions and scrum text (`DailyWorkSummaryGatherer`) or blocker text (`RecurringBlockersGatherer`), and several list employee names against sensitive facts (missing hourly rate, unsubmitted days, open timers, zero KPI progress) in `PayrollValidationGatherer`/`SupervisorRecommendationsGatherer`. `source_summary` reduces every one of these to a count (e.g. `employees_missing_rate_count` instead of a name list) — verified by tests that assert specific names and blocker text are absent from the JSON-encoded summary, not just that the summary "looks right."
- **`AiAssistantController::ask()` is unchanged:** it returns full detail directly to the same requester who just asked the question — there's no "viewing someone else's past assistant query" path through that endpoint, so no cross-viewer exposure question applies there, and `AiOutputType::AssistantQuery` remains explicitly excluded from `AiOutputController` (404 guard, unchanged).
- **UI addition, not a redesign:** `prompt_version` added next to the existing provider/date/generator line; a new "Generated from" list rendering `source_summary` underneath the existing content block, for both the latest result and each history entry. No existing layout, tab, or interaction changed.

## Sprint 52 Implementation Decisions (Approved)

Approved for the Sprint 52 (Health Checks and Error Monitoring Readiness) plan.

- **Laravel's built-in `/up` route exists but isn't fit for purpose, so a new dedicated `GET /health` was added instead of trying to repoint `/up`:** confirmed live that `/up` currently returns the full HTML welcome page (200 OK) — it proves only that the app booted, checks nothing, and isn't practical to inject custom dependency-check logic into via `bootstrap/app.php`'s `health:` routing helper. `GET /health` is fully additive; `/up` is untouched.
- **Redis check pings the Redis connection directly, not the cache store:** `CACHE_STORE=database` by default but `QUEUE_CONNECTION=redis` — Horizon/queued work depend on Redis even though the cache facade may never touch it. Checking Redis directly is the more accurate signal for what this app actually needs Redis for.
- **Storage check is a real put/read/delete round-trip against a small marker file, not a "is this path writable" check:** local and Supabase Storage (`s3`) disks have no shared primitive for the latter — a real round-trip is the only check that works identically regardless of which driver is configured.
- **Real gap discovered and documented, not fixed:** running the new check against this environment's own Docker container reports `redis: error` — confirmed live that `Redis::connection()->ping()` throws `Class "Redis" not found`, meaning neither the `phpredis` extension nor `predis/predis` is actually installed despite `QUEUE_CONNECTION=redis` being configured. Fixing the Docker image/dependency gap is out of this documentation-and-monitoring sprint's scope; flagged in `docs/DEPLOYMENT.md` instead, since surfacing exactly this kind of gap is the point of building the check.
- **Response never includes hostnames, credentials, DSNs, or raw exception messages, proven not just asserted:** every check catches `\Throwable` (not `\Exception` — confirmed the Redis failure above is a PHP `\Error`, which doesn't extend `\Exception`), reports the real exception via `report()`, and returns only `"status": "error"` publicly. A test that forces a failure containing a fake secret/hostname and asserts both are absent from the response was verified to fail against a deliberately-leaky version of the code before confirming it passes against the fix.
- **Public and unauthenticated, rate-limited via the existing `throttle:lookup` bucket:** standard convention for monitoring/load-balancer tooling, which generally can't authenticate. No new rate limiter — reuses the Sprint 19 "harmless public read" bucket (30/min per IP) rather than inventing a new one.
- **200 if every check passes, 503 if any fails:** standard health-check convention so a monitor can act on the HTTP status code alone without parsing the response body.
- **Error monitoring (Sentry/Bugsnag) is documentation-only, per explicit non-scope:** no package installed, nothing wired up. Documented that every existing `catch (\Throwable $e) { report($e); }` call site (Sprint 45 mail resilience, Sprint 46 audit logging) already flows through Laravel's exception handler — the same hook point a real provider would use — so wiring one up later requires zero changes to any of that existing code, only a package install and one bootstrap step.
## Sprint 53 Implementation Decisions (Approved)

Approved for the Sprint 53 (Fix Redis Runtime Gap) plan.

- **`predis/predis` selected as the Redis client:** It is a native PHP Composer package, avoiding the need to compile and configure the `phpredis` PECL C extension in the Docker image. This keeps the [docker/php/Dockerfile](file:///Users/kbmanilla/Desktop/TimeForge/docker/php/Dockerfile) clean and ensures portability for host-direct environments without requiring the host system to compile extra extensions.
- **`REDIS_CLIENT` set to `predis` in environment configuration:** Both [.env](file:///Users/kbmanilla/Desktop/TimeForge/backend/.env) and [.env.example](file:///Users/kbmanilla/Desktop/TimeForge/backend/.env.example) updated to set `REDIS_CLIENT=predis`.
- **Health check gap resolved:** The `/health` endpoint now returns `200 OK` with Redis status reporting `ok` and successfully performing pings.

## Sprint 54 Implementation Decisions (Approved)

Approved for the Sprint 54 (Real Mail Delivery Readiness) plan.

- **Artisan command `mail:test` added for testing connectivity**: Registered in [routes/console.php](file:///Users/kbmanilla/Desktop/TimeForge/backend/routes/console.php) to allow testing any configured mail driver safely with email validation and verbose error printing on failure.
- **Guidance on transactional mailers added to environment configurations**: Updated [.env.example](file:///Users/kbmanilla/Desktop/TimeForge/backend/.env.example) to warn against Google SMTP pitfalls in production and document the standard options for transactional mailers (Resend, Postmark, SES).
- **Mail verification checklists added to deployment documentation**: Updated [DEPLOYMENT.md](file:///Users/kbmanilla/Desktop/TimeForge/docs/DEPLOYMENT.md) with a clear pre-flight verification checklist for mail delivery.
- **Preserved existing local/development behavior**: Default mail driver remains `MAIL_MAILER=log` to prevent local development email attempts from throwing errors or leaking information. Anti-enumeration and graceful error catch rules remain completely intact.
- **Mail-failure resilience (Sprint 45)**: registration (OTP issue/verify/resend), account approve/reject, and forgot-password were all previously vulnerable to an unguarded `notify()`/`sendResetLink()` call surfacing a raw 500 on a mail-provider failure — worse, `forgotPassword()` specifically had a real, confirmed enumeration side-channel under mail failure (a real email could 500 while a fake one always returned the generic 200). All six call sites are now wrapped, logged via `report()` on failure, and returning the exact same response the endpoint already gives on success. Each fix was proven, not assumed: a test exists per call site that simulates a mail outage by mocking the notification dispatcher — each test was independently verified to fail against the un-fixed code before confirming it passes against the fix.

## Sprint 55 Implementation Decisions (Approved)

Approved for the Sprint 55 (Error Monitoring Integration) plan.

- **Sentry chosen as default error monitoring provider**: Native integration with Laravel exception pipeline and React error boundaries is robust and low-risk.
- **Configuration-gated and disabled by default**: Integrations remain dormant unless `SENTRY_LARAVEL_DSN` and `VITE_SENTRY_DSN` are set.
- **Enforced strict PII scrub boundaries**: Configured `send_default_pii => false` on both backend and frontend, and disabled SQL query/binding logs inside Sentry's breadcrumbs.

## Sprint 56 Implementation Decisions (Approved)

Approved for the Sprint 56 (Real Production Credential Cutover Checklist) plan.

- **Created production credential cutover checklist**: Documented in [DEPLOYMENT.md](file:///Users/kbmanilla/Desktop/TimeForge/docs/DEPLOYMENT.md) with strict warnings against copying dev environment secrets.
- **Formulated group verification runbook**: Provided step-by-step commands for testing DB, Redis, S3 private storage round-trips, mail delivery (`mail:test`), Cloudflare site keys, and Sentry mock exceptions.

## Sprint 57 Implementation Decisions (Approved)

Approved for the Sprint 57 (Password Policy Decision and Implementation) plan.

- **Strengthened default password rules globally**: Set minimum length to **10 characters**, requiring **lowercase, uppercase letters, and numbers** in [AppServiceProvider.php](file:///Users/kbmanilla/Desktop/TimeForge/backend/app/Providers/AppServiceProvider.php).
- **Preserved seeder and login backward compatibility**: Database seeders (running in dev/demo) and login endpoints bypass complexity validation checks, keeping user passwords as `'password'` for local demo convenience.
- **Updated unit test payloads**: Adjusted all test payloads to compliant passwords.

## Sprint 58 Implementation Decisions (Approved)

Approved for the Sprint 58 (AI Provider Decision and Privacy Guardrails) plan.

- **Local Deterministic Stub chosen for production**: Retained `StubAiProvider` as the active AI generator to ensure 100% data privacy, zero latency, and $0 token costs.
- **Established privacy guardrails guide**: Formulated [AI.md](file:///Users/kbmanilla/Desktop/TimeForge/docs/AI.md) defining strict data exclusion blocklists (credentials, raw PII, rates) and token mapping guidelines for potential future cloud AI migrations.

## Approved Guardrails For Future Feature-Adjustment Sprints (Not Yet Scheduled Or Implemented)

Recorded for when each of these specific sprints is opened; none of this work has been started or approved for implementation yet, per the "plan one sprint at a time" workflow rule.

- **AI Assistant approach:** Implemented in Sprint 28 — see "Sprint 28 Implementation Decisions" above. (Originally recorded here as a guardrail: pattern-matched local question handling only, no external LLM providers, no new API keys/credentials, no internal data leaving the app, existing AI provider architecture and append-only `ai_outputs` behavior preserved — all upheld as built.)
- **Notification update strategy:** Polling-based auto-refresh only — no Laravel Reverb, WebSockets, Pusher, Soketi, or other new realtime infrastructure. Poll notification counts/history at a reasonable interval and update the dropdown, badge counters, and module badges from the polled data. True WebSocket push is documented as a future enhancement, not built now.
- **Attendance scope:** The attendance widget/session tracking stays informational/display-only. No changes to payroll or overtime calculations; payroll continues to read only from approved time entries/timesheets. No automatic creation or modification of time entries from attendance sessions. Attendance sessions may store `time_in`, pause/resume break timestamps, `time_out`, working duration, break duration, and total rendered time. Any future payroll integration requires its own separate planning and approval.
- **Sidebar badges / messages scope:** No real messaging/chat feature, no `messages` table, no chat UI or messaging routes — "Messages (4)" was only an illustrative example of the sidebar-badge pattern. Unread/actionable-count badges may be applied to existing real modules where a count already makes sense or can be safely computed (e.g., Notifications, Account Approvals, Team Timesheets/Approvals, Team Scrum, and KPI only if a safe existing unread/actionable count is available).

## Decisions Still Required

The following remain open and must be resolved before their related sprint begins. Do not invent answers — ask when the sprint is reached:

- ~~Deployment target and production hosting details~~ — resolved in Sprint 39 (Supabase Postgres + Supabase Storage); see "Sprint 39 Implementation Decisions" above and `docs/DEPLOYMENT.md`.
- Malware scanning revisit for uploads (Sprint 13 decision explicitly deferred this "to be revisited at deployment/security hardening" — Sprint 39 was that moment but it wasn't in its approved scope, so this stays open).
- ~~AI provider selection and external data privacy rules~~ — resolved in Sprint 58 (Local Deterministic Engine default, strict privacy guardrails); see "Sprint 58 Implementation Decisions" above and `docs/AI.md`.
- ~~Whether to raise the password minimum length beyond Laravel's bare 8-character default~~ — resolved in Sprint 57 (minimum 10 characters, mixed case, and numbers); see "Sprint 57 Implementation Decisions" above.
- ~~Whether to publish an explicit config/cors.php allowed-origins allowlist beyond defaults~~ — resolved in Sprint 43 (CORS_ALLOWED_ORIGINS environment variable and config/cors.php configuration).
- ~~Real SMTP/mail provider selection~~ — resolved in Sprint 36 (Google SMTP relay); see "Sprint 36 Implementation Decisions" above. `MAIL_MAILER` stays `log` by default until real credentials are supplied.

Full question text and traceability: `docs/QUESTIONS.md`.
