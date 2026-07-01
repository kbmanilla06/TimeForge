# Sprint 3 - Client And Project Management Foundation

## Sprint Goal

Build the minimal Client and Project reference data (backend + Admin UI) that the Time Tracking module will depend on. This is a prerequisite/foundation sprint, not the Time Tracking module itself.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

PRD §7.1 (Time Tracking Module) requires every time entry to include a Project, a Client, and a Department. Department already exists (Sprint 1). Client and Project do not. `docs/DECISIONS.md` already anticipated this:

> "MVP includes basic client and project records, since time entries require client and project fields. Advanced project management is out of scope."

But the same section flags five specifics as genuinely undecided (ownership, lifecycle, cardinality, assignment — see `docs/QUESTIONS.md` Section O). Rather than inventing these mid-way through building Time Tracking, this sprint resolves them now, at small scope, the same way Sprint 1 resolved the Department/team model before anything depended on it. Time Tracking (a much larger sprint, with its own timer/entry/duration rules) becomes Sprint 4.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`:

- MVP includes basic client and project records; advanced project management is out of scope.
- Design stays single-company for MVP (no organization-scoping on clients/projects).
- Use Laravel policies/gates for authorization (established pattern from Departments).
- Use migrations, seeders, factories, and tests from the beginning.

## Current Architecture This Sprint Builds On

- The Department pattern from Sprints 1-2 is the direct template: a simple reference table, an admin-only Policy, a controller with `index`/`store`/`update`/`destroy`, and a matching Admin UI page with inline create/rename/delete.
- `AppLayout` already has a nav pattern for admin-only links (`Manage Users`, `Manage Departments`) that new links slot into.
- `adminApi.ts` and `types/admin.ts` already exist and will be extended, not restructured.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 3 Implementation Decisions (Approved)", resolving `docs/QUESTIONS.md` Section O:

1. **Client CRUD ownership:** Admin only — mirrors the Department pattern already in place. (Resolves O.1)
2. **Project CRUD ownership:** Admin only for MVP. Supervisors are not given project-management access in this sprint; can be revisited later if a real need emerges. (Resolves O.2)
3. **Project lifecycle/status:** None for MVP. No `status` or `archived` field, and no `description` field either — one was not already planned, so it is not being added now. Just a name and an optional client. Matches "advanced project management is out of scope." (Resolves O.3)
4. **Project-client cardinality:** A project optionally belongs to exactly one client (nullable foreign key). No many-to-many. (Resolves O.4)
5. **Employee-project assignment:** No membership/assignment table in this sprint. Any active employee will be able to reference any project when Time Tracking is built (Sprint 4) — this sprint only creates the reference data itself, not usage restrictions. (Resolves O.5)

## User Stories

1. As a System Administrator, I want to create and manage a list of clients, so time entries can reference who work was done for.
2. As a System Administrator, I want to create and manage a list of projects, optionally linked to a client, so time entries can reference what work was done on.
3. As a System Administrator, I want to rename or delete clients and projects as the organization's needs change.
4. As a System Administrator, I want to see how many projects reference a client before deleting it, so I understand the impact (mirrors the department-deletion warning from Sprint 2).
5. As any non-admin user, I want the client/project admin pages to be inaccessible to me, consistent with every other admin-only area.

## Explicitly Out Of Scope This Sprint

- The Time Tracking module itself: timers, manual entries, duration calculation, task/work-category fields, attachments, deliverables, reference links (all PRD §7.1 — Sprint 4).
- Any business modules beyond this: timesheets, scrum, KPIs, payroll, dashboards, reports, AI, attachments.
- Project lifecycle/status, employee-to-project assignment restrictions, and multi-client projects (all explicitly decided against for MVP above).
- Supervisor or HR/Finance access to client/project management.
- `docs/QUESTIONS.md` Section Q and the flagged P sub-items remain untouched (Section O is resolved by this sprint's approved decisions).

## Backend Backlog

- Migration: create `clients` table (`id`, `name`, timestamps).
- Migration: create `projects` table (`id`, `name`, `client_id` nullable FK with `nullOnDelete()`, timestamps).
- `Client` model (`hasMany` projects) and `Project` model (`belongsTo` client).
- `ClientPolicy` and `ProjectPolicy`: admin-only for all actions, mirroring `DepartmentPolicy`.
- `Admin\ClientController`: `index` (with `withCount('projects')`, mirroring the Sprint 2 `users_count` pattern), `store`, `update`, `destroy`.
- `Admin\ProjectController`: `index` (with `with('client')`), `store`, `update`, `destroy`.
- Form Requests: `StoreClientRequest`, `UpdateClientRequest`, `StoreProjectRequest`, `UpdateProjectRequest`.
- Routes: `/api/admin/clients` and `/api/admin/projects`, under the existing `auth:sanctum` + `active` + `role:admin` group.
- `ClientFactory` and `ProjectFactory`.
- Feature tests: admin CRUD for both entities, non-admin roles get 403, `projects_count` accuracy on the clients index, and that deleting a client nulls `client_id` on its projects (not cascading delete).

## Frontend Backlog

- `types/admin.ts`: add `Client`, `Project`, and their create/update payload types.
- `adminApi.ts`: add `listClients`, `createClient`, `updateClient`, `deleteClient`, `listProjects`, `createProject`, `updateProject`, `deleteProject`.
- `pages/admin/ClientsPage.tsx`: list + inline create/rename/delete, mirroring `DepartmentsPage`, with a project-count-aware delete confirmation.
- `pages/admin/ProjectsPage.tsx`: list + create/rename/delete, with a client dropdown (including "— None —").
- `AppLayout`: add "Manage Clients" / "Manage Projects" admin-only nav links.
- `App.tsx`: add `/admin/clients` and `/admin/projects` routes under `AdminRoute`.
- Vitest + RTL tests for both new pages and the new `adminApi` functions, following the established `vi.clearAllMocks()` pattern from Sprint 2.

## Acceptance Criteria

Sprint 3 is complete when:

- An Admin can create, list, rename, and delete clients.
- An Admin can create, list, rename, and delete projects, optionally assigning a client.
- Deleting a client that has projects prompts a confirmation naming the affected project count; the projects are not deleted, only unlinked.
- A non-admin role navigating to `/admin/clients` or `/admin/projects` is redirected away.
- All new backend and frontend logic has test coverage.
- No Time Tracking or other business-module code exists.

## Deliverables

- Backend: 2 migrations, 2 models, 2 policies, 2 controllers, 4 form requests, 2 factories, feature tests.
- Frontend: 2 new admin pages, extended `adminApi`/types, updated nav and routing, Vitest tests.
- This file (`sprints/SPRINT_03.md`).

## Implementation Order

1. Backend: migrations (clients before projects, matching the departments-before-users ordering from Sprint 1) → models → policies → controllers/routes → factories → tests. Run `php artisan test`.
2. Frontend: types → `adminApi` additions → `ClientsPage` → `ProjectsPage` → nav/routing.
3. Run `npm run build`, `npm run lint`, `npm run test`.
4. Manually verify: create a client → create a project linked to it → confirm project shows client name → delete the client → confirm project's client becomes unlinked, not deleted → confirm non-admin is blocked from both pages.
5. Update `docs/SETUP.md` with the new manual test steps.
6. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprints 1-2: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.

## Risks

- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it has been since Sprint 0 — automated tests remain the primary proof of correctness.
- Choosing "no employee-project assignment table" (Decision 5) means Sprint 4 (Time Tracking) must not silently invent restriction rules either — it should ask again if a real need for assignment restrictions appears once time entries are being designed.
- If a later sprint needs project status (e.g., "archived" projects should not accept new time entries), this will require an additive migration — acceptable, deferred risk, consistent with "advanced project management is out of scope."

## Validation Checklist

- Confirm no business modules beyond client/project management were implemented.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm `/admin/clients` and `/admin/projects` are genuinely inaccessible (not just hidden) to non-admin roles.
- Confirm deleting a client does not cascade-delete its projects.
- Confirm no secrets are committed.

## Manual Testing Plan

1. Log in as the seeded Admin.
2. Navigate to Manage Clients; create "Acme Corp".
3. Navigate to Manage Projects; create "Website Redesign" linked to Acme Corp.
4. Confirm the project list shows "Acme Corp" as its client.
5. Return to Manage Clients; confirm it shows 1 project for Acme Corp.
6. Delete "Acme Corp"; confirm the warning names 1 affected project.
7. Confirm "Website Redesign" still exists afterward, now with no client.
8. Log in as a non-admin user; confirm direct navigation to `/admin/clients` and `/admin/projects` redirects away.

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
- No business modules outside client/project management were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched by implementation (Section O's resolution is recorded via the approval step, before implementation, same as Sprints 1-2).

## Code Generation Prompt

Use this only after Sprint 3 is approved:

```text
Implement Sprint 3 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md
- sprints/SPRINT_01.md
- sprints/SPRINT_02.md
- sprints/SPRINT_03.md

Objective:
Build Client and Project reference data management only: migrations,
models, admin-only policies, controllers/routes, and a matching Admin UI,
mirroring the existing Department pattern.

Constraints:
- Do not implement the Time Tracking module (timers, entries, duration,
  task/work-category fields) — that is Sprint 4.
- Do not implement timesheets, scrum, KPI, payroll, dashboards, reports,
  AI, or attachments.
- Do not add project status/lifecycle fields or an employee-project
  assignment table.
- Do not resolve docs/QUESTIONS.md Section Q or the flagged P sub-items.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migrations, models, policies, controllers, form requests, factories,
  and feature tests (backend)
- ClientsPage, ProjectsPage, adminApi/types additions, nav/routing
  updates (frontend)
- PASS or FAIL Sprint 3 review
```

## Validation Prompt

```text
Validate Sprint 3.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether /admin/clients and /admin/projects are genuinely inaccessible
  to non-admin roles
- Whether deleting a client unlinks rather than cascade-deletes projects
- Whether any unapproved business features were implemented
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

Give final approval ("approved", "proceed", or "implement") to begin Sprint 3 implementation.
