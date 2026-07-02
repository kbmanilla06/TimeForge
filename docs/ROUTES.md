# TimeForge Route And Feature Inventory

As of Sprint 14 (feature-complete MVP). Generated from `php artisan route:list` and verified against controllers, policies, and feature tests. All `/api/*` routes return JSON. Rate limits (Sprint 14): public auth endpoints 5 requests/minute per email+IP; all authenticated endpoints 60 requests/minute per user.

## Public Endpoints (`throttle:auth`)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| POST | `/api/login` | Public (active accounts only can log in) | 1 |
| POST | `/api/forgot-password` | Public | 1 |
| POST | `/api/reset-password` | Public | 1 |

## Session (`auth:sanctum` + `active` + `throttle:api`)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| POST | `/api/logout` | Any active user | 1 |
| GET | `/api/me` | Any active user (no `hourly_rate`/password exposure) | 1 |

## Admin Portal (`role:admin`)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET/POST | `/api/admin/users`, PATCH `/api/admin/users/{user}` | Admin only | 1-2 |
| PATCH | `/api/admin/users/{user}/activate`, `/deactivate` | Admin only | 1-2 |
| GET/POST/PATCH/DELETE | `/api/admin/departments[/{department}]` | Admin only | 1-2 |
| GET/POST/PATCH/DELETE | `/api/admin/clients[/{client}]` | Admin only | 3 |
| GET/POST/PATCH/DELETE | `/api/admin/projects[/{project}]` | Admin only | 3 |
| POST | `/api/admin/kpis` | Admin only | 6 |

Admin user responses are the only surface that serializes `hourly_rate` (Sprint 14 security fix).

## Read-Only Catalogs

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET | `/api/projects`, `/api/clients` | Any active user | 4 |
| GET | `/api/kpis` | Any active user | 6 |
| GET | `/api/team-members` | Supervisor (own department) / Admin (all) | 6 |

## Time Tracking (Sprint 4) + Attachments (Sprint 13)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET | `/api/time-entries`, `/api/time-entries/summary` | Owner (self-scoped) | 4 |
| POST | `/api/time-entries`, `/api/time-entries/start` | Owner | 4 |
| GET/PATCH/DELETE | `/api/time-entries/{timeEntry}` | Owner; edit/delete only while not locked | 4-5 |
| PATCH | `/api/time-entries/{timeEntry}/stop` | Owner | 4 |
| POST | `/api/time-entries/{timeEntry}/attachments` | Owner, entry editable; pdf/png/jpg/jpeg/docx/xlsx ≤10MB | 13 |
| GET | `/api/time-entries/{te}/attachments/{a}/download` | Owner / own-department Supervisor / Admin (never HR/Finance) | 13 |
| DELETE | `/api/time-entries/{te}/attachments/{a}` | Owner, entry editable | 13 |

## Timesheets And Approval (Sprint 5)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET/POST | `/api/timesheets` | Owner (submit own day) | 5 |
| GET | `/api/timesheets/team` | Supervisor (own department) / Admin | 5 |
| GET | `/api/timesheets/{timesheet}` | Owner / own-department Supervisor / Admin | 5 |
| PATCH | `/api/timesheets/{t}/approve`, `/reject`, `/request-revision` | Supervisor (own department) / Admin; never one's own | 5 |
| PATCH | `/api/timesheets/{t}/reopen` | Admin only | 5 |

## Notifications (Sprint 5)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET | `/api/notifications` | Owner | 5 |
| PATCH | `/api/notifications/{notification}/read` | Owner | 5 |

## KPIs (Sprint 6)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET | `/api/kpi-assignments/mine` | Owner | 6 |
| GET | `/api/kpi-assignments/team` | Supervisor (own department) / Admin | 6 |
| POST/DELETE | `/api/kpi-assignments[/{kpiAssignment}]` | Supervisor (own department) / Admin | 6 |

## Daily Scrum (Sprint 7)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET/POST | `/api/daily-scrums` | Owner (entry locks after first reviewer comment) | 7 |
| GET | `/api/daily-scrums/team` | Supervisor (own department) / Admin | 7 |
| GET | `/api/daily-scrums/{dailyScrum}` | Owner / own-department Supervisor / Admin | 7 |
| POST | `/api/daily-scrums/{dailyScrum}/comments` | Supervisor (own department) / Admin | 7 |

## Payroll And Reports (Sprints 8-9)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET | `/api/payroll` | Admin / HR-Finance only | 8 |
| GET | `/api/payroll/export/pdf`, `/export/excel` | Admin / HR-Finance only | 9 |
| GET | `/api/team-hours-report/export/pdf`, `/export/excel` | Supervisor (own department) / Admin / HR-Finance (any); no rates or pay figures | 9 |

## Dashboard (Sprint 10)

| Method | Path | Access | Sprint |
| --- | --- | --- | --- |
| GET | `/api/dashboard` | Supervisor (own department) / Admin + HR-Finance (organization-wide; `payroll_summary` only for Admin/HR) | 10 |

## AI Insights (Sprints 11-12)

One resource serves all seven capability types; access is per type:

| Method | Path | Type → Access | Sprint |
| --- | --- | --- | --- |
| GET/POST | `/api/ai-outputs` | `daily_work_summary`, `weekly_productivity_report`, `productivity_trend_analysis` (user subject): self / own-department Supervisor / Admin | 11-12 |
| | | `recurring_blockers`, `kpi_performance_analysis`, `supervisor_recommendations` (department subject): own-department Supervisor / Admin | 11-12 |
| | | `payroll_validation` (organization subject): Admin / HR-Finance only — HR/Finance's sole AI capability | 12 |

## Framework Routes

| Path | Access | Note |
| --- | --- | --- |
| `/up` | Public | Laravel health check |
| `/horizon*` | `local` environment only | Auto-registered by Horizon (installed, never started); the gate's email allowlist is empty, denying everyone in non-local environments |

## PRD Feature Inventory

| PRD § | Module | Sprint(s) | Status |
| --- | --- | --- | --- |
| 7.1 | Time Tracking (timer, manual entries, summaries, reference links, deliverables, attachments) | 4, 13 | Complete |
| 7.2 | Smart Timesheets (work detail, task status, KPI linkage) | 4-6 | Complete |
| 7.3 | Daily Scrum | 7 | Complete |
| 7.4 | KPI Performance Management | 6 | Complete |
| 7.5 | Supervisor Approval Workflow | 5 | Complete |
| 7.6 | Payroll Preparation (+PDF/Excel export) | 8-9 | Complete (estimates only, per decisions) |
| 7.7 | Dashboard And Analytics | 10 | Complete |
| 7.8 | AI Integration (all seven capabilities) | 11-12 | Complete (local stub provider; real provider deferred) |
| 6.4 | Administrative Portal | 1-3, 6 | Complete (AI-config UI deferred with real provider) |
| — | Auth, roles, notifications, rate limiting | 1, 5, 14 | Complete |
