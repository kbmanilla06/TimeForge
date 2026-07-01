# TimeForge Clarification Questions

Sections A-P have been answered and approved as MVP decisions. The full decision text is the source of truth in `docs/DECISIONS.md`; this file is preserved for traceability between each original question and its approved answer.

Section Q remains open. Any question marked **OPEN** must be answered before its related sprint begins. Per the approved general policy (Section R), Claude Code must ask before implementing anything still undefined rather than inventing a rule.

## A. Business And SaaS Model — RESOLVED (MVP)

1. Is TimeForge single-company only for the internship, or should it support multiple organizations as a true multi-tenant SaaS?
   **Answer:** Single company only for MVP. Do not implement full multi-tenancy yet.
2. If multi-tenant, should users, departments, projects, clients, KPIs, timesheets, and payroll records be isolated by organization?
   **Answer:** Not applicable for MVP. Design the database cleanly so multi-tenancy can be added later, but do not add organization isolation unless needed for MVP.
3. Are subscriptions, plans, payments, or billing required for version 1.0?
   **Answer:** Out of scope for version 1.0.

## B. User Roles And Permissions — RESOLVED (MVP)

1. What exact permissions should each role have?
   **Answer:** Four roles: Employee, Supervisor, HR/Finance, System Administrator. Exact permissions defined by answers 3-5 below plus each module's approval rules.
2. Can one user have multiple roles, such as Supervisor and HR?
   **Answer:** No. For MVP, each user has one primary role only.
3. Can supervisors only see their assigned team, or all employees in their department?
   **Answer:** Supervisors can only see employees assigned to their team or department.
4. Can HR and Finance edit timesheets, or only view/export approved payroll data?
   **Answer:** HR/Finance can view approved timesheets, attendance summaries, payroll reports, and exports. They cannot edit employee-submitted timesheets.
5. Who can create users: Admin only, or HR too?
   **Answer:** Only System Administrators can create, edit, deactivate, and assign users.

## C. Authentication And Security — RESOLVED (MVP)

1. Should login use email and password only?
   **Answer:** Yes.
2. Is email verification required?
   **Answer:** Not required for MVP.
3. Is password reset required?
   **Answer:** Required.
4. Is two-factor authentication required?
   **Answer:** Not required for MVP.
5. Should accounts require admin approval before use?
   **Answer:** Yes. Admin approval is required before a new account can actively use the system.

## D. Time Tracking — RESOLVED (MVP)

1. Can employees manually add time entries, or only start/stop timers?
   **Answer:** Both. Employees can use start/stop timers and can also manually add time entries.
2. Can employees edit time entries after submission?
   **Answer:** Employees can edit draft entries before submission. Submitted entries cannot be edited unless a supervisor requests revision.
3. Are overlapping time entries allowed?
   **Answer:** No.
4. Should break time be tracked?
   **Answer:** Not tracked separately in MVP.
5. Should idle time be detected?
   **Answer:** Out of scope.
6. Should the system capture screenshots or activity monitoring, or is that out of scope?
   **Answer:** Out of scope.
7. Are employees allowed to submit future-dated work logs?
   **Answer:** Not allowed.

## E. Timesheet Approval Workflow — RESOLVED (MVP)

1. Is approval done per time entry, per day, per week, or per payroll period?
   **Answer:** Per submitted daily timesheet.
2. When a supervisor requests revision, what can the employee edit?
   **Answer:** The employee can edit the rejected/revision-requested timesheet fields and resubmit.
3. After final approval, can a timesheet be reopened?
   **Answer:** Not by the employee. Only a System Administrator can reopen it for correction.
4. Is there a second-level approval by HR or Finance?
   **Answer:** No, not in MVP.
5. Should approval actions trigger notifications?
   **Answer:** Yes, in-app notifications, if notifications are implemented.

## F. Payroll — RESOLVED (MVP)

1. What is the exact payroll formula?
   **Answer:** Estimated payroll = (approved regular hours × hourly rate) + (approved overtime hours × overtime rate).
2. Are hourly rates stored per employee?
   **Answer:** Yes.
3. Are overtime rates required?
   **Answer:** Yes. Defaults to 1.25x hourly rate unless changed by admin.
4. What counts as overtime?
   **Answer:** Any approved work beyond 8 hours in one day.
5. Are taxes, deductions, benefits, or allowances in scope?
   **Answer:** Out of scope for MVP.
6. Should payroll reports be final payroll records or only estimates?
   **Answer:** Estimates only, not final disbursement records.
7. Are payroll periods always semi-monthly, or configurable per organization?
   **Answer:** Semi-monthly by default: 1st-15th and 16th-end of month.

## G. KPI Management — RESOLVED (MVP)

1. Are KPIs numeric only, or can they be qualitative?
   **Answer:** Numeric for MVP.
2. Who creates and assigns KPIs?
   **Answer:** System Administrator creates KPIs. Supervisors can assign KPIs to employees in their team/department.
3. Can KPIs be assigned by role, department, project, or individual employee?
   **Answer:** Yes, all are allowed, but MVP prioritizes individual and department assignment.
4. How should approved work logs update KPI progress?
   **Answer:** Only when the work log is linked to a KPI and includes a completed quantity/value.
5. Can employees manually report KPI progress?
   **Answer:** Yes, through work logs.
6. Do supervisors approve KPI progress separately?
   **Answer:** No. KPI progress is approved through timesheet approval.

## H. Daily Scrum — RESOLVED (MVP)

1. Is one daily scrum submission required per workday?
   **Answer:** Yes.
2. Can employees edit a submitted scrum?
   **Answer:** Yes, before supervisor review.
3. Should supervisors approve scrum entries or only comment on them?
   **Answer:** Supervisors comment; formal approval is not required in MVP.
4. Should recurring blockers be detected manually, by AI, or both?
   **Answer:** Manually first. AI detection can be added later.

## I. AI Integration — RESOLVED (MVP)

1. Which AI provider should be used?
   **Answer:** Not locked yet. Build behind an interface/service layer so the provider can be configured later.
2. Should AI integration be implemented in version 1.0 or stubbed behind an interface first?
   **Answer:** Implement as a stub/mock service first for MVP unless API credentials are provided.
3. Should AI outputs be saved permanently?
   **Answer:** Yes, saved permanently with a source data reference.
4. Should users be able to regenerate AI summaries?
   **Answer:** Yes, users with permission can regenerate them.
5. Should supervisors approve AI-generated recommendations?
   **Answer:** No approval needed, but AI output must be labeled as AI-generated.
6. Are there privacy rules for sending employee work data to AI services?
   **Answer:** Do not send sensitive employee data to external AI services until an AI provider and privacy rules are approved.

## J. Reporting And Exports — RESOLVED (MVP)

1. What exact report formats are required for PDF and Excel?
   **Answer:** Layouts can be proposed during the reporting sprint.
2. Are exported reports branded?
   **Answer:** TimeForge branding text only for MVP; no final logo required yet.
3. Who can export reports?
   **Answer:** System Administrator and HR/Finance can export reports. Supervisors can export team reports.
4. Should exports be generated synchronously or through queues?
   **Answer:** Small exports can be synchronous. Large exports should use queues.
5. Should generated reports be stored in the system?
   **Answer:** Not required for MVP unless queue-based export is used.
6. Should Claude Code propose specific PDF and Excel export libraries during the relevant sprint, or does the sponsor require specific ones?
   **Answer:** Claude Code may propose Laravel-friendly PDF and Excel libraries during the relevant sprint.

## K. Notifications — RESOLVED (MVP)

1. Are email notifications required?
   **Answer:** Optional, can be deferred.
2. Are in-app notifications required?
   **Answer:** Required for approval events in MVP.
3. Which events should trigger notifications?
   **Answer:** Timesheet submitted, approved, rejected, revision requested, payroll report ready.
4. Should reminders be sent for missing timesheets or daily scrum entries?
   **Answer:** Can be deferred.

## L. UI / UX — RESOLVED (MVP)

1. Is there an existing brand guide, logo, or color palette?
   **Answer:** No final brand guide exists yet.
2. Should the UI prioritize desktop, mobile, or both equally?
   **Answer:** Responsive UI, desktop-first but usable on mobile.
3. Are there reference apps besides Clockify?
   **Answer:** Clockify can be used as a time-tracking interaction reference; do not copy its branding.
4. Is dark mode required?
   **Answer:** Not required for MVP.
5. Which chart/visualization library should be used for dashboards, or is this an implementation decision Claude Code may propose during the relevant sprint?
   **Answer:** Claude Code may propose a chart library during the dashboard sprint.

## M. Deployment — RESOLVED (MVP)

1. Where should the system be deployed?
   **Answer:** Not final yet.
2. Is Docker required for local development only or production too?
   **Answer:** Required for local development. Production Docker can be planned later.
3. Should CI/CD be included?
   **Answer:** Recommended but can be added after the app foundation is stable.
4. Should cloud storage be used for attachments?
   **Answer:** No. Local storage for MVP, with an abstraction that can later support cloud storage. See Section P.

## N. Leave, Holidays, And Non-Working Time — RESOLVED (MVP)

1. Should the system track leave requests (vacation, sick leave, etc.) in v1.0, or is that out of scope?
2. How should company holidays be defined, and who maintains the holiday calendar?
3. Should approved leave affect total hours, KPI calculations, or payroll computations?
4. Should absences be self-reported by employees, or recorded by supervisors/HR?

**Answer (applies to all of the above):** Leave and holiday handling are entirely out of scope for MVP.

## O. Client And Project Management — RESOLVED (MVP)

1. Who can create and manage clients: Admin only, or also Supervisors/HR?
   **Answer:** Admin only for MVP.
2. Who can create and manage projects: Admin only, or also Supervisors?
   **Answer:** Admin only for MVP.
3. Do projects have a lifecycle/status (e.g., active, on hold, completed, archived)?
   **Answer:** No. Project fields stay minimal for MVP: `name` and optional `client_id`. No status/lifecycle field.
4. Is a project tied to exactly one client, or can it span multiple clients?
   **Answer:** A project may belong to zero or one client (nullable). No many-to-many relationship in MVP.
5. Can employees be assigned to multiple projects simultaneously?
   **Answer:** No dedicated assignment table in MVP. Any employee may reference any active/available project when logging time, unless a later approved decision changes this.

Resolved alongside the Sprint 3 (Client And Project Management Foundation) plan; see `docs/DECISIONS.md` "Sprint 3 Implementation Decisions (Approved)".

## P. Attachments And File Handling — RESOLVED (MVP, mostly)

1. What file types are permitted for time entry attachments and deliverables?
   **Answer:** PDF, PNG, JPG, JPEG, DOCX, XLSX only.
2. Is there a maximum file size per attachment?
   **Answer:** 10MB per file.
3. Should attachments be scanned for malware before storage?
   **Still OPEN.** Not answered. Ask before implementing.
4. How long should attachments and reference files be retained?
   **Still OPEN.** Not answered. Ask before implementing.
5. Should attachment storage be local disk, or a cloud object store (e.g., S3-compatible)?
   **Answer:** Local storage for MVP. Admin can revise this later.

## Q. Dashboard Access And Behavior — RESOLVED (Sprint 10)

1. Should dashboard data be role-scoped (e.g., Supervisors see only their team, Admin/HR see the whole organization)?
   **Answer:** Yes. Admin and HR/Finance see organization-wide dashboard metrics. Supervisors see their own department's metrics only. Employees do not get a dedicated Dashboard page in Sprint 10, because their self-productivity monitoring needs are already covered by the Time Tracking summary and My KPIs page.
2. Should dashboards refresh in real time, or on a scheduled/manual basis?
   **Answer:** Neither literal real-time push nor a scheduled background job. Dashboard data is recomputed on page load and when the user clicks a manual Refresh button — no real-time push, no scheduled dashboard jobs, no background refresh in Sprint 10.

## R. General Policy For Undefined Items — RESOLVED (MVP)

If a requirement remains undefined at the time its sprint is reached (including Section Q and the open items in Sections O and P), Claude Code must stop and ask before implementing it. Claude Code must not invent additional business rules.
