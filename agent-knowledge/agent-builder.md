# Agent Builder — Setup & Behavior

The `/new-agent` skill at `~/.claude/skills/new-agent/SKILL.md`. Guides the user through building a new Claude Code skill (agent) via a 9-question intake, architecture discussion (all builds), template selection, file generation, registration, optional smoke test, and post-build learning loop.

## What it produces

- A `SKILL.md` at `~/.claude/skills/<slug>/SKILL.md`
- A global skill: one line in its category file (`~/.claude/skills-core.md`, `skills-coding.md` or
  `skills-agents.md`, imported by `~/.claude/CLAUDE.md`); a project-local skill needs no registration
- Entry in `~/.claude/skills/REGISTRY.md` under the correct category
- Optionally: smoke test result and post-build knowledge updates

## Template roster

| # | Archetype | Core pattern | Default category |
|---|-----------|-------------|-----------------|
| 1 | Research | Search → extract → synthesize → cited report | research |
| 2 | Code-review | Read → MUST-FIX/SHOULD-FIX/CONSIDER → merge gate | coding |
| 3 | Data-analysis | Read data → compute → visualize → summarize | data |
| 4 | Content | Brief → outline → draft → self-check → deliver | content |
| 5 | Workflow | Map → execute+checkpoints → stop-on-failure → verify | workflow |
| 6 | Domain-expert | Load KB → understand → cite-grounded answer | domain |
| 7 | Config-synthesizer | Scan project → detect stack → generate config/artifact file | coding |

## Architecture types

| Type | Description | Notes |
|------|-------------|-------|
| solo | Standalone, handles everything itself | Default; most agents start here |
| lead | Orchestrates 2–5 subagents | Triggers brainstorming phase; generates lead + subagent SKILL.md files |
| subagent | Specialized, called by a lead | Gets focused input via Agent() prompt; no access to lead's conversation context |
| team | Full scaffold: lead + all subagents in one pass | Naming: `<team>-lead`, `<team>-<role>` |

## Categories

```
coding    — Development, code review, refactoring, testing
research  — Web research, knowledge gathering, reports
content   — Writing, editing, marketing, docs
data      — Data analysis, visualization, ETL
finance   — Accounting, budgets, financial reports
trading   — Market analysis, strategies, signal generation
workflow  — Process automation, pipelines
domain    — Domain expert agents (medicine, law, specific fields)
meta      — Agents that build or manage other agents
```

New categories are created on demand in REGISTRY.md.

## What works well

**Show before write.** Displaying the full generated SKILL.md before writing lets the human catch template mismatches before they land on disk. Never skip this step.

**Collision check before accepting trigger.** Reading the category files and REGISTRY.md for the proposed trigger before accepting it prevents duplicate-trigger bugs before they cause silent skill-loading failures.

**Placeholder scan after generation.** Grepping for `{{` in the rendered output catches unresolved template markers. Any hit is a generation bug — fix before writing.

**Smoke test = actual skill invocation.** Running the new skill with a sample scenario exercises the real procedural instructions. This is more valuable than a programmatic unit test because it tests what Claude will actually do.

**Post-build learning loop.** The question "did you learn something new?" after each build is the mechanism that keeps templates and knowledge current. Without it, the knowledge base stagnates after the initial setup.

**Blueprint before generation for Lead/Team.** For multi-agent architectures, writing out the team blueprint (roles, delegation contract, handshake format) and getting human confirmation before generating any SKILL.md prevents misaligned team structures.

**Scope decided early (Q3).** Asking Global-vs-Project right after the description settles the storage path, registration, and smoke test before generation. A project-local skill lives in `<project>/.claude/skills/<slug>/`; the harness lists it in that project and the Skill tool invokes it there (e.g. a project's `/app-start`), so it needs no registration.

**Architecture is always discussed.** Even Solo/Subagent builds get a one-line rationale check in Step 3 — never silently skipped. This catches the common case where the user picked Solo but the task really wants a Lead.

**`?` for category/tags/tools.** Users often want to delegate these. Accept `?`, infer from the slug + description + chosen template, then confirm inline before adopting — never silently. Tools fall back to a per-template defaults table so the user never has to guess blindly.

**Near-collision check, not just exact-match.** Beyond exact trigger collisions, flag slugs within ~2 characters, slugs sharing the first word, and same verb+domain descriptions. This catches near-duplicates like `github-action-builder` vs `github-actions-builder` before both ship.

**Q5 category is authoritative.** Templates hard-code a `category:` matching their archetype; when the user's Q5 differs, the generated file's `category:` must be overridden to match Q5 (and the REGISTRY.md entry). Otherwise the frontmatter and the registry disagree.

## Failure modes to avoid

**Treat the builder files as one unit.** The builder is 4 tightly-coupled parts that must
stay mutually consistent: `SKILL.md` (questions, steps, substitution map),
`templates/README.md` (placeholder table with Q-numbers), `agent-builder.md` (this KB file:
template roster, checklist, counts), and all template files (`{{PLACEHOLDER}}` syntax). If
an intake question is renamed, moved, or added → synchronize all 4 areas. Renaming a
question is not a "quick edit" — it is a system-wide change. After every build, cross-check
the KB roster and checklist against SKILL.md.
*(Source: Q6→Q7 rename + `{{CATEGORY}}` bug in Agent Builder Test, 2026-06-11.)*

**Register before file exists (Anti-Pattern #2).** Write and verify the SKILL.md first. Append to the category file only after the file passes the placeholder check.

**Wrong registration format.** Match the lines already in the category file — the format is in the skill (`/new-agent` Step 7), not copied here. Each file has one heading with the dispatch sentence and one line per skill; after the files changed to that format, the skill went on writing the older three-line block (heading per skill, path, invocation line) and counting headings for the skill limit for months, until a knowledge-base review found it. A copied format goes stale with the files it describes (`anti-patterns.md` #17). What a wrong format breaks is the slash-command dispatch, not the skill's loading: a session lists its skills from each `SKILL.md`'s frontmatter (`name`, `description`) — the description shown for `/capture-learning` is the frontmatter's word for word, not its category-file line (checked twice).

**Vague Q2 description → vague agent.** A one-word description like "research" produces a skeleton with no useful guidance. Push back for a specific, action-oriented sentence before generating.

**Template 06 with unresolved [TODO].** Domain-expert agents require a real knowledge source in Step 1. The TODO is a prompt to customize, not a functional instruction. Flag this in the smoke test if the TODO is still present.

**Subagent with context assumptions.** Subagents receive a self-contained prompt via `Agent()` — they have no access to the lead's conversation context. Every piece of information a subagent needs must be included in its prompt. Build subagent SKILL.md files with this isolation in mind.

**Lead-only team templates.** A template that ships only the lead's SKILL.md, while its delegation steps call `<slug>-<role>` subagents, produces a lead that calls non-existent subagents and breaks on first run unless the subagent files are generated alongside it (each from template 01, Research). Such a template also implies Team architecture: reconcile Q4 to Team before generating. The registry (Step 8) and skill-count guard (`1 + N`, Step 7) must account for all team members, not just the lead.

**Crowding the global skill list.** The global CLAUDE.md loads every registered skill through its category imports, and a long list both bloats context and gets unwieldy to navigate (the @-import category-router in `workflow/skills.md` was the response to exactly this at ~15 skills). ⚠️ **Unverified:** the "hard 20-skill limit" this wizard enforces is an *observed working ceiling*, not a documented platform limit — treat it as a soft guardrail, verify against current Claude Code docs before citing it as fact. The wizard counts the skill lines in the category files and warns at 19; keep that as a "time to prune / route via category imports" signal rather than a literal cap.

## Context budget guidelines for generated agents

- SKILL.md (system prompt equivalent): keep under ~300 lines
- Knowledge loading (template 06): budget for the KB size explicitly in Step 1
- If the agent will process large inputs (whole codebases, large datasets): add a scope-check step before the main work to prevent silent context overruns
- Subagent prompts: aim for <2000 tokens per delegation call; include only what the subagent needs

## Platform limits

- **Nesting:** a subagent whose def lists `Agent` in `tools:` can spawn its own subagents
  (Claude Code ≥ v2.1.172; depth limit 5 — `workflow/governance.md` § Real spawns for leads +
  subagents). The coding team runs at depth 2 (session → lead → subagent), proven in every trial.
- **Everything else** (context window per model, tools and skills per agent, concurrent
  threads): take it from the current model and Claude Code docs at build time.

## Setup checklist

- [ ] `~/.claude/skills/new-agent/SKILL.md` exists
- [ ] All 8 template files exist in `~/.claude/skills/new-agent/templates/`
- [ ] `~/.claude/skills/REGISTRY.md` exists with category structure
- [ ] `/new-agent` registered in `~/.claude/skills-core.md`
- [ ] `~/.claude/agent-knowledge/agent-builder.md` (this file) exists
