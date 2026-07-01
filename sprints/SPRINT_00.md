# Sprint 0 - Project Foundation And Requirements Hardening

## Sprint Goal

Prepare the TimeForge project for safe implementation by validating requirements, confirming architecture, setting up the repository structure, and establishing development quality gates.

Sprint 0 must not implement full business modules. It exists to create a stable foundation.

## Status

- `docs/PRD.md` is complete and is the source of truth.
- `docs/QUESTIONS.md` sections A-P are answered and locked as approved MVP decisions (see `docs/DECISIONS.md`).
- `docs/QUESTIONS.md` section Q (dashboard role-scoping and refresh behavior), and specific sub-items in sections O (client/project CRUD ownership, lifecycle, cardinality) and P (attachment malware scanning, retention period) remain open. These do not block Sprint 0 — they only block the sprints that implement Dashboards, Client/Project Management, and Attachments respectively.
- Sprint 0 has not yet been implemented. This plan requires explicit approval before any file scaffolding begins.

## Why This Sprint Exists

The project brief defines the vision and major modules. Most detailed business rules have now been resolved and locked in `docs/DECISIONS.md` (roles, payroll formula, approval workflow, time tracking rules, AI approach, attachment rules, etc.). Starting implementation without a stable repository foundation and agreed architecture would still risk inconsistent structure and rework, even though the business-rule ambiguity that originally motivated this sprint has largely been closed.

Sprint 0 creates the foundation needed for future sprints:

- Clean repository structure
- Confirmed development stack
- Environment setup
- Initial architecture plan consistent with approved MVP decisions
- Remaining clarification backlog (Section Q and flagged O/P sub-items)
- Testing and validation workflow
- Documentation baseline

## User Stories

1. As a project owner, I want requirements questions documented so the team does not guess business rules.
2. As a developer, I want a predictable project structure so backend and frontend work can begin safely.
3. As a developer, I want local setup instructions so the project can run consistently.
4. As a technical lead, I want quality gates so future implementation can be validated.
5. As an intern, I want clear setup documentation so I can contribute without confusion.

## Backlog

- Review `docs/PRD.md`. (Done)
- Review and resolve `docs/QUESTIONS.md`. (Done for sections A-P; Q and flagged O/P sub-items remain for their respective future sprints)
- Keep `docs/DECISIONS.md` current as further answers are approved.
- Confirm Laravel and React project structure.
- Confirm Docker strategy for local development.
- Confirm authentication approach using Laravel Sanctum, consistent with the approved single-role-per-user, admin-approval-gated account model.
- Confirm the database will be designed single-company for MVP but avoid decisions that would block adding an `organization_id`-style column later, per the approved multi-tenancy-readiness decision.
- Confirm the four-role model (Employee, Supervisor, HR/Finance, System Administrator) will be represented cleanly (e.g., a `role` column or reference table) without building a permission-matrix engine beyond what MVP requires.
- Create or validate repository folders.
- Create initial backend app scaffold only after approval.
- Create initial frontend app scaffold only after approval.
- Add baseline documentation (setup, environment variables, run commands).
- Define validation commands (backend tests, frontend build/typecheck).

## Acceptance Criteria

Sprint 0 is complete when:

- The project brief has been converted into `docs/PRD.md`. (Done)
- Questions are tracked in `docs/QUESTIONS.md`, with resolved items marked and open items clearly flagged. (Done)
- Approved decisions are recorded in `docs/DECISIONS.md`. (Done)
- The repository structure is agreed.
- The user has approved this Sprint 0 plan before any scaffolding is created.
- The local development environment can be installed, or the blockers are documented.
- Initial backend and frontend scaffolds exist, if approved.
- Validation commands are documented.
- No business modules (time tracking, timesheets, scrum, KPI, payroll, AI, dashboards, admin portal) are implemented in this sprint.

## Deliverables

- Updated `CLAUDE.md`
- Updated `docs/MASTER_INSTRUCTIONS.md`
- Updated `docs/PRD.md`
- Updated `docs/QUESTIONS.md`
- Updated `docs/DECISIONS.md`
- Approved project folder structure
- Initial setup notes
- Baseline validation checklist

## Implementation Order

1. Read `CLAUDE.md`.
2. Read `docs/PRD.md`.
3. Read `docs/QUESTIONS.md` and `docs/DECISIONS.md`.
4. Confirm no open item blocks Sprint 0 scope (Section Q and flagged O/P items are deferred to later sprints, not resolved here).
5. Propose final repository structure.
6. Wait for explicit approval of this Sprint 0 plan.
7. Scaffold backend and frontend only after approval.
8. Add setup and validation documentation.
9. Run validation commands.
10. Produce PASS or FAIL sprint review.

## Proposed Repository Structure

```text
TIMEFORGE/
  CLAUDE.md
  docs/
    MASTER_INSTRUCTIONS.md
    PRD.md
    QUESTIONS.md
    DECISIONS.md
  prompts/
    00_START_HERE.md
    01_REVIEW_PRD.md
    02_PLAN_SPRINT_00.md
    03_IMPLEMENT_APPROVED_SPRINT.md
    04_VALIDATE_SPRINT.md
    05_PLAN_NEXT_SPRINT.md
  sprints/
    SPRINT_00.md
  outputs/
  backend/
  frontend/
  docker/
```

Do not create `backend/`, `frontend/`, or `docker/` until Sprint 0 implementation is approved.

## Dependencies

- Claude Code installed and authenticated.
- PHP and Composer available for Laravel.
- Node.js and package manager available for React/Vite.
- MySQL available locally or through Docker.
- Docker Desktop installed if Docker-based development is approved.

## Risks

- Section Q (dashboard role-scoping and refresh behavior) is still open and must be resolved before the Dashboard sprint.
- Client/project CRUD ownership, project lifecycle status, and project-client cardinality (Section O sub-items) are still open and must be resolved before the Client/Project Management sprint.
- Attachment malware scanning and retention period (Section P sub-items) are still open and must be resolved before file upload handling is implemented.
- AI provider is not yet selected; AI work must stay behind a stub/mock interface until approved, per `docs/DECISIONS.md`.
- Deployment target is not yet finalized, which may affect later Docker/CI/CD decisions.
- Implementation may drift if these remaining open items are guessed at instead of asked about when their sprint is reached.

## Validation Checklist

- Confirm no unapproved business rules were invented.
- Confirm files match the agreed folder structure.
- Confirm remaining open questions (Section Q, flagged O/P items) stay visible in `docs/QUESTIONS.md` and are not silently assumed.
- Confirm all approved answers are recorded in `docs/DECISIONS.md`.
- Confirm generated project scaffolds compile, if created.
- Confirm Laravel install works, if backend scaffold is created.
- Confirm React/Vite install works, if frontend scaffold is created.
- Confirm no secrets are committed.
- Confirm `.env` files are not committed.

## Manual Testing Plan

For Sprint 0, manual testing means validating setup readiness:

1. Open the project in VS Code.
2. Confirm the folder structure is readable.
3. Open `CLAUDE.md` and confirm operating rules are present.
4. Open `docs/PRD.md` and confirm TimeForge requirements are present.
5. Open `docs/QUESTIONS.md` and confirm resolved vs. open items are clearly distinguished.
6. Open `docs/DECISIONS.md` and confirm approved MVP decisions are recorded.
7. If backend is scaffolded, run the Laravel app locally.
8. If frontend is scaffolded, run the Vite app locally.

Expected result:

- Documentation is complete and current.
- Project setup is understandable.
- No business feature is implemented before approval.

## Automated Testing Plan

If implementation scaffolding is approved:

- Run Laravel tests.
- Run frontend type check.
- Run frontend build.
- Run formatting or linting commands if configured.

Suggested commands after scaffolding:

```bash
cd backend
php artisan test

cd ../frontend
npm run build
```

Exact commands may change depending on the scaffolding choices approved during Sprint 0.

## Definition Of Done

Sprint 0 is done when:

- Requirements and questions are documented, with resolved vs. open items clearly marked.
- Approved MVP decisions are documented.
- Folder structure is approved.
- Environment setup is documented.
- Validation commands are identified.
- Any created scaffolds pass basic validation.
- Claude Code returns a PASS sprint review.

## Code Generation Prompt

Use this only after Sprint 0 is approved:

```text
Implement Sprint 0 only.

Read:
- CLAUDE.md
- docs/PRD.md
- docs/QUESTIONS.md
- docs/DECISIONS.md
- sprints/SPRINT_00.md

Objective:
Prepare the TimeForge project foundation without implementing business modules.

Constraints:
- Do not invent business requirements.
- Do not implement time tracking, payroll, KPI, scrum, AI, or dashboards yet.
- Do not change the locked stack.
- Do not resolve the open items in Section Q of docs/QUESTIONS.md, or the flagged sub-items in Sections O and P — those are deferred to their own sprints.
- Before creating or modifying major files, explain the intended changes.

Expected output:
- Confirmed folder structure
- Setup documentation
- Initial backend/frontend scaffold only if approved
- Validation commands
- PASS or FAIL Sprint 0 review
```

## Validation Prompt

```text
Validate Sprint 0.

Inspect:
- Correctness against CLAUDE.md
- Correctness against docs/PRD.md
- Whether unresolved questions (Section Q, flagged O/P items) were respected and left open, not guessed
- Whether any unapproved business features were implemented
- Folder structure consistency
- Security basics
- Build/test readiness

Return PASS or FAIL.

If FAIL, show:
- problem
- severity
- explanation
- recommended fix
```

## Next Recommended Step

Review this refined Sprint 0 plan. If it looks correct, respond with "approved" (or "proceed" / "implement") to begin Sprint 0 implementation — repository structure, environment setup, and scaffolds only, with no business modules.
