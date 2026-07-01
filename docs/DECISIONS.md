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
- Ownership of client/project CRUD, project lifecycle status, project-client cardinality, and multi-project employee assignment are NOT yet decided — see Decisions Still Required.

### Attachments

- Permitted file types: PDF, PNG, JPG, JPEG, DOCX, XLSX.
- Maximum file size: 10MB per file.
- Storage: local disk for MVP, behind an abstraction that can later support cloud storage.
- Malware scanning and retention period are NOT yet decided — see Decisions Still Required.

### General Policy

- If a requirement remains undefined when its sprint is reached, stop and ask. Do not invent additional business rules.

## Sprint 1 Implementation Decisions (Approved)

Approved alongside the Sprint 1 (Authentication And Role Foundation) plan. These resolve the implementation-level gaps flagged in `sprints/SPRINT_01.md` and must be preserved unless explicitly changed.

- **Initial password provisioning:** The Admin sets the initial password directly when creating a user account. No invite-email flow for MVP; that is deferred.
- **Team/department model:** A single `departments` table. For MVP, a Supervisor's "team" means every user who shares the same `department_id` as that Supervisor. No separate teams table.
- **Sanctum authentication style:** Token-based Sanctum authentication for MVP, because the backend and frontend are separate applications and the deployment target is not yet final. Cookie-based SPA (stateful) authentication may be revisited if frontend and backend are later deployed under one domain.

## Decisions Still Required

The following remain open and must be resolved before their related sprint begins. Do not invent answers — ask when the sprint is reached:

- Dashboard role-scoping and refresh behavior (real-time vs. scheduled/manual).
- Client/project CRUD ownership (who can create/manage clients and projects).
- Project lifecycle/status model.
- Project-to-client cardinality (one client per project vs. many).
- Whether employees can be assigned to multiple projects simultaneously.
- Attachment malware scanning requirement.
- Attachment/reference file retention period.
- Deployment target and production hosting details.
- AI provider selection and external data privacy rules.
- Chart/visualization library (dashboard sprint) and PDF/Excel export libraries (reporting sprint) — Claude Code may propose these when reached.

Full question text and traceability: `docs/QUESTIONS.md`.

