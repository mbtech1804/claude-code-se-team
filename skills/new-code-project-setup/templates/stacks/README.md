# Stack templates

This folder is intentionally (almost) empty at the start.

`/new-code-project-setup` is **stack-agnostic** — it never picks a tech stack. The stack is
decided per project in Phase 0 Intake. As real projects choose stacks, distill the
**reusable** parts of each stack here so the next project of the same shape starts faster.

## What a stack template should contain

When you add one (e.g. `expo-nestjs-postgres/`), keep it to the genuinely reusable bits:

- A CLAUDE.md fragment for the "Tech stack" and "Folder layout" sections.
- Stack-specific `.gitignore` additions.
- Stack-specific `settings.json` hooks (formatter, test runners) using the right shell.
- A list of leads/subagents the stack typically activates.
- Stack-specific code rules and known gotchas (cross-reference `agent-knowledge/`).
- Optional: start/stop dev-environment skill templates.

## How it gets populated

Through `/capture-learning` after finishing real projects — that's where stack-specific
knowledge is distilled. Don't pre-invent stack templates for stacks you haven't built.

## Current templates

_(none yet — the Buli project's Expo + NestJS + Postgres learnings live as notes in
`agent-knowledge/projects/buli-app.md` until a second project justifies extracting a real
stack template here.)_
