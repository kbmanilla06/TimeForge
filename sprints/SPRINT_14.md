# Sprint 14 - Final QA, Documentation, Demo And Deployment Readiness

## Sprint Goal

Take the feature-complete All in Time MVP (Sprints 0-13: every PRD business module built, tested, and checkpointed) and make it **verifiable, demonstrable, documented, and handoff-ready**. No new business features: this sprint verifies what exists (full regression, security review, Docker/MySQL validation), polishes only what the approved hardening budget allows, seeds a demo dataset, and produces the documentation and demo artifacts a handoff requires.

## Status

Implemented and validated. Regression baseline: backend 177 tests / 640 assertions, frontend 161 tests, build clean, lint **zero warnings**. Hardening delivered: rate limiting (auth 5/min, api 60/min, test-verified), one P0 security fix (hourly_rate serialization leak to supervisor-facing responses — reported, test-proven, fixed, regression-locked), `useAuth` extraction, `.env.example` completion. `DemoDataSeeder` verified against a scratch database including its re-run guard and date clamping. All seven documentation artifacts shipped. Docker Desktop remained unavailable — the Docker/MySQL validation ships as the documented runbook (`docs/SETUP.md` Option B + `docs/QA_CHECKLIST.md` Phase 0) and is recorded as the single externally blocked known limitation. Sprint review: PASS.

## Why This Sprint Exists

Sprints 0-13 delivered every module in `docs/PRD.md` §7, each validated by its own automated suite (currently 171 backend tests / 561 assertions, 161 frontend tests) — but three gaps stand between "feature-complete" and "handoff-ready":

1. **The MySQL/Docker end-to-end path has never run.** Every sprint's manual test plan was skipped because Docker Desktop is not installed; automated tests use SQLite in-memory. `docker-compose.yml` has been syntax-checked only.
2. **Planning checks for this sprint found real hardening/documentation drift:** no rate limiting exists anywhere (an unthrottled `/api/login` is a credential-brute-force exposure — an OWASP Top 10 item CLAUDE.md requires reviewing); `.env.example` omits the `AI_PROVIDER` and `PAYROLL_OVERTIME_MULTIPLIER` variables introduced in Sprints 11/8; the frontend carries one lint warning.
3. **Several PRD §8 deliverables are documentation, not code** — Database Design Documentation and a User Manual don't exist yet; the README predates most sprints; there is no demo dataset (the seeder creates exactly one admin), no consolidated QA checklist, no demo script, and no single deliverables ledger.

## Source Requirements This Sprint Implements

From `docs/PRD.md` §8 (Expected Deliverables): Technical Documentation, Database Design Documentation, User Manual, Source Code Repository — plus final verification of every §7 module deliverable.

From `CLAUDE.md`: the standing Security Review Requirements (SQL injection, XSS, CSRF, authentication, authorization, **rate limiting**, input validation, mass assignment, sensitive data exposure, OWASP Top 10) and Performance Review Requirements, executed here as one consolidated pass over the finished system.

From `docs/DECISIONS.md`: Docker is required for local development (production Docker planned later); deployment target remains in Decisions Still Required — so "deployment readiness" here means a validated local container stack plus production notes, **not** an actual deployment.

## Resolved Clarification Questions

These were posed as OPEN proposals when this plan was first drafted, per `docs/QUESTIONS.md` Section R. All four have since been explicitly approved and recorded in `docs/DECISIONS.md` under "Sprint 14 Implementation Decisions (Approved)".

**CQ1. Will Docker Desktop be installed during Sprint 14, so the full manual regression can finally run against MySQL?**
Installing Docker Desktop is a machine-level action (download, license, privileged install) outside what I can do alone.
*Answer (approved):* You install Docker Desktop when convenient during the sprint; I then execute the full Docker/MySQL validation plan (below) end-to-end and record results in the sprint review. **If it is not installed by sprint end, Sprint 14 still completes:** the validation runbook ships as a documented, ready-to-run procedure, and MySQL end-to-end verification is recorded — explicitly and finally — as the single remaining known gap, exactly as every sprint review has noted since Sprint 0. The sprint's PASS is conditional on everything except this externally-gated step.

**CQ2. May I add a demo data seeder?**
The only seeder today creates one bootstrap admin; a demo of thirteen sprints of features against an empty database would be typing, not demonstrating.
*Answer (approved):* Yes — one dev-only `DemoDataSeeder` (tooling, not a business feature): two departments; one user per role with documented demo credentials; clients and projects; KPIs assigned to individuals and a department with realistic progress; two payroll periods of time entries across every timesheet state (including an overtime day and an unrated employee for payroll validation); daily scrums with one deliberately recurring blocker; hourly rates. Attachments are demonstrated by uploading live during the demo rather than seeding files to disk. The seeder is documented as **never for production** and is not wired into the default `db:seed` run.

**CQ3. Which documentation artifacts should Sprint 14 produce?**
*Answer (approved):* Refresh the existing root `README.md` (project overview, stack, quickstart, links); add `docs/ROUTES.md` (the route + feature inventory: every API route with method, roles, and owning sprint, generated from `php artisan route:list` and verified against code); add `docs/DATABASE.md` (schema overview per table with relationships — the PRD §8 "Database Design Documentation" deliverable); add `docs/QA_CHECKLIST.md` (the consolidated, ordered manual regression checklist assembled from SETUP.md's per-module sections); add `docs/DEMO.md` (the final demo script); add `docs/USER_GUIDE.md` (a lightweight, role-organized user manual — Employee / Supervisor / HR-Finance / Admin — derived from the walkthroughs that already exist, satisfying the PRD's "User Manual" in MVP form); and consolidate **Known Limitations** (SETUP.md's Known Deferred Items, restated as a handoff-facing list) into the README with a pointer to the detail. `docs/SETUP.md` gets an accuracy pass; historical sprint files are left untouched as the project record.

**CQ4. What is the hardening/polish budget inside "no new business features"?**
*Answer (approved):* Exactly four items, all evidence-backed, none behavior-changing for legitimate use — with the explicit prohibition that no new business features, modules, endpoints, migrations, dependencies, dashboards, AI capabilities, export types, attachment features, or UX redesigns are added:
1. **Add rate limiting** (found missing in planning): a strict limiter on `login`/`forgot-password`/`reset-password` (brute-force protection) and a standard per-user API limiter on the authenticated group, with tests, configured to stay out of the way of the existing test suite.
2. **Fix the final lint warning** by moving the `useAuth` hook out of `AuthContext.tsx` into its own file (mechanical, import-only change; the full suite must stay green).
3. **Complete `.env.example`** with the missing `AI_PROVIDER` and `PAYROLL_OVERTIME_MULTIPLIER` entries (verified absent) and a production-notes comment block.
4. **P0 bug fixes only** if the regression pass finds any — each reported in the sprint review before fixing. Anything short of P0 is recorded in Known Limitations instead of being changed.

## Sprint Scope — The Eleven Required Workstreams

| # | Workstream | Deliverable |
| --- | --- | --- |
| 1 | Full regression validation | All four automated commands green + `docs/QA_CHECKLIST.md` executed (on MySQL if CQ1 lands; recorded as documented-but-blocked otherwise) |
| 2 | Route and feature inventory | `docs/ROUTES.md` — every route (method, path, roles, sprint) + PRD §7 module-to-sprint feature table |
| 3 | Known limitations | Handoff-facing consolidated list in `README.md` (sourced from SETUP.md's deferred items + accepted risks) |
| 4 | Manual test checklist | `docs/QA_CHECKLIST.md` — single ordered end-to-end pass assembled from the nine per-module manual sections in SETUP.md |
| 5 | Seed/demo data checklist | `DemoDataSeeder` (CQ2) + a checklist in `docs/DEMO.md` of exactly what it creates and the demo credentials |
| 6 | Docker/MySQL validation plan | Runbook: compose up → migrate → seed → demo seed → smoke checks → full QA checklist; executed if CQ1 permits |
| 7 | Security review | Consolidated CLAUDE.md security-checklist pass with findings table in the sprint review; rate limiting added per CQ4 |
| 8 | Documentation cleanup | Stale-reference sweep of `docs/` (SETUP accuracy pass, cross-references), `.env.example` completion |
| 9 | README/setup review | Refreshed root `README.md`; SETUP.md verified command-by-command |
| 10 | Final demo script | `docs/DEMO.md` — timed, role-by-role walkthrough with talking points per module |
| 11 | Final deliverables checklist | PRD §8 ledger in the sprint review: each deliverable → status → location → gaps (with owner for user-action gaps, e.g., GitHub remote publication) |

## Current Architecture This Sprint Builds On

- 14 checkpoint commits (Sprints 0-13), clean working tree; 171 backend / 161 frontend tests all green; one known lint warning.
- `docker-compose.yml` + `docker/` configs from Sprint 0 (app, nginx, MySQL, Redis) — never executed; `DatabaseSeeder` creates the single bootstrap admin (`admin@timeforge.test`).
- All factories needed by the demo seeder already exist (users, departments, clients, projects, time entries, timesheets, KPIs, assignments, scrums, attachments).
- Laravel 13 registers no throttle middleware anywhere today (verified) — the CQ4 rate-limiting addition is bootstrap/route-level configuration plus tests, no schema or dependency changes.
- `AuthContext.tsx` exports both the provider component and the `useAuth` hook — the source of the last lint warning.

## Confirmed Implementation Decisions

Approved as part of the Sprint 14 plan approval; the four Clarification Question resolutions above are the decisions recorded in `docs/DECISIONS.md`, and the details below implement them:

1. **Deployment readiness =** local Docker stack validated (or its runbook documented if CQ1's install doesn't land) **plus** a production-notes section in the README: `APP_DEBUG=false`, `APP_KEY`, HTTPS/Sanctum domain configuration, persisting `storage/app` (attachments live there), the malware-scanning revisit (Sprint 13 decision), Horizon/queue notes for when async features arrive, and mail configuration for password resets. Actual deployment stays out of scope — the target is still an open decision.
2. **Rate limiting specifics (per CQ4):** named limiters — `auth` (5/minute per email+IP) on the three public auth endpoints, `api` (60/minute per user/IP) on the authenticated group; 429 responses verified by new feature tests; limits relaxed under the testing environment so the existing 171-test suite is unaffected.
3. **Demo credentials** follow the existing seeder convention (`*@timeforge.test` / `password`), listed in `docs/DEMO.md`, explicitly dev-only.
4. **No migrations, no new composer/npm dependencies, no API surface changes** (rate limiting adds middleware, not endpoints). The only product-code diffs are the four CQ4 items plus the seeder.
5. **Sprint files 00-13 are historical records** — cleanup never rewrites them; corrections land in README/SETUP/limitations instead.
6. **The regression baseline** is recorded in the sprint review as exact numbers (tests, assertions, warnings) so the handoff states precisely what "green" meant on handoff day.

## Explicitly Out Of Scope This Sprint

- Any new business feature, endpoint, migration, or dependency.
- Actual production deployment, CI/CD pipelines, cloud storage — deployment target is still an open decision in `docs/DECISIONS.md`.
- Real AI provider integration and external data privacy rules (the last open decision; stub remains).
- Malware scanning implementation (Sprint 13 accepted risk — restated in production notes, not built).
- Email notifications, queued exports, Horizon startup — deferred features stay deferred; they are documented, not built.
- Rewriting historical sprint documents; redesigning UI; performance optimization beyond the review's findings report.

## Backend Backlog

- `DemoDataSeeder` (CQ2) with the CQ2 dataset, excluded from the default seeder; documented invocation (`php artisan db:seed --class=DemoDataSeeder`).
- Rate limiting (CQ4-1): limiter definitions, middleware on the auth endpoints and authenticated group, feature tests for 429 behavior and for normal operation staying unthrottled.
- `.env.example` completion (CQ4-3).
- Consolidated security review over the finished system (report, not code, unless P0): authorization matrix spot-audit against `docs/ROUTES.md`, mass-assignment audit of all `$fillable` models, sensitive-field exposure audit (password hashes, `hourly_rate`, attachment paths) across every response, SQL-injection surface check (Eloquent/bound queries), XSS posture (React escaping, no `dangerouslySetInnerHTML`), CSRF posture (token auth, no cookies), file-upload controls recap, CORS/Sanctum config review.
- Performance review report: N+1 spot-checks on the heaviest endpoints (dashboard, team timesheets, payroll), index sanity vs. `docs/DATABASE.md`, bundle-size note (the known >500 kB chunk warning from recharts).
- Docker/MySQL runbook execution if CQ1 lands: `docker compose up -d --build`, `composer install`, `key:generate`, `migrate`, both seeders, smoke checks (login, one write per module), then the full `docs/QA_CHECKLIST.md` pass on MySQL.

## Frontend Backlog

- Extract `useAuth` to `src/context/useAuth.ts` (CQ4-2); imports updated project-wide; suite stays green; lint reaches zero warnings.
- No other product-code changes. (All other frontend work this sprint is verification and documentation.)

## Documentation Backlog

- `README.md` refresh: what All in Time is, stack, screenshots-optional, quickstart (Option A/B), demo credentials pointer, Known Limitations, production notes, doc index.
- `docs/ROUTES.md`, `docs/DATABASE.md`, `docs/QA_CHECKLIST.md`, `docs/DEMO.md`, `docs/USER_GUIDE.md` per CQ3.
- `docs/SETUP.md` accuracy pass (every command re-verified; stale statements corrected).
- Final deliverables ledger (PRD §8) in the sprint review, including user-action items (e.g., pushing the local repository to GitHub — the repo currently exists locally only).

## Acceptance Criteria

Sprint 14 is complete when:

- All four automated validation commands pass, with **zero** lint warnings, and the exact regression baseline is recorded.
- Rate limiting exists and is test-verified on auth endpoints and the API group (CQ4), with the full pre-existing suite still green.
- `DemoDataSeeder` populates every module's screens with coherent demo data in one command, and `docs/DEMO.md` walks a complete role-by-role demo against it.
- All six documentation artifacts (README + five docs) exist, are accurate against the running code, and `.env.example` is complete.
- The security and performance reviews are reported in the sprint review with a findings table (severity, disposition: fixed-as-P0 / accepted / deferred-with-pointer).
- The Docker/MySQL validation has either **run green end-to-end** (CQ1 installed) or ships as a verified-syntax, step-by-step runbook with the gap recorded as the single remaining known limitation.
- The PRD §8 deliverables ledger shows every deliverable's status with no unexplained gaps.

## Deliverables

- Code: `DemoDataSeeder`, rate limiting + tests, `useAuth` extraction, `.env.example` completion. Nothing else.
- Docs: refreshed `README.md`; new `docs/ROUTES.md`, `docs/DATABASE.md`, `docs/QA_CHECKLIST.md`, `docs/DEMO.md`, `docs/USER_GUIDE.md`; corrected `docs/SETUP.md`.
- This file (`sprints/SPRINT_14.md`); `docs/DECISIONS.md` already updated at plan approval; the final PASS/FAIL review containing the security/performance findings tables, the regression baseline, and the deliverables ledger.

## Implementation Order

1. Hardening first (CQ4): rate limiting + tests → `useAuth` extraction → `.env.example` → full automated validation (must be green with zero warnings before anything else proceeds).
2. `DemoDataSeeder` + verification that every page renders meaningful data with it.
3. Inventory and documentation: `docs/ROUTES.md` → `docs/DATABASE.md` → `docs/QA_CHECKLIST.md` → `docs/USER_GUIDE.md` → `docs/DEMO.md` → README refresh → SETUP accuracy pass.
4. Consolidated security + performance review (findings table).
5. Docker/MySQL validation (if CQ1 lands) → execute `docs/QA_CHECKLIST.md` end-to-end on MySQL with the demo dataset.
6. Final deliverables ledger → PASS or FAIL Sprint 14 review.

## Dependencies

- CQ1: Docker Desktop installation is a user action; everything else in the sprint proceeds regardless.
- No other new dependencies of any kind.

## Risks

- **Docker Desktop may not land during the sprint** — mitigated by making the runbook itself a deliverable and scoping the PASS accordingly (CQ1). This would leave MySQL E2E as the one explicitly-recorded gap at handoff.
- **Rate limiting is the sprint's only behavior-adjacent change**; wrongly tuned limits could break legitimate flows or the test suite — mitigated by named limiters, generous authenticated limits, testing-environment relaxation, and dedicated tests.
- Demo credentials are intentionally weak and documented — safe only because the system is dev-local; the README/production notes say exactly that.
- The regression pass may surface latent bugs; the P0-only fix rule (CQ4-4) keeps the sprint from becoming an unbounded bug-fixing sprint — everything else lands in Known Limitations with severity noted.
- Documentation can drift from code the moment it's written; each doc states its as-of sprint and the ledger records the baseline commit.

## Validation Checklist

- Confirm zero new endpoints, migrations, or dependencies in the diff; product-code changes limited to the four CQ4 items + seeder.
- Confirm 429s from the auth limiter and normal-use headroom on the API limiter, test-verified; confirm the pre-existing 171/161 tests still pass unmodified.
- Confirm lint reports zero warnings after the `useAuth` extraction.
- Confirm `DemoDataSeeder` is not part of the default seed and its data renders on every page (dashboard, payroll, AI tabs, attachments upload live).
- Confirm every route in `api.php` appears in `docs/ROUTES.md` with correct role annotations (spot-audited against tests).
- Confirm every documented command in README/SETUP actually runs on this machine.
- Confirm the security findings table covers every CLAUDE.md security item with a disposition.
- Confirm no secrets committed; demo credentials clearly marked dev-only.

## Manual Testing Plan

The manual plan for this sprint **is** `docs/QA_CHECKLIST.md` — the consolidated, ordered pass over all nine module walkthroughs (auth/admin, time tracking, timesheets/approval, KPIs, daily scrum, payroll, reports/exports, dashboard, AI insights, attachments), executed with the demo dataset, on MySQL if CQ1 lands (otherwise recorded as documented-but-blocked, per every prior sprint's precedent). Plus, demo-specific: run `docs/DEMO.md` start-to-finish once, timed, as a dress rehearsal.

## Automated Testing Plan

```bash
cd backend
php artisan test

cd ../frontend
npm run build
npm run lint   # zero warnings expected after this sprint
npm run test
```

## Definition Of Done

- All Acceptance Criteria met.
- All automated validation commands pass with the recorded baseline.
- The sprint review contains: regression baseline, security findings table, performance findings table, Docker/MySQL outcome (executed vs. documented-blocked), and the PRD §8 deliverables ledger — PASS or FAIL.
- No business behavior changed anywhere (beyond approved hardening).
- Clarification Questions 1-4 are already answered and recorded in `docs/DECISIONS.md` — done at plan approval, before implementation begins.

## Code Generation Prompt

Use this only after Sprint 14 is approved:

```text
Implement Sprint 14 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/DECISIONS.md
- docs/QUESTIONS.md
- sprints/SPRINT_00.md through sprints/SPRINT_14.md

Objective:
Final QA, documentation, demo readiness, and deployment readiness for
the feature-complete MVP. Verify, harden (approved budget only), seed
demo data, document, and produce the handoff artifacts.

Constraints:
- No new business features, endpoints, migrations, or dependencies.
- Product-code changes limited to: rate limiting (+tests), useAuth
  extraction, .env.example completion, DemoDataSeeder, P0 fixes only
  (each reported first).
- The pre-existing test suites must remain green throughout; lint must
  end at zero warnings.
- Historical sprint files are never rewritten.
- Docker/MySQL validation executes only if Docker Desktop is installed;
  otherwise the runbook ships as a deliverable and the gap is recorded.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Rate limiting + tests, DemoDataSeeder, useAuth extraction,
  .env.example (code)
- README refresh + docs/ROUTES.md, DATABASE.md, QA_CHECKLIST.md,
  DEMO.md, USER_GUIDE.md + SETUP accuracy pass (docs)
- Security + performance findings tables, regression baseline,
  deliverables ledger, and a PASS or FAIL Sprint 14 review
```

## Validation Prompt

```text
Validate Sprint 14.

Inspect:
- Correctness against CLAUDE.md, docs/DECISIONS.md, and the approved
  CQ1-CQ4 answers in sprints/SPRINT_14.md
- Whether the diff contains zero new endpoints/migrations/dependencies
  and only the approved product-code changes
- Whether rate limiting is enforced and test-verified without breaking
  the pre-existing suites, and lint reports zero warnings
- Whether the demo seeder renders data on every screen and is excluded
  from default seeding
- Whether every route appears in docs/ROUTES.md with correct roles, and
  every documented command actually runs
- Whether the security findings table covers every CLAUDE.md item with
  an explicit disposition
- Whether the Docker/MySQL validation ran (and passed) or is shipped as
  a runbook with the gap recorded
- Whether the PRD §8 deliverables ledger is complete and honest
- Build/test readiness (backend and frontend, including Vitest)

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Give final approval ("approved", "proceed", or "implement") to begin Sprint 14 implementation.
