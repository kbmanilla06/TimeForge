# Sprint 2 - Admin User And Department Management UI

## Sprint Goal

Build the frontend UI for the Admin-only user and department management that Sprint 1 explicitly deferred: list, create, and edit users; activate/deactivate users; list, create, edit, and delete departments. The backend API for all of this already exists and is unchanged in scope — this sprint is almost entirely frontend.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Sprint 1's "Explicitly Out Of Scope" section named this directly: "Admin-facing UI for managing users/departments (list/create/edit screens). Backend API endpoints exist; the UI is Sprint 2." Right now, the only way to create or activate a user is `curl`. Every subsequent module (timesheets, approvals, KPIs) needs real users with real roles and departments to test against, so this UI is a practical prerequisite, not just a PRD checkbox.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md` (no new decisions — this sprint implements existing ones in the UI):

- Only System Administrators can create, edit, deactivate, and assign users.
- Four roles: Employee, Supervisor, HR/Finance, System Administrator.
- New accounts require admin approval (activation) before active use.
- Admin sets the initial password directly when creating a user (Sprint 1 approved decision).
- Single `departments` table; a Supervisor's team = users sharing their `department_id`.

## Current Architecture This Sprint Builds On

- Backend endpoints (all behind `auth:sanctum` + `active` + `role:admin`, already implemented and tested in Sprint 1):
  - `GET/POST /api/admin/users`, `PATCH /api/admin/users/{user}`, `PATCH /api/admin/users/{user}/activate`, `PATCH /api/admin/users/{user}/deactivate`
  - `GET/POST /api/admin/departments`, `PATCH /api/admin/departments/{department}`, `DELETE /api/admin/departments/{department}`
- Frontend already has: `AuthContext`/`useAuth`, `apiClient.ts` (fetch wrapper with bearer token + `ApiError`), `ProtectedRoute`, and a placeholder `HomePage`.
- `UpdateUserRequest` does not accept `status` or `password` — status changes only happen via the dedicated activate/deactivate endpoints, and there is no admin-triggered "reset another user's password" endpoint. This sprint does not add either; a user who needs a new password uses the existing self-service `/forgot-password` flow.

## Confirmed Implementation Decisions

These were flagged as proposed defaults when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 2 Implementation Decisions (Approved)":

1. **Backend addition:** Add `withCount('users')` to `Admin\DepartmentController::index()` so the UI can show "N users" per department and warn before a destructive delete. No new endpoint, no new business rule — purely a query addition to existing scope.
2. **Frontend test runner:** Vitest + React Testing Library, for this sprint's UI logic and going forward.
3. **Edit form scope:** The user edit form only changes name, email, role, and department — matching `UpdateUserRequest` exactly. Status changes stay as separate Activate/Deactivate actions in the list, not part of the edit form. No admin-triggered password reset for other users in Sprint 2.

## User Stories

1. As a System Administrator, I want to see a list of all users with their role, status, and department, so I know who has access.
2. As a System Administrator, I want to create a new user with a role, department, and initial password, so they can start using the system once I activate them.
3. As a System Administrator, I want to edit a user's name, email, role, or department without recreating the account.
4. As a System Administrator, I want to activate a pending user or deactivate an existing one directly from the list.
5. As a System Administrator, I want to see, create, edit, and delete departments, so I can organize users before assigning them.
6. As a System Administrator, I want to be warned before deleting a department that still has users assigned to it.
7. As any non-admin user, I want the admin pages to be inaccessible to me, consistent with the roles already enforced by the backend.

## Explicitly Out Of Scope This Sprint

- Any business modules: time tracking, timesheets, scrum, KPIs, payroll, dashboards, reports, AI, attachments.
- Supervisor "view my team" UI (still deferred to the Approval Workflow sprint, per `sprints/SPRINT_01.md`).
- Admin-triggered password reset/change for another user's account.
- Pagination, search, or filtering on the users/departments lists (lists are small post-MVP-launch; add later if needed).
- Bulk actions (bulk activate, bulk delete, CSV import/export of users).
- The broader "Administrative management portal" from PRD 6.4 (system settings, AI configuration) — this sprint is only user/department management.
- `docs/QUESTIONS.md` Section Q and the flagged O/P sub-items remain untouched.

## Backend Backlog

- `Admin\DepartmentController::index()`: change `Department::all()` to `Department::withCount('users')->get()` (see Confirmed Implementation Decision 1). Update/add a feature test asserting `users_count` is present and accurate.
- No new routes, controllers, migrations, or policies.

## Frontend Backlog

- Install Vitest + React Testing Library (see Confirmed Implementation Decision 2); minimal config in `vite.config.ts`.
- `src/types/admin.ts`: `Department` type, `CreateUserPayload`, `UpdateUserPayload`, `CreateDepartmentPayload` types.
- `src/lib/adminApi.ts`: thin wrapper functions over `apiFetch` for all eight admin endpoints (`listUsers`, `createUser`, `updateUser`, `activateUser`, `deactivateUser`, `listDepartments`, `createDepartment`, `updateDepartment`, `deleteDepartment`).
- `src/components/AdminRoute.tsx`: role-gated route wrapper (builds on `ProtectedRoute`'s pattern) — redirects to `/` if the authenticated user's role is not `admin`.
- `src/components/AppLayout.tsx`: minimal shared shell (top nav with Home / Manage Users / Manage Departments — the last two visible to admins only — plus the existing Logout button) so Sprint 2's multiple pages aren't each reinventing navigation. This is a nav shell only, not the full admin portal.
- `src/pages/admin/UsersPage.tsx`: table of users (name, email, role, status, department name) with Edit / Activate / Deactivate actions and a "Create User" link. Confirms before deactivating.
- `src/pages/admin/UserFormPage.tsx`: single form component used for both `/admin/users/new` (all fields incl. password) and `/admin/users/:userId/edit` (name/email/role/department only, matching `UpdateUserRequest`). Loads the existing user by fetching the list and finding by ID (no new backend endpoint needed).
- `src/pages/admin/DepartmentsPage.tsx`: list of departments with user counts, inline create form, inline rename, and delete with a confirmation that names how many users will be unassigned.
- Update `src/App.tsx`: add `/admin/users`, `/admin/users/new`, `/admin/users/:userId/edit`, `/admin/departments` routes, all nested under `AdminRoute` inside the existing `ProtectedRoute`.
- Update `src/pages/HomePage.tsx` (or fold into `AppLayout`) to surface links to the admin pages for admin users only.
- Map backend 422 `errors` (already captured by `ApiError.errors`) to per-field messages in both forms.

## Acceptance Criteria

Sprint 2 is complete when:

- An Admin can view a list of all users with role, status, and department.
- An Admin can create a user; it appears in the list with status `pending`.
- An Admin can activate/deactivate a user from the list, and the status updates immediately.
- An Admin can edit a user's name, email, role, and department.
- An Admin can create, rename, and delete departments; deleting one that has users prompts a confirmation naming the affected count.
- A non-admin (Employee, Supervisor, or HR/Finance) who navigates to any `/admin/*` URL is redirected away, not shown the page or its data.
- All new frontend logic (API wrapper functions, form validation/error mapping, role-gating) has Vitest/RTL test coverage.
- The one backend change (`withCount('users')`) has a passing feature test.
- No business modules beyond user/department management were touched.

## Deliverables

- Backend: one-line query change + test in `Admin\DepartmentController`/its test file.
- Frontend: admin API client, role-gated route, layout shell, users list/form pages, departments page, updated routing.
- Vitest + RTL installed and configured.
- This file (`sprints/SPRINT_02.md`).

## Implementation Order

1. Backend: `withCount('users')` change + test. Run `php artisan test`.
2. Frontend: install/configure Vitest + RTL.
3. Frontend: types → `adminApi.ts` → `AdminRoute` → `AppLayout`.
4. Frontend: `DepartmentsPage` (simplest, single field) → `UsersPage` → `UserFormPage`.
5. Wire routes in `App.tsx`; add nav links.
6. Run `npm run build`, `npm run lint`, and the new Vitest suite.
7. Manually verify: log in as seeded Admin → create department → create user → confirm pending → activate → edit → deactivate → delete department with a user in it → confirm non-admin is blocked from `/admin/*`.
8. Update `docs/SETUP.md` if the manual test flow changes.
9. Produce PASS or FAIL sprint review.

## Dependencies

- Same as Sprint 1: MySQL reachable for full manual end-to-end verification (still blocked locally until Docker Desktop is installed). Automated tests use SQLite-in-memory and are unaffected.
- At least one non-admin user must exist to test the "non-admin blocked from /admin/*" acceptance criterion — create one via the API during manual testing if needed.

## Risks

- If MySQL is still unreachable when this sprint is implemented, manual end-to-end verification is blocked the same way it was in Sprint 1 — automated tests remain sufaicient proof of logic correctness, not of the real deployment path.
- Introducing Vitest now (rather than in Sprint 1) means Sprint 1's existing frontend code (`AuthContext`, `apiClient`) has no automated frontend tests yet; this sprint does not retroactively add them, only covers new Sprint 2 code, to avoid scope creep into re-opening a closed sprint.
- The department-delete confirmation is a UX nicety, not a hard guarantee — the backend will still nullify `department_id` on delete regardless of what the UI shows, matching existing Sprint 1 behavior.

## Validation Checklist

- Confirm no business modules beyond user/department management were implemented.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation.
- Confirm `/admin/*` routes are inaccessible (not just visually hidden) to non-admin roles — verify by directly navigating a non-admin session to the URL.
- Confirm no secrets are committed.
- Confirm the edit form cannot change status or password (matching `UpdateUserRequest`).

## Manual Testing Plan

1. Log in as the seeded Admin.
2. Navigate to Manage Departments; create "Engineering".
3. Navigate to Manage Users; create a new Employee assigned to Engineering. Confirm it shows status `pending`.
4. Activate the new user from the list; confirm status becomes `active`.
5. Edit the user's role to Supervisor; confirm the change is reflected in the list.
6. Deactivate the user; confirm status becomes `deactivated`.
7. Attempt to delete the Engineering department; confirm the UI warns that a user is assigned before deleting.
8. Log out; log in as a non-admin user (e.g., activate a second Employee account for this); attempt to navigate directly to `/admin/users`; confirm redirection.

## Automated Testing Plan

```bash
cd backend
php artisan test

cd ../frontend
npm run build
npm run lint
npm run test    # new Vitest suite
```

## Definition Of Done

- All Acceptance Criteria met.
- All automated validation commands pass.
- Manual Testing Plan executed and results recorded in the sprint review (PASS/FAIL), noting explicitly if MySQL was unreachable and manual steps were skipped as a result.
- No business modules outside user/department management were touched.
- `docs/DECISIONS.md` and `docs/QUESTIONS.md` untouched.

## Code Generation Prompt

Use this only after Sprint 2 is approved:

```text
Implement Sprint 2 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md
- sprints/SPRINT_01.md
- sprints/SPRINT_02.md

Objective:
Build the Admin user and department management UI only, consuming the
existing Sprint 1 backend API. Add withCount('users') to
Admin\DepartmentController::index() as the only backend change.

Constraints:
- Do not implement time tracking, timesheets, scrum, KPI, payroll, AI,
  dashboards, reports, or attachments.
- Do not add an admin-triggered password reset/change for other users.
- Do not add pagination, search, filtering, or bulk actions.
- The user edit form may only change name, email, role, and department.
- Do not resolve docs/QUESTIONS.md Section Q or the flagged O/P sub-items.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- One-line backend query change + test
- Vitest + RTL installed and configured
- Admin API client, AdminRoute, AppLayout, UsersPage, UserFormPage,
  DepartmentsPage, and routing updates (frontend)
- PASS or FAIL Sprint 2 review
```

## Validation Prompt

```text
Validate Sprint 2.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether /admin/* routes are genuinely inaccessible to non-admin roles
  (not just hidden in the UI)
- Whether the user edit form matches UpdateUserRequest's actual fields
- Whether any unapproved business features were implemented
- Whether docs/DECISIONS.md and docs/QUESTIONS.md were left untouched
- Build/test readiness (backend and frontend, including the new Vitest suite)

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 2 implementation.
