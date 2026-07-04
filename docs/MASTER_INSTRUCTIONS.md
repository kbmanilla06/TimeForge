# Master Instructions For TimeForge

This file mirrors the operating rules in `CLAUDE.md` and exists as a human-readable reference for project governance.

## Project Name

TimeForge

## Project Type

Enterprise SaaS web application.

## Working Style

The project must be built sprint by sprint using professional software engineering practices.

Claude Code must:

- Read `CLAUDE.md`.
- Read `docs/PRD.md`.
- Read `docs/DECISIONS.md`.
- Read the current sprint file.
- Ask questions before assuming requirements.
- Wait for approval before implementing each sprint.
- Validate after every meaningful implementation step.

## Locked Stack

Backend:

- Laravel
- PHP
- PostgreSQL (Supabase-hosted in production; self-hosted via Docker locally — explicitly authorized override of the original MySQL decision, Sprint 39)
- Laravel Sanctum
- Laravel Queues
- Horizon

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

Tooling:

- Docker
- Git
- GitHub
- Postman
- PHPUnit
- Pest, if applicable

## Project Control Files

- `CLAUDE.md`: persistent Claude Code instructions.
- `docs/PRD.md`: single source of truth from the project brief.
- `docs/QUESTIONS.md`: unresolved clarification questions.
- `docs/DECISIONS.md`: approved decisions.
- `sprints/SPRINT_00.md`: Sprint 0 plan.
- `prompts/`: reusable prompts for operating Claude Code safely.

## Anti-Hallucination Rules

Never invent:

- APIs
- Database tables
- Fields
- Business rules
- Workflows
- Permissions
- User roles
- AI behavior
- Payroll formulas

If unsure, ask.

