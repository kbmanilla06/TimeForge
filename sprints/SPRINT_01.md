# Sprint 1 - Authentication And Role Foundation

## Sprint Goal

Implement the Authentication and Role Management module: users can log in, are identified by one of the four approved roles, and API/frontend routes are protected accordingly. Establish the minimal Department data model needed to support supervisor-scoped visibility (`docs/DECISIONS.md`, Roles And Permissions).

Sprint 1 implements the auth "rails" only. It does not implement the Admin user-management UI, timesheets, approvals, KPIs, payroll, scrum, AI, dashboards, or reports.

## Status

Plan and implementation decisions approved. Awaiting final go-ahead to begin implementation.

## Why This Sprint Exists

Every other PRD module (7.1-7.8) is gated by "who is this user and what can they do." `docs/DECISIONS.md` already locks the shape of this: four fixed roles, one role per user, admin-only user creation, admin-approval-gated activation, and Supervisor visibility scoped to their team/department. None of that exists in the codebase yet — `backend/` has Sanctum and Horizon installed but no roles, no login endpoint, and no protected routes; `frontend/` has no auth state at all. Sprint 1 builds this foundation so every subsequent sprint can assume "the current user and their role are known" rather than re-solving auth each time.

## Source Decisions This Sprint Implements

From `docs/DECISIONS.md`:

- Four roles: Employee, Supervisor, HR/Finance, System Administrator. One primary role per user.
- Supervisors see only employees in their team/department.
- Only System Administrators can create, edit, deactivate, and assign users.
- Login uses email and password. No email verification. No 2FA. Password reset is required.
- New accounts require admin approval before active use.
- Database designed single-company for MVP, but not in a way that blocks adding multi-tenancy later.

## User Stories

1. As a System Administrator, I want to create user accounts with a role and department so employees can access the system.
2. As a System Administrator, I want new accounts to stay inactive until I approve them, so unapproved people cannot use the system.
3. As any active user, I want to log in with email and password and stay authenticated across requests.
4. As any user, I want to reset my password if I forget it.
5. As a Supervisor, I want the system to know which department I belong to, so future sprints can scope my visibility to my team.
6. As a developer, I want role checks enforced by Laravel policies/gates, not scattered `if` statements, so authorization stays consistent as new modules are added.
7. As a frontend user, I want to be redirected to login if I'm not authenticated, and see who I'm logged in as once I am.

## Confirmed Implementation Decisions

These were flagged as open gaps when this plan was first drafted and have since been approved and recorded in `docs/DECISIONS.md` under "Sprint 1 Implementation Decisions (Approved)":

1. **Initial password provisioning:** The Admin sets the initial password directly when creating a user account (simple form field). No invitation-email flow for MVP.
2. **Department/"team" modeling:** A single `departments` table. A Supervisor's "team" means every user sharing their `department_id`. No separate Team entity for MVP.
3. **Sanctum authentication style:** Token-based Sanctum authentication, because the frontend and backend are separate applications and the deployment target is not yet final.

## Explicitly Out Of Scope This Sprint

- Admin-facing UI for managing users/departments (list/create/edit screens). Backend API endpoints exist; the UI is Sprint 2.
- Supervisor "view my team" UI/endpoint beyond what's needed to prove department scoping works in a test — real usage comes with the Approval Workflow sprint.
- Time tracking, timesheets, scrum, KPIs, payroll, AI, dashboards, reports, attachments.
- Email delivery via a real provider — password reset emails use Laravel's `log` mail driver for now (writes to `storage/logs/laravel.log` instead of sending), consistent with AI/deployment/provider decisions still being open.
- Section Q, and the flagged O/P sub-items in `docs/QUESTIONS.md`, remain untouched.

## Backend Backlog

- Migration: add `role` (string enum: `employee`, `supervisor`, `hr_finance`, `admin`), `status` (string enum: `pending`, `active`, `deactivated`), `department_id` (nullable FK) to `users`.
- Migration: create `departments` table (`id`, `name`, timestamps).
- `Department` model with `users()` relationship.
- `User` model: fillable/casts for `role`/`status`, `department()` relationship, role-check helpers (`isAdmin()`, `isSupervisor()`, etc.).
- `UserPolicy`: only `admin` role may create/update/deactivate users.
- `DepartmentPolicy`: only `admin` role may create/update/delete departments.
- `EnsureUserIsActive` middleware: blocks authenticated requests from `status = pending` or `status = deactivated` accounts.
- `AuthController`: `POST /api/login`, `POST /api/logout`, `POST /api/forgot-password`, `POST /api/reset-password`, using Laravel's built-in password broker (no custom token logic).
- `Admin\UserController`: `index`, `store`, `update`, `deactivate`/`activate` — all behind `role:admin` + `auth:sanctum`.
- `Admin\DepartmentController`: `index`, `store`, `update`, `destroy` — behind `role:admin` + `auth:sanctum`.
- Routes grouped in `routes/api.php`: public `auth/*`, protected `admin/*`.
- `DatabaseSeeder`: seed exactly one `admin` user (status `active`) so the system is usable after a fresh install. Document the seeded credentials clearly as development-only in `docs/SETUP.md`.
- Update `database/factories/UserFactory.php` for the new columns.
- Feature tests: login success/failure, pending/deactivated account blocked, logout, password reset request + confirm, admin-only endpoints return 403 for non-admin roles, department CRUD authorization.

## Frontend Backlog

- `src/lib/apiClient.ts`: fetch wrapper reading `VITE_API_URL`, attaching the bearer token, centralized error handling.
- `src/context/AuthContext.tsx` + `useAuth()` hook: current user, token persistence, `login()`/`logout()`.
- `src/types/auth.ts`: `User`, `Role`, `LoginResponse` TypeScript types mirroring the backend shape.
- `LoginPage` (`/login`): email/password form, calls `POST /api/login`, redirects on success.
- `ForgotPasswordPage` (`/forgot-password`) and `ResetPasswordPage` (`/reset-password/:token`).
- `ProtectedRoute` wrapper: redirects unauthenticated users to `/login`.
- Minimal authenticated placeholder page at `/` showing "Welcome, {name} ({role})" — proves the auth flow works end-to-end without building the real Dashboard module early.
- `frontend/.env.example` with `VITE_API_URL`.

## Acceptance Criteria

Sprint 1 is complete when:

- A seeded Admin account can log in via the API and the frontend `/login` page.
- An Admin can create a user via the API with a role and department; the account starts `pending` and cannot log in until activated.
- Activating a user via the API allows them to log in.
- A deactivated user cannot log in or use an existing token.
- Non-admin roles receive 403 from `admin/*` endpoints.
- Password reset request + confirm works end-to-end using the `log` mail driver.
- Frontend redirects unauthenticated visitors to `/login` and shows the logged-in user's name/role after login.
- All new backend endpoints have feature test coverage.
- No timesheet, payroll, KPI, scrum, AI, dashboard, report, or attachment code exists.

## Deliverables

- Backend: migrations, models, policies, middleware, controllers, routes, seeder, factory updates, feature tests.
- Frontend: auth context, API client, login/forgot/reset pages, protected route wrapper, placeholder authenticated page.
- Updated `docs/SETUP.md` documenting seeded admin credentials and how to test the auth flow.
- This file (`sprints/SPRINT_01.md`).

## Implementation Order

1. Backend: migrations → models → policies/middleware → controllers/routes → seeder/factory → feature tests.
2. Run `php artisan test`.
3. Frontend: types → API client → auth context → login/forgot/reset pages → protected route → placeholder page.
4. Run `npm run build` and `npm run lint`.
5. Manually verify the full flow: seed admin → login via API → login via UI → create+activate a second user → confirm role-based 403s.
6. Update `docs/SETUP.md`.
7. Produce PASS or FAIL sprint review.

## Dependencies

- Backend: MySQL reachable for `php artisan migrate` (still blocked locally until Docker Desktop is installed, per Sprint 0's deferred item — SQLite-in-memory via `phpunit.xml` is sufficient for automated tests but not for manual end-to-end verification).
- Frontend: backend running locally (`php artisan serve` or Docker) so `VITE_API_URL` resolves.

## Risks

- If MySQL still isn't reachable when this sprint is implemented, manual end-to-end verification (step 6 above) will be blocked the same way Docker validation was in Sprint 0 — automated tests will still pass via SQLite, but that's not equivalent proof the login flow works against MySQL.
- The Department-as-team modeling is a simplification; if a later sprint reveals "team" must be independent of "department" (e.g., cross-department teams), this will require an additive migration, not a rewrite — acceptable risk.
- Token-based Sanctum auth needs revisiting if a future deployment decision puts frontend and backend on the same domain and session-based auth becomes preferable.

## Validation Checklist

- Confirm no business modules beyond auth/roles were implemented.
- Confirm `docs/DECISIONS.md` and `docs/QUESTIONS.md` remain unedited by this sprint's implementation (except `docs/SETUP.md`, which is expected to change).
- Confirm all four roles and three statuses are enforced by tests, not just present in the schema.
- Confirm no secrets (seeded password, `.env`) are committed.
- Confirm policies/gates are used for authorization, not inline role checks in controllers.

## Manual Testing Plan

1. Run migrations and seeder against a reachable MySQL instance.
2. Log in as the seeded Admin via `POST /api/login`.
3. Create a new user via `POST /api/admin/users` with role `employee`; confirm `status` is `pending`.
4. Attempt to log in as that user — expect rejection.
5. Activate the user via the API; log in again — expect success.
6. Attempt to call `POST /api/admin/users` as the newly logged-in `employee` — expect 403.
7. Trigger `POST /api/forgot-password`, confirm a reset entry is logged via the `log` mail driver, then complete `POST /api/reset-password`.
8. Open the frontend at `/`, confirm redirect to `/login`, log in, confirm the placeholder page shows the correct name and role.

## Automated Testing Plan

```bash
cd backend
php artisan test

cd ../frontend
npm run build
npm run lint
```

New Pest/PHPUnit feature tests are required for every endpoint listed in the Backend Backlog; this sprint is not done if any endpoint lacks a passing/failing-case test pair.

## Definition Of Done

- All Acceptance Criteria met.
- Automated backend and frontend validation commands pass.
- Manual Testing Plan executed and results recorded in the sprint review (PASS/FAIL), noting explicitly if MySQL was unreachable and manual steps were skipped as a result.
- No business modules outside Authentication/Role Management were touched.
- `docs/DECISIONS.md` is not modified during implementation itself (the three implementation decisions are already recorded there as approved prior to implementation).

## Code Generation Prompt

Use this only after Sprint 1 is approved:

```text
Implement Sprint 1 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md
- sprints/SPRINT_01.md

Objective:
Implement Authentication and Role Management only: users, roles, departments,
login/logout, password reset, admin-only user/department management API,
and the minimal frontend auth flow (login, forgot/reset password, protected
route, placeholder authenticated page).

Constraints:
- Do not implement time tracking, timesheets, scrum, KPI, payroll, AI,
  dashboards, reports, or attachments.
- Do not build the Admin user-management UI (Sprint 2).
- Do not resolve docs/QUESTIONS.md Section Q or the flagged O/P sub-items.
- Use Laravel policies/gates for all authorization, not inline role checks.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Migrations, models, policies, middleware, controllers, routes, seeder,
  factory updates, and feature tests (backend)
- Auth context, API client, login/forgot/reset pages, protected route,
  placeholder page (frontend)
- Updated docs/SETUP.md
- PASS or FAIL Sprint 1 review
```

## Validation Prompt

```text
Validate Sprint 1.

Inspect:
- Correctness against CLAUDE.md and docs/DECISIONS.md
- Whether all four roles and all three account statuses are enforced and tested
- Whether authorization uses policies/gates consistently
- Whether any unapproved business features were implemented
- Whether docs/DECISIONS.md and docs/QUESTIONS.md were left untouched
- Security basics: password hashing, no plaintext secrets, 403s on
  unauthorized admin endpoints
- Build/test readiness

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 1 implementation.
