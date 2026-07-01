# TimeForge Local Development Setup

This document covers Sprint 0 foundation setup only. No business modules (time tracking, timesheets, scrum, KPI, payroll, AI, dashboards, reports, attachments) exist yet.

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

### Frontend (`frontend/`)

```bash
cd frontend
npm install     # already run during scaffolding; re-run after pulling new commits
npm run dev     # http://localhost:5173
```

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
```

## Known Deferred Items

These are intentionally out of scope for Sprint 0 and must not be assumed when their sprint is reached — see `docs/QUESTIONS.md` Section Q, and the flagged sub-items in Sections O and P:

- Dashboard role-scoping and refresh behavior.
- Client/project CRUD ownership, lifecycle status, and cardinality.
- Attachment malware scanning and retention period.
- Docker Desktop installation and container validation (`docker compose up`).
- Production deployment target and CI/CD.
