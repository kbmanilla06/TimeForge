# TimeForge Claude Code Kit

This kit contains the files needed to run the TimeForge project safely in Claude Code.

## What To Do First

Open Mac Terminal:

```bash
cd ~/Desktop/TIMEFORGE
claude
```

Then paste the prompt from:

```text
prompts/00_START_HERE.md
```

## File Guide

- `CLAUDE.md`: persistent instructions Claude Code reads automatically.
- `docs/MASTER_INSTRUCTIONS.md`: human-readable project rules.
- `docs/PRD.md`: TimeForge requirements from the project brief.
- `docs/QUESTIONS.md`: questions that must be answered before implementation.
- `docs/DECISIONS.md`: approved decisions.
- `sprints/SPRINT_00.md`: Sprint 0 plan.
- `prompts/`: prompts to paste into Claude Code in order.
- `docs/SETUP.md`: local development environment setup and validation commands.
- `backend/`: Laravel application (scaffolded in Sprint 0).
- `frontend/`: React + TypeScript + Vite application (scaffolded in Sprint 0).
- `docker-compose.yml` and `docker/`: local Docker environment (not yet installed/validated — see `docs/SETUP.md`).

## Recommended Order

1. Paste `prompts/00_START_HERE.md`.
2. Paste `prompts/01_REVIEW_PRD.md`.
3. Answer the questions in `docs/QUESTIONS.md`.
4. Paste `prompts/02_RECORD_DECISIONS.md`.
5. Paste `prompts/03_PLAN_SPRINT_00.md`.
6. Review `sprints/SPRINT_00.md`.
7. If correct, paste `prompts/04_IMPLEMENT_APPROVED_SPRINT.md`.
8. Paste `prompts/05_VALIDATE_SPRINT.md`.
9. Continue with `prompts/06_PLAN_NEXT_SPRINT.md`.

## Intern Rule

Do not ask Claude Code to build the whole project in one request.

Always work one approved sprint at a time.

