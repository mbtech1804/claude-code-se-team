# Project: {{PROJECT_NAME}}

> Auto-memory: persists across `/clear` AND across conversations. Keep it a short,
> current snapshot — not a log. No secrets / tokens / PII.

## What it is

{{PROJECT_DESCRIPTION}}

- **Primary language:** {{PRIMARY_LANGUAGE}}
- **OS / environment:** {{OS}}
- **Tech stack:** not yet decided (Phase 0 Intake).

## Current state

Scaffolded by `/new-code-project-setup`. Universal agent framework in place. Awaiting the
Phase 0 stack decision before any feature work begins.

## Phase overview

- **Phase 0 — Intake (current):** decide stack, write ADR-0001, complete CLAUDE.md, activate
  leads.
- _Later phases added once the stack and roadmap are known._

## How to work here

- State lives in `/state/`. Read STATUS + BLOCKERS at session start.
- `/end-session` before every `/clear`. `/checkpoint` mid-session.
- See `CLAUDE.md` for the full conventions and `~/.claude/agent-knowledge/` for cross-project
  agent know-how.
