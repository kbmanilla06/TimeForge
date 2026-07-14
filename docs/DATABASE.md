# All in Time Database Design

As of Sprint 19 (feature-complete MVP plus the post-MVP auth/onboarding enhancement). PostgreSQL in development and production as of Sprint 39 (self-hosted via Docker locally, Supabase-hosted in production — previously MySQL; see `docs/DECISIONS.md` Sprint 39 entry); automated tests run the same migrations on SQLite in-memory. All tables use auto-increment `id` primary keys and `created_at`/`updated_at` timestamps unless noted. Single-company MVP by decision — no organization/tenant column anywhere, but no design choice blocks adding one later.

## Domain Tables

### departments (Sprint 1)
| Column | Notes |
| --- | --- |
| name | Department name |

A Supervisor's "team" = every user sharing their `department_id` (Sprint 1 decision; no separate teams table).

### users (Sprints 1, 8, 16)
| Column | Notes |
| --- | --- |
| name, email (unique), password (hashed) | Sanctum token auth |
| role | Enum string: `employee`, `supervisor`, `hr_finance`, `admin` — one role per user; self-registration (Sprint 16) can never set this to anything but `employee` |
| status | `pending` (needs admin approval — either an Admin-created account awaiting Activate, or a self-registered one awaiting the Sprint 17 approval workflow), `active`, `deactivated` (also what a *rejected* applicant becomes — no separate `rejected` value) |
| department_id | Nullable FK → departments |
| hourly_rate | Nullable decimal — payroll data; hidden from all serialization except Admin user management (Sprint 14) |
| employee_id, position, contact_number | Nullable strings added in Sprint 16 for the registration form; all optional, no format validation |

### account_requests (Sprints 16, 17)
| Column | Notes |
| --- | --- |
| user_id | Unique FK → users, cascade-deletes with the user |
| status | `submitted`, `approved`, `rejected` — independent of `users.status`, tracks the *decision*, not current access |
| terms_accepted_at | Timestamp, set at registration; not nullable |
| reviewed_by | Nullable FK → users (the deciding Admin) |
| reviewed_at | Nullable timestamp |
| rejection_reason | Nullable text — the optional remark an Admin can leave on reject |

Kept deliberately separate from `users`: it's workflow/audit metadata about one request, not an ongoing profile fact. One row per applicant (unique `user_id`) — no resubmission flow exists in MVP.

### clients (Sprint 3)
| Column | Notes |
| --- | --- |
| name | Minimal by decision — no other business fields |

### projects (Sprint 3)
| Column | Notes |
| --- | --- |
| name | |
| client_id | Nullable FK → clients (zero-or-one client per project; nullOnDelete) |

### time_entries (Sprints 4, 5, 6)
| Column | Notes |
| --- | --- |
| user_id | FK → users (cascade) |
| project_id, client_id, department_id | Nullable FKs (nullOnDelete); department copied from the user at creation |
| timesheet_id | Nullable FK → timesheets (nullOnDelete) — set when the day is submitted |
| date, start_time, end_time | end_time null = running timer (one per user, enforced in code) |
| duration_minutes | Computed on save from start/end; null while running |
| task, work_category, description | Required free text (Sprint 4 decisions — no task/category lookup tables) |
| task_status | Nullable free text (Sprint 5) |
| reference_links, deliverables | Nullable JSON arrays — plain text/URLs, distinct from file attachments |
| kpi_assignment_id | Nullable FK → kpi_assignments (Sprint 6) |
| kpi_progress_value | Nullable decimal(12,2) — progress reported by this entry |
| kpi_progress_applied_at | Nullable datetime — set once when progress is credited on timesheet approval; prevents double-counting on reopen/re-approve |

Overlap prevention is enforced in code (`TimeEntry::hasOverlap`), not by a DB constraint.

### timesheets (Sprint 5)
| Column | Notes |
| --- | --- |
| user_id | FK → users |
| date | **Unique (user_id, date)** — one timesheet per user per day |
| status | `submitted`, `approved`, `rejected`, `revision_requested` (no draft row exists before submission) |
| submitted_at, reviewed_by (FK users), reviewed_at | Review audit fields |

Entry locking is derived: an entry is locked when its timesheet exists and isn't `revision_requested`.

### timesheet_comments (Sprint 5)
| Column | Notes |
| --- | --- |
| timesheet_id, author_id | FKs |
| action | `approved`, `rejected`, `revision_requested`, `reopened` |
| comment | Nullable text — permanent history, never overwritten |

### kpis (Sprint 6)
| Column | Notes |
| --- | --- |
| name | |
| target_value | Nullable decimal — null = no completion rate computable |
| unit | Nullable string (e.g., "bugs") |
| created_by | FK → users (Admin creates KPIs) |

### kpi_assignments (Sprint 6)
| Column | Notes |
| --- | --- |
| kpi_id | FK → kpis |
| user_id / department_id | Exactly one set (enforced in validation): individual or department target |
| progress_value | All-time running total (no period resets, per decision); credited on timesheet approval |

### daily_scrums (Sprint 7)
| Column | Notes |
| --- | --- |
| user_id, date | **Unique (user_id, date)** — one scrum per user per day |
| previous_work, planned_work | Required text |
| blockers, notes | Nullable text — `blockers` feeds the AI recurring-blocker analysis |

Entries lock for the employee once the first reviewer comment exists (derived, no flag column).

### scrum_comments (Sprint 7)
| Column | Notes |
| --- | --- |
| daily_scrum_id, author_id | FKs |
| comment | Permanent history |

### notifications (Sprint 5)
Laravel's standard database notifications table (uuid id, morphs to `notifiable`, JSON `data`, `read_at`). Used for the five timesheet events.

### ai_outputs (Sprint 11, extended Sprint 12)
| Column | Notes |
| --- | --- |
| type | One of the seven capability values (e.g., `daily_work_summary`, `payroll_validation`) |
| user_id / department_id | Nullable FKs — user-shaped, department-shaped, or organization-shaped (both null, payroll validation) subjects |
| period_start, period_end | Resolved period (day / ISO week / semi-monthly / six-period trend window) |
| source_data | JSON — full audit snapshot of exactly what the provider saw |
| content | Generated text (deterministic stub provider) |
| provider, prompt_version | Audit fields (`stub`, `<type>.v1`) |
| generated_by | FK → users |

Append-only by design: no update/delete route exists; regeneration inserts a new row. Indexed on `(type, user_id, period_start)` and `(type, department_id, period_start)`.

### time_entry_attachments (Sprint 13)
| Column | Notes |
| --- | --- |
| time_entry_id | FK → time_entries (cascade; file cleanup via model events) |
| original_name | Shown to users and used as the download filename |
| path | Server-generated location on the private local disk — **hidden from all serialization** |
| mime_type, size_bytes | Validated: pdf/png/jpg/jpeg/docx/xlsx, ≤10MB, extension AND sniffed content type |
| uploaded_by | FK → users |

## Framework Tables

`personal_access_tokens` (Sanctum), `password_reset_tokens`, `sessions`, `cache`/`cache_locks`, `jobs`/`job_batches`/`failed_jobs` (present but unused — every feature is synchronous by decision; queues/Horizon await a future sprint).

## Relationship Overview

```text
departments 1—* users 1—* time_entries *—1 projects *—1 clients
users 1—* timesheets 1—* timesheet_comments
timesheets 1—* time_entries 1—* time_entry_attachments
users 1—* daily_scrums 1—* scrum_comments
kpis 1—* kpi_assignments (—1 user | —1 department) 1—* time_entries (progress source)
users/departments 1—* ai_outputs (or none: organization-shaped rows)
```
