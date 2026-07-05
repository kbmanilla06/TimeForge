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
- **Account Onboarding** — a landing page with an integrated sign-in form; self-service Create Account with a live department picker, password-strength meter, and terms agreement; every new account starts Pending and cannot log in until an Admin reviews it from a searchable, filterable Account Approvals queue (approve/reject with an optional remark); email notifications for registration, admin review, approval, and rejection (local log-driver by default, no external mail provider required).
- **Security** — four roles enforced server-side (policies + middleware, 403-tested), Sanctum token auth, admin-approved account activation (via direct creation or self-registration), login/registration/API rate limiting, anti-enumeration password reset, payroll data hidden from non-payroll roles, attachment paths never exposed.

## Tech Stack

Laravel 13 (PHP 8.5, PostgreSQL, Sanctum) · React 19 + TypeScript + Vite + Tailwind CSS + React Router + Recharts · PHPUnit & Vitest · Docker Compose (app, nginx, PostgreSQL, Redis). Production runs on Supabase-hosted Postgres + Supabase Storage (Sprint 39) — see `docs/DEPLOYMENT.md`.

## Repository Layout

| Path | Contents |
| --- | --- |
| `backend/` | Laravel API (app, migrations, seeders, 211 tests) |
| `frontend/` | React SPA (pages, role guards, API clients, 186 tests) |
| `docs/` | PRD, decisions, questions, setup, routes, database, QA checklist, user guide, demo script |
| `sprints/` | The per-sprint plans and records (Sprint 0–14) — the project's history |
| `docker-compose.yml`, `docker/` | Local container stack (see Docker status below) |
| `prompts/`, `CLAUDE.md` | The Claude Code working kit used to build the project sprint-by-sprint |

## Quickstart

**Option A — host PHP + your own PostgreSQL** (see `docs/SETUP.md` for detail):

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
cd backend && php artisan test          # 211 tests, no DB required (SQLite in-memory)
cd frontend && npm run build && npm run lint && npm run test   # 186 tests, zero lint warnings
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
| `docs/BACKUP_RESTORE.md` | Backup/restore runbook, disaster recovery + restore verification checklists |
| `sprints/SPRINT_00–14.md` | Sprint-by-sprint plans, decisions, and reviews |

## Known Limitations (handoff summary)

The deliberate MVP boundaries, each backed by a recorded decision (details: `docs/SETUP.md` Known Deferred Items, `docs/DECISIONS.md`):

- **Docker end-to-end has now run** (first on MySQL, 2026-07-03 — see `docs/QA_RUN_2026-07-03.md`; the stack moved to PostgreSQL in Sprint 39 for dev/prod parity with Supabase-hosted production, re-verified live against Postgres during Sprints 39–40) — including the post-MVP auth/onboarding enhancement (Sprints 15–19) exercised live against the real stack.
- **AI is a local stub** — real provider selection + external data-privacy rules are the last open product decision; the swap is config/binding, not architecture.
- **No malware scanning on uploads** (accepted risk with compensating controls: type/content validation, size cap, private storage, authorized download-only) — revisit at deployment hardening. Attachments retained indefinitely as audit evidence.
- **Email is log-driver only** (`MAIL_MAILER=log`) — registration, admin-review, approval, rejection, and password-reset emails all write to `storage/logs/laravel.log` rather than being delivered anywhere; no external mail provider is configured or required. Mail also sends synchronously — `QUEUE_CONNECTION=redis` is reachable, but no queue worker runs by default, so queuing is deferred rather than silently broken. Business-module events (Timesheets, Daily Scrum, KPIs) remain in-app-only via the Notifications page, no email.
- **No CAPTCHA on registration** — evaluated (Turnstile/reCAPTCHA v3/hCaptcha) and deliberately not added; the admin-approval gate is the primary anti-abuse control, since no self-registered account can gain access without a human Admin approving it.
- **No email verification before admin review** — evaluated and deferred; the Admin's manual review already serves as the identity check.
- Single company, one role per user, no leave/holidays, taxes or deductions (payroll = estimates), no multi-tenancy — all explicit MVP scope decisions.
- Rejected timesheets are terminal for the employee (only Admin reopen); KPI progress is never auto-reversed after reopen; recurring-blocker matching is exact-text, not semantic.
- Frontend ships one >500kB chunk (Recharts) — a candidate for code-splitting, not a functional issue.
- Any protected API route without an `Accept: application/json` header (no real client sends requests this way — the SPA always does) returns a verbose 500 instead of a 401; pre-existing app-wide Laravel behavior, not introduced by or specific to the auth/onboarding enhancement, and bounded by `APP_DEBUG=false` in production. See `docs/QA_RUN_2026-07-03.md` for detail.

## Production Notes (before any deployment)

Deployment target is resolved as of Sprint 39: Supabase-hosted Postgres for the database, Supabase Storage (S3-compatible) for attachments/profile pictures. Full environment variables, migration sequence, and build commands are in `docs/DEPLOYMENT.md`. Still true regardless of host: keep `/horizon` gated (its allowlist is empty by default — access only in `local`); revisit malware scanning for uploads (still an accepted MVP risk); change every demo credential and never run `DemoDataSeeder` outside dev/demo; put a queue worker + Horizon in place before enabling any future async features (mail/notifications currently send synchronously).

## Project History

Built with Claude Code, one approved sprint at a time (plan → clarify → approve → implement → validate → review). The `prompts/` kit and `CLAUDE.md` document that workflow; each `sprints/SPRINT_*.md` records what was decided and shipped, sprint by sprint.
