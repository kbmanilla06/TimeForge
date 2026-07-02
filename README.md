# TimeForge

An AI-powered Workforce Performance Management System: time tracking, smart timesheets with supervisor approval, daily scrum reporting, KPI management, payroll preparation with PDF/Excel exports, management dashboards, file attachments, and seven on-demand AI insight capabilities — built sprint-by-sprint as a feature-complete MVP (Sprints 0–14).

Prepared for StartupLab Business Center & AI Consulting Services OPC. Requirements: `docs/PRD.md`.

## Feature Highlights

- **Time Tracking** — start/stop timer + manual entries, overlap/future-date protection, reference links, deliverables, file attachments (PDF/PNG/JPG/JPEG/DOCX/XLSX, ≤10MB, private storage).
- **Timesheets & Approval** — one timesheet per day; submit → supervisor approve/reject/request-revision → admin reopen; permanent comment history; in-app notifications.
- **Daily Scrum** — structured daily updates with blockers; supervisor comments lock entries.
- **KPIs** — numeric KPIs assigned to people or departments; progress credited only on timesheet approval (double-count protected).
- **Payroll Preparation** — semi-monthly periods, daily overtime beyond 8h at a configurable multiplier, per-employee estimates; PDF/Excel exports; a separate rate-free Team Hours Report for supervisors.
- **Dashboard** — role-scoped, live-computed: hours, productivity, department performance, KPI completion, attendance trends, billable split, project allocation, payroll summary (Admin/HR only).
- **AI Insights** — daily/weekly summaries, productivity trends, recurring-blocker detection, KPI analysis, supervisor recommendations, payroll validation. Provider-agnostic architecture running a **local deterministic stub**: zero external calls, zero credentials, append-only outputs with full source-data audit snapshots, everything labeled AI-generated.
- **Security** — four roles enforced server-side (policies + middleware, 403-tested), Sanctum token auth, admin-approved account activation, login/API rate limiting, payroll data hidden from non-payroll roles, attachment paths never exposed.

## Tech Stack

Laravel 13 (PHP 8.5, MySQL, Sanctum) · React 19 + TypeScript + Vite + Tailwind CSS + React Router + Recharts · PHPUnit & Vitest · Docker Compose (app, nginx, MySQL, Redis).

## Repository Layout

| Path | Contents |
| --- | --- |
| `backend/` | Laravel API (app, migrations, seeders, 177 tests) |
| `frontend/` | React SPA (pages, role guards, API clients, 161 tests) |
| `docs/` | PRD, decisions, questions, setup, routes, database, QA checklist, user guide, demo script |
| `sprints/` | The per-sprint plans and records (Sprint 0–14) — the project's history |
| `docker-compose.yml`, `docker/` | Local container stack (see Docker status below) |
| `prompts/`, `CLAUDE.md` | The Claude Code working kit used to build the project sprint-by-sprint |

## Quickstart

**Option A — host PHP + your own MySQL** (see `docs/SETUP.md` for detail):

```bash
cd backend
composer install && cp .env.example .env && php artisan key:generate
php artisan migrate --seed              # bootstrap admin: admin@timeforge.test / password
php artisan db:seed --class=DemoDataSeeder   # optional demo dataset (dev/demo ONLY)
php artisan serve                        # http://localhost:8000

cd ../frontend
npm install && cp .env.example .env
npm run dev                              # http://localhost:5173
```

**Option B — Docker** (`docker compose up -d --build`, then the same artisan commands inside the `app` container). **Status:** the compose stack has never been executed on the development machine (Docker Desktop not installed); it is a documented, ready-to-run runbook — see `docs/SETUP.md` Option B and `docs/QA_CHECKLIST.md` Phase 0.

**Validation:**

```bash
cd backend && php artisan test          # 177 tests, no DB required (SQLite in-memory)
cd frontend && npm run build && npm run lint && npm run test   # 161 tests, zero lint warnings
```

## Demo

`docs/DEMO.md` has the credentials, the seeded-data checklist, and a timed 15-minute role-by-role script. `docs/USER_GUIDE.md` is the role-organized user manual.

## Documentation Index

| Document | Purpose |
| --- | --- |
| `docs/PRD.md` | Source-of-truth requirements |
| `docs/DECISIONS.md` / `docs/QUESTIONS.md` | Every approved decision and its originating question |
| `docs/SETUP.md` | Environment setup + per-module manual walkthroughs |
| `docs/ROUTES.md` | Full API route + feature inventory with access rules |
| `docs/DATABASE.md` | Schema design documentation |
| `docs/QA_CHECKLIST.md` | The consolidated manual regression pass |
| `docs/USER_GUIDE.md` | Role-by-role user manual |
| `docs/DEMO.md` | Demo script + demo dataset |
| `sprints/SPRINT_00–14.md` | Sprint-by-sprint plans, decisions, and reviews |

## Known Limitations (handoff summary)

The deliberate MVP boundaries, each backed by a recorded decision (details: `docs/SETUP.md` Known Deferred Items, `docs/DECISIONS.md`):

- **Docker/MySQL end-to-end has never run** on the dev machine (Docker Desktop uninstalled) — the one remaining verification gap; automated suites cover everything on SQLite. Runbook: `docs/QA_CHECKLIST.md` Phase 0.
- **AI is a local stub** — real provider selection + external data-privacy rules are the last open product decision; the swap is config/binding, not architecture.
- **No malware scanning on uploads** (accepted risk with compensating controls: type/content validation, size cap, private storage, authorized download-only) — revisit at deployment hardening. Attachments retained indefinitely as audit evidence.
- **Everything is synchronous** — no queues/Horizon workers, scheduled jobs, or email notifications yet (in-app only); exports generate on request.
- Single company, one role per user, no leave/holidays, taxes or deductions (payroll = estimates), no multi-tenancy — all explicit MVP scope decisions.
- Rejected timesheets are terminal for the employee (only Admin reopen); KPI progress is never auto-reversed after reopen; recurring-blocker matching is exact-text, not semantic.
- Frontend ships one >500kB chunk (Recharts) — a candidate for code-splitting, not a functional issue.

## Production Notes (before any deployment)

Deployment target is still an open decision. Whenever it lands: set `APP_ENV=production`, `APP_DEBUG=false`, a fresh `APP_KEY`; serve over HTTPS and restrict CORS/Sanctum to the real frontend origin; persist and back up `storage/app` (attachments live there) and the MySQL volume; configure a real mailer (password resets); keep `/horizon` gated (its allowlist is empty by default — access only in `local`); revisit malware scanning for uploads; change every demo credential and never run `DemoDataSeeder` outside dev/demo; put the queue worker + Horizon in place before enabling any future async features.

## Project History

Built with Claude Code, one approved sprint at a time (plan → clarify → approve → implement → validate → review). The `prompts/` kit and `CLAUDE.md` document that workflow; each `sprints/SPRINT_*.md` records what was decided and shipped, sprint by sprint.
