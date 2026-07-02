# TimeForge User Guide

A role-by-role guide to the TimeForge MVP. Log in with your email and password at the app URL (development: http://localhost:5173). New accounts must be activated by a System Administrator before first login. Your navigation bar shows only the pages your role can use.

## Everyone

- **Home** greets you with your name and role.
- **Notifications** lists in-app events about your timesheets (submitted, approved, rejected, revision requested, reopened); mark items read as you go.
- **AI Insights** content is always labeled *AI-generated* and is derived entirely from data already stored in TimeForge — regenerating keeps previous versions.

## Employees And Interns

**Track time (Time Tracking).** Start a timer when you begin work (task, category, description; project/client/KPI optional) and stop it when done — or add a manual entry with exact times. Rules: no overlapping entries, no future dates, one running timer at a time. The summary panel shows Today / This Week / This Month / current payroll period totals.

**Attach evidence.** On any entry you can still edit, *Attach file* accepts PDF, PNG, JPG, JPEG, DOCX, XLSX up to 10MB each. Download anytime; remove only while the entry is editable.

**Report KPI progress.** Pick one of your KPI assignments on an entry and enter the quantity completed (e.g., +3 bugs). Progress counts only after your supervisor approves that day's timesheet.

**Submit your day (timesheet).** When a day's entries are complete, press *Submit Timesheet* on that date group. Everything on that day locks (fields and attachments) while it awaits review. If your supervisor *requests revision*, the day unlocks — fix it and resubmit. A *rejected* day stays locked (only an Admin can reopen it).

**Daily scrum.** Once per workday: what you did yesterday, what you plan today, any blockers, optional notes. You can edit until a supervisor comments; after that it's part of the record.

**See your own trends.** *AI Insights → Daily Summary / Weekly Report / Productivity Trend* narrate your own stored data on demand.

## Supervisors

Everything an Employee can do, plus — always scoped to **your own department**:

**Review timesheets (Team Timesheets).** Approve, reject, or request revision on submitted days; a comment is required for reject/revision and every comment is kept permanently. Entry attachments are downloadable from the review list. You cannot review your own timesheet.

**Manage team KPIs (Team KPIs).** Assign Admin-created KPIs to a person or to the whole department, watch progress, remove assignments.

**Review scrums (Team Scrum).** Read your department's entries and comment; your first comment locks the entry for the employee.

**Dashboard.** Department-scoped hours, productivity, KPI completion, attendance trend, billable split, project allocation, and pending approvals — recomputed on load and via *Refresh*. (No payroll figures — that's Admin/HR only.)

**AI Insights.** Your department's *Recurring Blockers*, *KPI Analysis*, and *Recommendations*, plus summaries/trends for any of your members.

**Exports.** *Export Hours PDF/Excel* on Team Timesheets — hours and attendance only, never rates or pay.

## HR / Finance

**Payroll.** Per-employee approved/overtime/pending/rejected hours, attendance, hourly rate, and the estimated pay for any semi-monthly period (1st–15th, 16th–end). Estimates only — not a disbursement record. Overtime = approved time beyond 8h in a day, at the configured multiplier (default 1.25×).

**Exports.** Payroll Report PDF/Excel (with rates and estimates), and the Team Hours Report for any department.

**Dashboard.** The organization-wide view, including the Payroll Summary card.

**AI Insights → Payroll Validation** (your only AI tab): a facts-only sweep of a period — employees with approved hours but no rate, totals, hours not payroll-ready, unsubmitted days, open timers, largest approved day.

Note: HR/Finance sees computed figures and reports, not raw timesheets, work-log detail, or attachments.

## System Administrators

Everything above, organization-wide, plus:

**Manage Users.** Create accounts (initial password set by you; new accounts start *pending* until you Activate), edit role/department, set hourly rates, deactivate.

**Manage Departments / Clients / Projects / KPIs.** Full CRUD; deletions warn about affected records.

**Reopen.** Only Admins can reopen a finally-approved (or rejected) timesheet, which returns it to the employee for revision. KPI progress already credited is not reversed (by design).

**AI Insights.** All seven capabilities for any person or department, including organization-wide Payroll Validation.

## Good To Know (MVP Boundaries)

- The AI provider is a local, deterministic stub — useful, honest summaries of stored data; no external AI service is contacted and no credentials exist.
- Email notifications, scheduled jobs, leave/holiday handling, and multi-company support are out of scope for the MVP.
- Login and password endpoints are rate-limited (5/minute); the API allows 60 requests/minute per user.
- Full setup and per-module walkthroughs: `docs/SETUP.md`; demo dataset and script: `docs/DEMO.md`.
