# Sprint 13 - Time Entry Attachments Foundation

## Sprint Goal

Deliver PRD §7.1's "Supporting attachments" for time entries — the field Sprint 4 explicitly deferred — as authenticated upload, listing, download, and deletion on the existing time-entry lifecycle: owner-managed while an entry is editable, frozen once its timesheet is under review or decided, downloadable by exactly the people who already review that entry, stored on the private local disk behind Laravel's filesystem abstraction per the locked storage decision. This is the last unbuilt business module in the PRD.

## Status

Implemented and validated. All automated validation passed (backend: 171 tests / 561 assertions; frontend: 161 tests, build, lint). Exactly one migration and three routes added; zero new dependencies. Manual end-to-end verification remains blocked by the standing MySQL/Docker gap (unchanged since Sprint 0) and is recorded as skipped in the sprint review. Sprint review: PASS.

## Why This Sprint Exists

PRD §7.1 lists "Supporting attachments" as a required time-entry field. Sprint 4 deferred the entire capability ("no upload fields or storage yet"), and every sprint since has carried the deferral forward in `docs/SETUP.md`'s Known Deferred Items. With Sprints 4-12 complete, attachments are the only PRD module that does not exist at all. The locked decisions already answer file types (PDF, PNG, JPG, JPEG, DOCX, XLSX), size (10MB per file), and storage medium (local disk for MVP, behind an abstraction that can later support cloud storage — `docs/QUESTIONS.md` M.4/P.5). Section P.3 (malware scanning) and P.4 (retention) were left OPEN with an explicit "Ask before implementing," and `docs/DECISIONS.md` Decisions Still Required repeats both. Per Section R, this plan stops and asks — and also surfaces three further gaps (storage behavior details, download permissions, lifecycle) that no decision covers.

## Source Requirements This Sprint Implements

From `docs/PRD.md` §7.1: each time entry must include "Supporting attachments" (reference links and deliverables already exist since Sprint 4).

From `docs/DECISIONS.md` (locked Attachments decisions): permitted types PDF, PNG, JPG, JPEG, DOCX, XLSX; 10MB per file; local-disk storage behind an abstraction that can later support cloud storage; malware scanning and retention NOT yet decided.

From `docs/QUESTIONS.md` Section P: questions 3 and 4 are marked "Still OPEN. Not answered. Ask before implementing." — resolved by CQ1 and CQ2 below.

From Sprint 4/5 decisions: attachments are "file uploads," explicitly distinct from the JSON `reference_links`/`deliverables` fields; entries lock when their timesheet is submitted/approved/rejected and unlock on revision request — the lifecycle CQ5 builds on.

## Resolved Clarification Questions

These were posed as OPEN proposals when this plan was first drafted, per `docs/QUESTIONS.md` Section R. All five have since been explicitly approved and recorded in `docs/DECISIONS.md` under "Sprint 13 Implementation Decisions (Approved)"; Section P questions 3-4 are flipped from OPEN to RESOLVED.

**CQ1. Is malware scanning required before storing attachments (Section P.3, OPEN)?**
No scanning infrastructure exists on this machine, and adding one (e.g., a ClamAV service) would be a new external dependency and realistically belongs with the Docker/production sprint.
*Answer (approved):* **No malware scanning in Sprint 13.** Accepted as an MVP risk with compensating controls that need no new infrastructure, all implemented and test-verified: strict allowlist validation of both file extension *and* server-detected MIME type (a `.pdf` that isn't really a PDF is rejected); the 10MB cap; storage under the private (non-public, non-web-served) disk with server-generated hashed filenames; downloads only through an authenticated, authorized endpoint streamed with `Content-Disposition: attachment` (never rendered or executed server-side). Revisited at deployment/security hardening, where a scanner container or hosted scanning service slots in front of the same store.

**CQ2. How long are attachments retained (Section P.4, OPEN)?**
*Answer (approved):* **Indefinitely for MVP — the same retention every other business record already has.** Attachments are evidence attached to reviewed, payroll-feeding records; automatic purging would hole the audit trail, and a purge job would also require the scheduler/queue infrastructure that remains deliberately unstarted. The owner may delete an attachment manually only while its entry is still editable (CQ5). If a real retention policy arrives later, a scheduled cleanup lands with the queue/scheduler sprint.

**CQ3. What exactly does "local disk behind an abstraction" mean in implementation (storage behavior)?**
*Answer (approved):* Laravel's filesystem disk system **is** the approved abstraction. Files are stored via `Storage::disk('local')` (the private root — never `public/`), under `time-entry-attachments/{entry-id}/{server-generated-hash}.{ext}`; the original filename is kept only as a database column and used for the download's suggested name. Nothing about a file's location or name comes from client input. A future move to S3-compatible storage is a disk-configuration change, not a code change.

**CQ4. Who may download an attachment on employee X's time entry?**
*Answer (approved):* Exactly the people who can already see that entry in a review context: **the owner; X's own-department Supervisor (they review the timesheet the entry belongs to); and Admin.** HR/Finance may **not** — consistent with the standing rule (Sprints 5/8) that HR/Finance sees computed payroll numbers and exports, never raw timesheet/entry records. Other employees and cross-department supervisors get 403, server-side.

**CQ5. What happens to attachments when an entry is edited, deleted, locked, or its timesheet is reopened (lifecycle)?**
*Answer (approved):* Attachments follow the entry's existing editability rule (`TimeEntry::isLocked()`, Sprint 5) exactly:
- **Upload and delete are owner-only and allowed only while the entry is editable** (no timesheet yet, or timesheet in `revision_requested`). Once submitted/approved/rejected, attachments are frozen — download only — because they are part of the record the Supervisor reviewed.
- **Editing an entry's fields does not touch its attachments**; they are added/removed independently, while editable.
- **Deleting an entry deletes its attachments** — database rows *and* files on disk (deletion is already only possible while unlocked).
- **An Admin reopening a timesheet (→ `revision_requested`) makes attachments modifiable again**, exactly like the entry's other fields.
- Deleting an attachment removes the row and the file immediately; no versioning, no soft-delete, no orphaned files.

## Current Architecture This Sprint Builds On

- `TimeEntryPolicy::update`/`delete` already encode "owner + not locked" — attachment upload/delete authorization reuses this exact rule; download gets a new policy-level check per CQ4 (owner / own-department Supervisor / Admin), the same scoping shape used since Sprint 5.
- `TimeEntry::isLocked()` (Sprint 5) is the single source of the lifecycle rule in CQ5, including the revision-request/reopen unlock path.
- `TimesheetController`'s shared `RELATIONS` eager-load (`timeEntries.project`, `timeEntries.client`, …) is where `timeEntries.attachments` joins, so reviewers see attachments wherever they already see entries.
- `config/filesystems.php` default `local` disk (private root) is the locked storage abstraction (CQ3); tests use `Storage::fake()`.
- `TimeEntryController::destroy` currently just deletes the row — extended to remove attachment files first (CQ5).
- Frontend: `apiFetchBlob` + `downloadBlob` (Sprint 9) already handle authenticated binary downloads; `apiClient` gains one `FormData` upload helper (uploads are multipart, not JSON); `TimeTrackingPage` (owner) and the timesheet review views (Supervisor/Admin) render entries today and gain the attachment list there.
- Rate limiting: the API's standard throttle applies to the upload endpoint like every other route.

## Confirmed Implementation Decisions

Approved as part of the Sprint 13 plan approval. The five Clarification Question resolutions above are the decisions recorded in `docs/DECISIONS.md` under "Sprint 13 Implementation Decisions (Approved)"; the details below implement them and must be preserved unless explicitly changed:

1. **`time_entry_attachments` table (the sprint's only migration):** `time_entry_id` (constrained, cascade), `original_name`, `path`, `mime_type`, `size_bytes`, `uploaded_by` (constrained users), timestamps. File cleanup on deletion happens in code (disk files are not covered by DB cascade), via the attachment model's deletion path so no orphaned files are left.
2. **Validation:** Laravel's `File::types(['pdf','png','jpg','jpeg','docx','xlsx'])->max(10 * 1024)` — enforcing both the extension allowlist and the server-detected MIME type, per the locked type/size decisions and CQ1's compensating controls.
3. **No per-entry attachment count cap.** Neither the PRD nor any decision defines one, so none is invented; the 10MB/file cap and standard API throttling bound abuse. Flagged so a cap can be added later as a deliberate decision, not a silent rule.
4. **Endpoints (three new routes in the existing auth group; no other API changes):**
   - `POST /api/time-entries/{timeEntry}/attachments` — multipart upload; owner + editable only.
   - `GET /api/time-entries/{timeEntry}/attachments/{attachment}/download` — streams the file with the original name; CQ4 matrix.
   - `DELETE /api/time-entries/{timeEntry}/attachments/{attachment}` — owner + editable only; removes row and file.
   - Attachment lists are embedded in existing time-entry/timesheet responses (id, original name, size, mime, uploaded_at) — no new list endpoint, and `path` is never exposed to the client.
5. **Scoped bindings:** the `{attachment}` route parameter is resolved scoped to its `{timeEntry}` parent, so a valid attachment id under the wrong entry 404s rather than leaking across entries.
6. **Synchronous upload/download** (no queues), matching every prior sprint's live-request pattern.
7. **Frontend:** `apiClient` gains `apiFetchUpload(path, formData)` (auth header, no JSON content-type, same `ApiError` handling); `timeEntryApi` gains upload/download/delete functions; `types/timeEntry.ts` gains the attachment shape; `TimeTrackingPage` shows each entry's attachments with name + size, a file input + Upload button and Remove buttons only while the entry is editable; the timesheet review view (Supervisor/Admin) lists attachments with Download links only. Downloads reuse `apiFetchBlob` + `downloadBlob`.

## User Stories

1. As an Employee, I can attach PDF/PNG/JPG/JPEG/DOCX/XLSX files (≤10MB each) to my editable time entries, see them listed, download them, and remove them — until my timesheet is submitted.
2. As an Employee whose timesheet was sent back for revision, I can update attachments along with the entry's other fields.
3. As a Supervisor, I can download the attachments on my department members' entries while reviewing their timesheets.
4. As an Admin, I can do the same for any entry.
5. As HR/Finance, another employee, or a cross-department Supervisor, I am blocked server-side (403) from downloading, and file types/sizes outside the locked rules are rejected (422).

## Explicitly Out Of Scope This Sprint

- Malware scanning infrastructure (CQ1 — accepted risk, revisit at deployment) and any retention/purge job (CQ2).
- Cloud/S3 storage (a later disk-config change per CQ3), image thumbnails/previews, in-browser rendering, versioning.
- Attachments on daily scrums, timesheets themselves, KPIs, or AI outputs — PRD §7.1 puts attachments on time entries only.
- Any per-entry count cap or per-user quota (Proposed Decision 3 — would be an invented rule).
- Queues, scheduled jobs, AI parsing/summarizing of attachment contents, exports embedding attachments.
- Everything else previously deferred (real AI provider, Docker/deployment, etc.).

## Backend Backlog

- Migration + `TimeEntryAttachment` model (relations: `timeEntry`, `uploader`; deletion removes the disk file) + factory; `TimeEntry::attachments()` hasMany.
- `StoreTimeEntryAttachmentRequest` with the type/size `File` rule (Proposed Decision 2).
- `TimeEntryAttachmentController`: `store` (authorize owner+editable via the existing update-shaped rule; store on the local disk per CQ3; return the embedded shape, 201), `download` (CQ4 matrix; `Storage::download` with `original_name`), `destroy` (owner+editable; row + file).
- `TimeEntryPolicy`: add `downloadAttachment` (owner / own-department Supervisor / Admin) and reuse `update` for attach/detach.
- Embed `attachments` in `TimeEntryController` responses and `TimesheetController::RELATIONS`; extend `TimeEntryController::destroy` to remove attachment files with the entry.
- Routes: the three endpoints, scoped bindings.
- Feature tests (`TimeEntryAttachmentTest`, `Storage::fake`): upload happy path (row + file exist, original name/mime/size recorded, response shape has no `path`); 422s for disallowed extension, disallowed real MIME behind an allowed extension, and >10MB; 403s for uploading to someone else's entry and to a locked entry; unlock-after-revision-request allows upload/delete again; download matrix per CQ4 (owner/supervisor/admin 200 with correct filename header, hr_finance/other-employee/cross-department 403); scoped-binding 404 for an attachment under the wrong entry; owner delete removes row + file; deleting the entry removes its attachments' rows + files.

## Frontend Backlog

- `types/timeEntry.ts`: `TimeEntryAttachment` shape; entry type gains `attachments`.
- `lib/apiClient.ts`: `apiFetchUpload` (FormData; no JSON content-type; same token/error handling) + tests.
- `lib/timeEntryApi.ts`: `uploadAttachment(entryId, file)`, `downloadAttachment(entryId, attachmentId)` (blob), `deleteAttachment(entryId, attachmentId)` + tests.
- `TimeTrackingPage`: per-entry attachments block — list (name, size, Download), file input + Upload while editable, Remove while editable; hidden controls once locked; validation errors surfaced.
- Timesheet review view (`TeamTimesheetsPage` entry detail): read-only attachment list with Download.
- Vitest tests: upload flow calls the API and appends to the list; controls hidden for locked entries; download triggers the blob helper; remove updates the list; review view renders download-only.

## Acceptance Criteria

Sprint 13 is complete when:

- Owners can upload/download/delete attachments on editable entries within the locked type/size rules, and cannot once the entry locks — with the revision-request path restoring editability, all server-enforced.
- The CQ4 download matrix is enforced server-side and test-verified, including HR/Finance 403.
- Files live only under the private local disk with server-generated names; the stored `path` never appears in any API response; downloads stream with the original filename.
- Deleting an attachment or its entry leaves no orphaned rows or files (test-verified with `Storage::fake`).
- Both extension and detected MIME are validated; oversized and disallowed files get 422 with clear messages.
- Exactly one new table; three new routes; zero new dependencies (backend and frontend).
- `docs/QUESTIONS.md` Section P questions 3-4 are RESOLVED and `docs/DECISIONS.md` records the Sprint 13 decisions; Decisions Still Required drops the two attachment items.

## Deliverables

- Backend: 1 migration, 1 model + factory, 1 controller, 1 form request, 1 policy method, 3 routes, response embedding, feature tests.
- Frontend: upload helper, API functions + types, attachments UI in owner and review views, Vitest tests. No new dependencies.
- This file (`sprints/SPRINT_13.md`); `docs/DECISIONS.md` + `docs/QUESTIONS.md` already updated at plan approval; `docs/SETUP.md` updated during implementation.

## Implementation Order

1. Backend: migration + model/factory → policy method + form request → controller + routes + response embedding → full feature tests with `Storage::fake` → `php artisan test`.
2. Frontend: `apiFetchUpload` → types → `timeEntryApi` functions → `TimeTrackingPage` attachments block → review-view list → `npm run build`, `npm run lint`, `npm run test`.
3. Manual verification per the Manual Testing Plan (noting the standing MySQL/Docker blocker if unchanged).
4. Update `docs/SETUP.md`.
5. Produce PASS or FAIL Sprint 13 review.

## Dependencies

- Same as Sprints 1-12: MySQL reachable for manual end-to-end verification (still blocked until Docker Desktop is installed); automated tests use SQLite in-memory and `Storage::fake`, so they are unaffected.
- Manual testing reuses the Sprint 5-12 Employee/Supervisor/Admin/HR-Finance seed data.

## Risks

- **No malware scanning (CQ1) is the sprint's real risk acceptance**: a user could store a malicious-but-valid-typed file (e.g., a macro-bearing DOCX). Mitigations are validation, private storage, attachment-disposition downloads, and authenticated access — and the decision is recorded so the deployment sprint revisits it deliberately.
- Local-disk storage ties files to the app host; acceptable for MVP by locked decision, and the CQ3 abstraction keeps the S3 exit cheap.
- `docker-compose`/production volumes must later persist `storage/app` — noted for the deployment sprint.
- Multipart uploads are the first non-JSON request in the frontend client; kept isolated in one helper so the JSON path is untouched.
- Indefinite retention (CQ2) grows disk usage over time; bounded by 10MB/file and the small MVP user base, and a future policy has a clean insertion point.

## Validation Checklist

- Confirm files are stored only under the private disk with server-generated names, and no API response contains a storage path.
- Confirm both extension and detected-MIME validation via tests (including a fake file with an allowed extension but disallowed content type).
- Confirm the CQ4 matrix and the CQ5 lifecycle (lock, unlock-on-revision, delete cascades) via API tests, not UI hiding.
- Confirm no orphaned files after attachment delete and entry delete (`Storage::fake` assertions).
- Confirm the download response uses `Content-Disposition: attachment` with the original filename.
- Confirm exactly one migration, three routes, zero dependency changes.
- Confirm `docs/QUESTIONS.md` P.3/P.4 flipped to RESOLVED and `docs/DECISIONS.md` recorded the Sprint 13 decisions at approval; Decisions Still Required updated; no unrelated docs edits.
- Confirm no secrets committed.

## Manual Testing Plan

1. As the Employee, add a PDF and a PNG to an editable entry; confirm both list with name and size, download intact, and a `.txt`/oversized file is rejected with a clear message.
2. Submit the day's timesheet; confirm the Upload/Remove controls disappear and the API returns 403 for upload/delete attempts, while download still works.
3. As the Supervisor, open the submitted timesheet; download the attachments; request revision; as the Employee, confirm attachments are modifiable again, swap one, resubmit.
4. As a cross-department Supervisor and as HR/Finance, confirm the download endpoint returns 403 (and nothing renders in their UIs).
5. As the Admin, download any attachment; reopen an approved timesheet and confirm the owner can again modify attachments.
6. Delete an attachment while editable, then delete a whole entry with attachments; confirm files are gone from `storage/app` in both cases.
7. Confirm an attachment URL from one entry does not resolve under a different entry id (404).

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
- No modules outside Time Entry Attachments were touched (beyond the approved response-embedding and review-view additions).
- Clarification Questions 1-5 are already answered and recorded in `docs/DECISIONS.md` (with Section P updated) — done at plan approval, before implementation begins.

## Code Generation Prompt

Use this only after Sprint 13 is approved:

```text
Implement Sprint 13 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- docs/QUESTIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_12.md
- sprints/SPRINT_13.md

Objective:
Add time-entry attachments per PRD §7.1 on the existing entry
lifecycle: owner upload/delete while editable (locked types: pdf, png,
jpg, jpeg, docx, xlsx; 10MB max), frozen when the timesheet is under
review or decided, downloadable by owner / own-department Supervisor /
Admin only, stored on the private local disk behind the filesystem
abstraction with server-generated names.

Constraints:
- No malware scanning, retention jobs, cloud storage, thumbnails,
  previews, or count caps — per the approved CQ answers.
- Exactly one migration; three new routes; no new dependencies.
- Validate extension AND detected MIME; never expose storage paths;
  stream downloads as attachments with the original filename.
- No queues or background work — synchronous only.
- Delete files from disk whenever their rows go away (attachment
  delete and entry delete) — no orphans.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migration, TimeEntryAttachment model/factory, controller + request +
  policy method, routes, response embedding, feature tests with
  Storage::fake covering the full matrix and lifecycle (backend)
- apiFetchUpload helper, timeEntryApi functions + types, owner and
  review attachment UI, Vitest tests (frontend)
- PASS or FAIL Sprint 13 review
```

## Validation Prompt

```text
Validate Sprint 13.

Inspect:
- Correctness against CLAUDE.md, docs/DECISIONS.md, and the approved
  CQ1-CQ5 answers in sprints/SPRINT_13.md
- Whether upload/delete are owner-only and lifecycle-gated by
  TimeEntry::isLocked(), including the revision-request unlock path
- Whether the download matrix (owner / own-department Supervisor /
  Admin; 403 for HR/Finance, other employees, cross-department) is
  server-enforced and test-verified
- Whether extension AND detected MIME are both validated, size capped
  at 10MB, and rejects return 422
- Whether files live only on the private disk with server-generated
  names, no path ever appears in a response, and downloads stream
  with Content-Disposition: attachment and the original name
- Whether attachment and entry deletion leave no orphaned rows/files
- Whether exactly one migration and three routes were added with zero
  dependency changes
- Whether docs/QUESTIONS.md P.3-P.4 and docs/DECISIONS.md were updated
  at approval
- Build/test readiness (backend and frontend, including Vitest)

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 13 implementation.
