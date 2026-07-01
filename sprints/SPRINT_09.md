# Sprint 9 - Reporting And Exports Foundation

## Sprint Goal

Make the data Sprint 8 already computes actually downloadable: PDF and Excel export of the Payroll Report (Admin/HR-Finance only) and a separate, non-financial Team Hours Report (Supervisor's own department, or Admin/HR-Finance for any). Synchronous generation only — no queues, no stored reports, no new notification event.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Sprint 8 built live payroll computation but explicitly deferred everything about turning it into a file: "PDF/Excel export... belongs to that future Reporting sprint, not this one." That future sprint is this one. `docs/PRD.md` §11 ("Explicitly Unresolved Requirements") lists "Required PDF and Excel export libraries" as something Claude Code must propose here, and `docs/DECISIONS.md`/`docs/QUESTIONS.md` Section J are already fully resolved on everything else about export behavior.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`, "Reporting And Exports":

- Report layouts proposed during the reporting sprint.
- MVP branding is text-only (no final logo yet).
- System Administrator and HR/Finance can export reports; Supervisors can export team reports.
- Small exports run synchronously; large exports use queues.
- Generated reports need not be stored for MVP unless queue-based export is used.
- Claude Code may propose Laravel-friendly PDF and Excel libraries during the relevant sprint.

## A Tension In The Decision Text, And How This Plan Resolves It

"Supervisors can export team reports" sits next to Sprint 8's already-locked "Supervisors and employees cannot view payroll estimates yet." Read literally, "team reports" cannot mean the Payroll Report (with hourly rates and estimated pay) without contradicting Sprint 8. This plan resolves it by building **two distinct report types**:

1. **Payroll Report** — hourly rate + estimated payroll included. Admin and HR/Finance only, identical visibility to Sprint 8's `GET /api/payroll`.
2. **Team Hours Report** — approved/overtime/pending/rejected hours and attendance only, with no rate or estimated-pay figures. Supervisor (own department), Admin (any), and HR/Finance (any).

This is the one judgment call in this plan most worth double-checking against your intent — see Confirmed Decision 2.

## Current Architecture This Sprint Builds On

- `PayrollController::summarizeForEmployee()` (Sprint 8) already computes regular/overtime/pending/rejected minutes and attendance days per employee per period — the exact data both report types need. It is extracted into a shared calculator so the Team Hours Report doesn't duplicate Sprint 8's bucketing logic, and `PayrollController` itself is refactored to call it (adding hourly-rate/estimated-payroll math on top). Existing Sprint 8 `PayrollTest` assertions must still pass unchanged after this refactor — same discipline as Sprint 8's own `PayrollPeriod` extraction.
- The Admin-sees-all / Supervisor-sees-own-department / else-403 branching (used four times now: `TimesheetController`, `KpiAssignmentController`, `DailyScrumController`, `TeamMemberController`) is the template for the new `TeamHoursReportController`'s authorization — extended here to also allow HR/Finance, since "System Administrator and HR/Finance can export reports" is unqualified while Supervisors are explicitly scoped to "team reports."
- `TeamTimesheetsPage` (Sprint 5) and `PayrollPage` (Sprint 8) are the existing on-screen views this sprint adds export buttons to — no new browsing/preview page is built, since nothing in the PRD or decisions asks for one and the real gap is downloadability, not a new screen.
- `laravel/horizon` is already scaffolded (Sprint 0) but Redis isn't installed locally and Horizon has never been started — reinforcing that queue-based export isn't practically usable yet even if it were in scope.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 9 Implementation Decisions (Approved)". Decisions 7 and 8 (export-only Team Hours Report, export buttons on existing pages) were combined into a single Decision 7 during approval; a new Decision 9 was added restating the overall scope boundary explicitly rather than leaving it implicit.

1. **Export libraries:** `barryvdh/laravel-dompdf` for PDF (pure-PHP rendering via dompdf, no headless-browser/Node dependency, renders a Blade view straight to a PDF response). `maatwebsite/excel` failed to install — its pinned `phpoffice/phpspreadsheet` dependency requires `php <8.5.0` and this environment runs PHP 8.5.7 — so, per this decision's own escape hatch, the failure was reported and `phpoffice/phpspreadsheet` (5.8.0, the same engine `maatwebsite/excel` wraps) is used directly instead, via its own `Spreadsheet`/`Xlsx` writer API.
2. **Report types:** Two separate report types, not one. See "A Tension In The Decision Text" above. The Payroll Report (Admin and HR/Finance only; includes rates and estimated pay) and Team Hours Report (Supervisor own department, Admin/HR-Finance any department; excludes hourly rates and estimated pay) are separate endpoints, separate export buttons, and separate (though partially shared) backend code.
3. **Synchronous export:** Synchronous export generation in Sprint 9; no queues yet. Every export streams back in the same HTTP request/response. "Small exports run synchronously" is treated as sufficient for MVP foundation scope, given the inherently bounded dataset (one payroll period's active employees). Queue-based export for large datasets is deferred to a future sprint if real usage shows a need — this is a genuine scope narrowing, not an oversight.
4. **Stored reports:** No generated report records are stored in Sprint 9. Since nothing is queued, "generated reports need not be stored... unless queue-based" simplifies to: nothing is stored. Every export is regenerated fresh on each request, consistent with Sprint 8's "live computation" decision.
5. **Payroll report ready notification:** Not implemented in Sprint 9, because exports are synchronous and there is no delayed "ready" event to notify about. Since the requester already has the file by the time any notification could fire, this remains deferred, doubly confirming Sprint 8's original reasoning rather than reversing it.
6. **Shared calculation:** Sprint 8's payroll/hour bucketing logic is extracted into a reusable calculator/service so the Payroll Report and Team Hours Report do not duplicate logic — see "Current Architecture" above.
7. **Export UI placement:** Export buttons are added to the existing `PayrollPage` (Sprint 8) and `TeamTimesheetsPage` (Sprint 5). No new report browsing pages in Sprint 9 — Supervisors already have "Team Timesheets" for on-screen review, and a new browsable report-preview screen would encroach on the still-deferred Productivity Dashboards module (PRD §7.7).
8. **Branding:** Text-only TimeForge branding in exported reports — a "TimeForge" text header plus a generated-at timestamp and the report's period; no logo required, no custom fonts, no styling beyond a simple table.
9. **Scope:** No dashboards, charts, stored reports, queued exports, AI summaries, or new report types in Sprint 9, restating Decisions 3, 4, and the general scope boundary explicitly.

## User Stories

1. As HR/Finance or Admin, I want to download the current (or a past) payroll period as a PDF.
2. As HR/Finance or Admin, I want to download the same data as an Excel file.
3. As a Supervisor, I want to download my department's approved/pending/rejected/overtime hours and attendance as PDF or Excel, without seeing pay figures I'm not otherwise allowed to view.
4. As an Employee, I should not be able to export anything.

## Explicitly Out Of Scope This Sprint

- Queue-based/asynchronous export, any stored report record, and the "payroll report ready" notification (Confirmed Decisions 3, 4, 5).
- A new on-screen report-preview page for either report type (Confirmed Decision 7).
- Any change to who can *view* payroll data on-screen (Sprint 8's visibility rules are untouched; this sprint only adds export).
- Custom branding, logos, or configurable report layouts/templates.
- Dashboards, AI, attachments, any other future module.
- `docs/QUESTIONS.md` Section J is already RESOLVED and is not reopened; other sections remain untouched.

## Backend Backlog

- `composer require barryvdh/laravel-dompdf maatwebsite/excel` (or the closest Laravel-13/PHP-8.5-compatible versions available at implementation time — flagged as a risk below).
- `app/Support/HoursSummaryCalculator.php`: extracted from `PayrollController::summarizeForEmployee()` — computes regular/overtime/pending/rejected minutes and attendance days for one employee over a resolved period, with no rate/payroll math. `PayrollController` is refactored to call it and layer hourly-rate/estimated-payroll on top; existing Sprint 8 tests must pass unchanged.
- `PayrollController::exportPdf(Request $request)` / `exportExcel(Request $request)`: same `date`-driven period resolution and Admin/HR-Finance-only authorization as `index()`; renders a Blade view (`resources/views/reports/payroll.blade.php`) to PDF, or a `PayrollExport` class (`FromCollection`, `WithHeadings`) to `.xlsx`.
- `TeamHoursReportController::exportPdf(Request $request)` / `exportExcel(Request $request)`: Admin/HR-Finance (any active user) or Supervisor (own department only) — same 403-otherwise pattern used four times already; uses `HoursSummaryCalculator` directly with no rate/payroll columns.
- Routes: `GET /api/payroll/export/pdf`, `GET /api/payroll/export/excel`, `GET /api/team-hours-report/export/pdf`, `GET /api/team-hours-report/export/excel`.
- Feature tests: correct `Content-Type`/`Content-Disposition` headers and non-empty output for both PDF endpoints; for Excel endpoints, read the generated file back with PhpSpreadsheet and assert the actual computed numbers appear (regular/overtime/pending/rejected/attendance, and — payroll report only — hourly rate and estimated payroll) using the same concrete-numbers style as Sprint 8's `PayrollTest`; authorization tests for all four combinations (Admin, HR/Finance, Supervisor own-department, Supervisor other-department, Employee) on both report types; confirm the Team Hours Report never includes a rate or payroll figure anywhere in its output.

## Frontend Backlog

- `lib/apiClient.ts`: add `apiFetchBlob(path: string): Promise<Blob>` for authenticated binary downloads (attaches the same bearer token as `apiFetch`, but resolves to a `Blob` instead of parsed JSON; parses a JSON error body on failure where possible).
- `lib/download.ts`: a small `downloadBlob(blob: Blob, filename: string): void` helper (object URL + synthetic anchor click + revoke).
- `lib/payrollApi.ts`: add `exportPayrollPdf(date?: string): Promise<Blob>` and `exportPayrollExcel(date?: string): Promise<Blob>`.
- `lib/reportsApi.ts` (new): `exportTeamHoursPdf(date?: string): Promise<Blob>` and `exportTeamHoursExcel(date?: string): Promise<Blob>`.
- Update `PayrollPage.tsx`: add "Export PDF" / "Export Excel" buttons for the currently-selected date/period.
- Update `TeamTimesheetsPage.tsx`: add "Export PDF" / "Export Excel" buttons for the current period's team hours.
- Vitest + RTL tests for `apiFetchBlob`, `downloadBlob`, the new API client functions, and the new buttons on both pages (mocking `URL.createObjectURL`/`revokeObjectURL` and asserting the download helper is invoked with the right filename).

## Acceptance Criteria

Sprint 9 is complete when:

- Admin/HR-Finance can download a Payroll Report (PDF and Excel) for any period, matching the on-screen `/payroll` numbers exactly.
- Admin/HR-Finance/Supervisor(own department) can download a Team Hours Report (PDF and Excel) with no rate or payroll figures anywhere in it.
- A Supervisor cannot export another department's data or the Payroll Report at all; an Employee cannot export anything.
- No export is queued, stored, or triggers a notification.
- `PayrollController`'s existing Sprint 8 behavior and tests are unchanged after the `HoursSummaryCalculator` extraction.
- All new backend and frontend logic has test coverage, including concrete-number verification of Excel output.

## Deliverables

- Backend: 2 new composer packages, 1 extracted support class, 1 refactored controller, 1 new controller, 1 Blade view, 1 Excel export class (plus a second for the team report), 4 routes, feature tests.
- Frontend: 1 new API-client helper, 1 download utility, 1 new API client file, updates to 2 existing pages, Vitest tests.
- This file (`sprints/SPRINT_09.md`).

## Implementation Order

1. Backend: `composer require` the two libraries → extract `HoursSummaryCalculator` and refactor `PayrollController` onto it (confirm Sprint 8 tests still pass) → `PayrollController` export actions + Blade view + Excel export class → `TeamHoursReportController` + its own Excel export class → routes → feature tests. Run `php artisan test`.
2. Frontend: `apiFetchBlob` → `downloadBlob` → `payrollApi.ts` additions → `reportsApi.ts` → `PayrollPage` buttons → `TeamTimesheetsPage` buttons → tests.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: as HR/Finance, download both formats of the Payroll Report and open them; as the department Supervisor, download both formats of the Team Hours Report and confirm no pay figures appear; confirm a Supervisor cannot reach the payroll export endpoints and an Employee can reach neither.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-8: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- Manual testing needs the same Employee/Supervisor/Admin/HR-Finance set used in Sprint 8.

## Risks

- `barryvdh/laravel-dompdf` and `maatwebsite/excel` may not yet declare explicit compatibility with Laravel 13/PHP 8.5 at implementation time; if `composer require` fails on a version constraint, the fallback is to require with `--with-all-dependencies` or pin to the latest tag that supports the installed Laravel version, whichever resolves cleanly — this will be handled transparently during implementation, not silently worked around.
- Refactoring `PayrollController::summarizeForEmployee()` into `HoursSummaryCalculator` touches Sprint 8 code; mitigated the same way Sprint 8 mitigated its own `PayrollPeriod` extraction — run the full existing test suite immediately after, before adding anything new.
- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0.
- Treating "team reports" as a separate non-financial report type (Confirmed Decision 2) is an interpretation, not a verbatim instruction; if this doesn't match intent, the fix is scoping/permissions only, not a rebuild.

## Validation Checklist

- Confirm no queue-based export, stored report record, or new notification event was implemented.
- Confirm the Team Hours Report contains no hourly-rate or estimated-payroll figure anywhere in its PDF or Excel output.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm Excel output is verified against concrete expected numbers (read back via PhpSpreadsheet), not just "endpoint returns 200."
- Confirm Supervisor/Employee export restrictions are verified via API tests, not just hidden buttons in the UI.
- Confirm `PayrollController`'s existing Sprint 8 tests still pass unchanged after the `HoursSummaryCalculator` extraction.
- Confirm no secrets are committed.

## Manual Testing Plan

1. Log in as HR/Finance; go to "Payroll"; click "Export PDF"; confirm a PDF downloads and opens, showing the same numbers as the on-screen table including hourly rate and estimated payroll.
2. Click "Export Excel"; confirm an `.xlsx` file downloads and the same numbers appear in it.
3. Log in as the department Supervisor; go to "Team Timesheets"; click "Export PDF" then "Export Excel"; confirm both show approved/overtime/pending/rejected hours and attendance for their department only, with no hourly rate or estimated-payroll column anywhere.
4. Log in as a Supervisor from a different department; confirm their export only covers their own department, not the first Supervisor's.
5. Confirm that Supervisor cannot reach the Payroll Report endpoints at all (no button visible; direct API call returns 403).
6. Log in as an Employee; confirm no export buttons appear anywhere and both export endpoint families return 403 if called directly.
7. Log in as the Admin; confirm they can export both report types for any department/period.

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
- No modules outside Reporting And Exports Foundation were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched by implementation (the nine Confirmed Decisions are already recorded as approved before implementation begins, same as prior sprints).

## Code Generation Prompt

Use this only after Sprint 9 is approved:

```text
Implement Sprint 9 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_08.md
- sprints/SPRINT_09.md

Objective:
Build Reporting And Exports foundation: PDF and Excel export of the
Payroll Report (Admin/HR-Finance only, reusing Sprint 8's data) and
a separate Team Hours Report with no rate/payroll figures (Supervisor
own department, or Admin/HR-Finance for any). Synchronous only.

Constraints:
- Do not implement queue-based/asynchronous export or any stored
  report record.
- Do not add a new notification trigger event.
- Do not build a new on-screen preview page for either report; add
  export buttons to the existing PayrollPage and TeamTimesheetsPage.
- Do not let the Team Hours Report expose hourly rate or estimated
  payroll anywhere.
- Do not change who can view payroll data on-screen (Sprint 8 rules
  are untouched).
- Extract PayrollController::summarizeForEmployee() into a shared
  HoursSummaryCalculator without changing PayrollController's existing
  behavior; confirm Sprint 8's tests still pass.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Composer packages, HoursSummaryCalculator extraction, refactored
  PayrollController with export actions, new TeamHoursReportController,
  Blade view(s), Excel export classes, routes, and feature tests
  (backend)
- apiFetchBlob, downloadBlob, payrollApi/reportsApi additions, updated
  PayrollPage and TeamTimesheetsPage, Vitest tests (frontend)
- PASS or FAIL Sprint 9 review
```

## Validation Prompt

```text
Validate Sprint 9.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether the Team Hours Report genuinely contains no rate/payroll
  figures anywhere in its output
- Whether Excel output is verified against concrete expected numbers,
  not just a 200 status code
- Whether Supervisor/Employee export restrictions are enforced
  server-side, not just hidden in the UI
- Whether PayrollController still behaves identically after the
  HoursSummaryCalculator extraction
- Whether any unapproved business features were implemented (queued
  export, stored reports, notifications, a new preview page)
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

Give final approval ("approved", "proceed", or "implement") to begin Sprint 9 implementation.
