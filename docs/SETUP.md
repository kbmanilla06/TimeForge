# TimeForge Local Development Setup

This document covers Sprint 0 (project foundation), Sprint 1 (Authentication And Role Foundation), Sprint 2 (Admin User And Department Management UI), Sprint 3 (Client And Project Management Foundation), and Sprint 4 (Time Tracking Foundation). No other business modules (timesheets, scrum, KPI, payroll, AI, dashboards, reports, attachments) exist yet.

## Prerequisites

| Tool | Status on this machine | Notes |
| --- | --- | --- |
| PHP 8.5 | Installed via Homebrew (`brew install php`) | Required for Laravel. |
| Composer 2.10 | Installed via Homebrew (`brew install composer`) | Required for Laravel. |
| Node.js 22 / npm 10 | Already present | Required for Vite/React. |
| Docker Desktop | **Not installed** | Deferred by project decision. Install manually from docker.com when ready to run `docker-compose.yml`. |
| MySQL | **Not installed locally** | Intended to run via the `mysql` service in `docker-compose.yml` once Docker Desktop is installed. |
| Redis | **Not installed locally** | Intended to run via the `redis` service in `docker-compose.yml` (required for Laravel Horizon). |

## Option A: Run Backend/Frontend Directly On The Host

### Backend (`backend/`)

```bash
cd backend
composer install          # already run during scaffolding; re-run after pulling new commits
cp .env.example .env      # if .env does not already exist
php artisan key:generate  # already run during scaffolding
php artisan migrate       # requires a reachable MySQL database — see Option B if none is running
php artisan serve         # http://localhost:8000
```

The default `.env` is configured for MySQL (`DB_CONNECTION=mysql`, `DB_HOST=127.0.0.1`, `DB_PORT=3306`, `DB_DATABASE=timeforge`, `DB_USERNAME=timeforge`, `DB_PASSWORD=secret`) and Redis-backed queues (`QUEUE_CONNECTION=redis`), matching the services defined in `docker-compose.yml`. Without a running MySQL/Redis instance, `php artisan migrate` and queue commands will fail to connect — this is expected until Option B is available. `php artisan test` does not require a live database; PHPUnit is configured to use an in-memory SQLite connection for tests.

`FRONTEND_URL` (default `http://localhost:5173`) tells the backend where the React SPA lives, so password-reset emails link to the SPA's `/reset-password/:token` page instead of a Laravel-named web route (this app is API-only, so no such route exists).

After migrating, seed the database to create the one bootstrap account (see "Seeded Admin Account" below):

```bash
php artisan db:seed
```

### Frontend (`frontend/`)

```bash
cd frontend
cp .env.example .env   # sets VITE_API_URL=http://localhost:8000
npm install             # already run during scaffolding; re-run after pulling new commits
npm run dev             # http://localhost:5173
```

## Seeded Admin Account

Only a System Administrator can create other users (`docs/DECISIONS.md`), so `DatabaseSeeder` creates exactly one bootstrap Admin account:

- Email: `admin@timeforge.test`
- Password: `password`

**Development only.** Do not use these credentials, or this seeder, against a production database.

## Testing The Auth Flow And Admin UI Manually

Once MySQL is reachable (Option B, or a locally installed MySQL) and both apps are running:

1. Log in at `http://localhost:5173/login` with the seeded Admin credentials.
2. You should land on `/` and see "Welcome, TimeForge Admin (admin)", with a top nav showing Home, Manage Users, Manage Departments, Manage Clients, and Manage Projects (admin-only links) plus a Log out button.
3. Go to Manage Departments; create a department (e.g., "Engineering").
4. Go to Manage Users; click Create User, fill in name/email/initial password/role/department, and submit. Confirm the new user appears in the list with status `pending`.
5. Click Activate on that user; confirm the status updates to `active` without a page reload.
6. Click Edit on that user; change their role or department and save; confirm the list reflects the change.
7. Click Deactivate on that user; confirm a browser confirmation dialog appears, and the status updates to `deactivated` after confirming.
8. Try deleting a department that still has a user assigned to it; confirm the browser dialog names how many users will be unassigned.
9. Go to Manage Clients; create a client (e.g., "Acme Corp").
10. Go to Manage Projects; create a project (e.g., "Website Redesign") and assign it to "Acme Corp"; confirm the list shows "Acme Corp" as its client.
11. Return to Manage Clients; confirm it shows 1 project for "Acme Corp". Delete "Acme Corp"; confirm the warning names 1 affected project, and that the project still exists afterward with no client.
12. Log out via the nav bar; confirm you're redirected to `/login`.
13. Log in as a non-admin user and confirm navigating directly to `/admin/users`, `/admin/clients`, or `/admin/projects` redirects you back to `/`.

## Testing Time Tracking Manually

Every authenticated role (not just Admin) has access to the "Time Tracking" nav link and page:

1. Log in as any active user (Admin or otherwise) and click "Time Tracking" in the nav bar.
2. Start a timer: fill in Task/Work Category/Description (project/client optional), click "Start Timer". Confirm the elapsed-time display starts counting up and the Start form is replaced by a running-timer view with a "Stop" button.
3. Click "Stop"; confirm the entry appears in "My Time Entries" with a computed duration, and the Timer section reverts to the Start form.
4. Add a manual entry via the "Add Manual Time Entry" form (date, start, end, project, task, category, description, optional reference links/deliverables — one per line). Confirm it appears in the list.
5. Try adding a manual entry that overlaps an existing one; confirm it's rejected with an error message.
6. Try adding a manual entry dated tomorrow; confirm it's rejected.
7. Start a timer, then try starting a second one before stopping the first; confirm it's rejected.
8. Confirm the summary panel shows correct Today / This Week / This Month / Payroll Period totals, and that Edit/Delete are disabled for the currently-running entry (only available once stopped).
9. Log in as a second user; confirm they cannot see the first user's time entries (via the UI or by calling `GET /api/time-entries` directly with their own token).

## Option B: Run Everything Via Docker (Once Docker Desktop Is Installed)

```bash
docker compose up -d --build
docker compose exec app composer install
docker compose exec app php artisan key:generate
docker compose exec app php artisan migrate
```

- Backend (via nginx): http://localhost:8000
- Frontend (Vite dev server): http://localhost:5173
- MySQL: localhost:3306 (user `timeforge` / password `secret` / database `timeforge`)
- Redis: localhost:6379

This has not been run or validated on this machine yet because Docker Desktop is not installed. `docker-compose.yml` has been checked for valid YAML syntax only.

Laravel Horizon (queue dashboard) is not started automatically. Once queue-driven features exist in a later sprint, start it manually inside the app container: `docker compose exec app php artisan horizon`.

## Validation Commands

Run these after any change to confirm the foundation still works:

```bash
# Backend
cd backend
php artisan test

# Frontend
cd frontend
npm run build
npm run lint
npm run test
```

## Known Deferred Items

These are intentionally out of scope so far and must not be assumed when their sprint is reached — see `docs/QUESTIONS.md` Section Q, and the flagged sub-items in Section P:

- Dashboard role-scoping and refresh behavior.
- Attachment malware scanning and retention period. Attachment upload/storage itself is not implemented yet (Sprint 4 deferred it entirely — see `docs/DECISIONS.md` Sprint 4 decisions).
- Docker Desktop installation and container validation (`docker compose up`).
- Production deployment target and CI/CD.
- Employee-to-project assignment restrictions (currently: any employee may reference any project — see `docs/DECISIONS.md` Sprint 3 decisions).
- Smart Timesheet submission and the submitted/locked entry state, Supervisor Approval Workflow, and KPI linkage from time entries — none of these exist yet; all Sprint 4 time entries remain editable/deletable by their owner indefinitely until a later sprint introduces submission.
