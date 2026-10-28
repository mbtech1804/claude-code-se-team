---
name: new-code-project-setup
description: "Scaffoldet ein neues Coding-Projekt mit dem universellen Agent-Framework, geseedet aus agent-knowledge/. Stack-agnostisch. Trigger: /new-code-project-setup"
trigger: /new-code-project-setup
---

# /new-code-project-setup

Scaffold a brand-new coding project with the **universal agent framework** distilled from
past projects. The output is a project that is immediately ready to run the team workflow —
**without** any tech-stack decision baked in. The stack is decided afterwards, in Phase 0
Intake, by the human.

> **This skill never picks a tech stack.** It installs the stack-agnostic framework only.
> The generated CLAUDE.md, ADR-0001, gitignore, and settings all carry clearly-marked
> `TODO Phase 0` placeholders for the stack decision.

> **Plan → Discuss → Execute.** This skill *executes* (writes many files, runs git). Confirm
> the intake answers and the target directory with the human before writing anything.

---

## Inputs — the 4-question intake

Ask these up front, grouped (95% rule — batch, don't drip):

1. **Project name** — short, used in headings and the memory file.
2. **Short description** — 1–2 sentences: what it is, for whom.
3. **Primary language** — TypeScript / Python / Go / Rust / … (just the language; the full
   stack comes in Phase 0).
4. **OS / environment** — Windows / macOS / Linux (drives shell-syntax notes).

Also confirm: **target directory** (default: current working directory) and **whether to
`git init`** (default: yes).

If any answer is unclear, ask before proceeding. Do not invent.

---

## Where things come from

- **Templates:** `~/.claude/skills/new-code-project-setup/templates/` (this skill's own dir).
- **Cross-project knowledge:** `~/.claude/agent-knowledge/` — read before generating the
  lead file and CLAUDE.md so the new project starts with everything we already know.

---

## Procedure

### Step 0 — Read the knowledge base (scope-filtered)

Before generating anything, read:
- `~/.claude/agent-knowledge/agents/team-lead.md` (seeds the team-lead lead file)
- `~/.claude/agent-knowledge/anti-patterns.md` (so the scaffold avoids known traps)
- `~/.claude/agent-knowledge/workflow/` (tiers, phases, skills — informs CLAUDE.md)

**Seed only what fits this project.** Each anti-pattern carries a `Scope:` tag. When
seeding the scaffold:
- **Include** every `universal` entry.
- **Include** a `platform:<os>` entry only if it matches the project's OS (from intake Q4).
- **Skip** every `stack:<name>` entry — the stack isn't decided until Phase 0. (Note in
  STATUS that stack-specific lessons exist in the KB and should be pulled in once the Phase
  0 stack decision lands, e.g. `stack:react` for a React frontend,
  `stack:ci-codegen` for a Prisma/protobuf project.)

This is what makes a new project start "experienced" instead of blank — *without*
inheriting another stack's baggage.

### Step 1 — Confirm & prepare the target directory

- Resolve the target directory. Create it if needed.
- Verify it's empty or that scaffolding won't clobber existing files. If files exist, list
  conflicts and ask before overwriting.

### Step 2 — Compute the substitutions

Build the placeholder map from the intake:

| Placeholder | Value |
|---|---|
| `{{PROJECT_NAME}}` | from intake |
| `{{PROJECT_DESCRIPTION}}` | from intake |
| `{{PRIMARY_LANGUAGE}}` | from intake |
| `{{OS}}` | from intake |
| `{{DATE}}` | today's date (`YYYY-MM-DD`) |
| `{{TIME}}` | current `HH:MM` |
| `{{WINDOWS_SHELL_NOTE}}` | If OS = Windows: ` For interactive commands use PowerShell, not Unix/CMD. (settings.json command hooks are the exception — they run in a bash-compatible shell and use bash syntax.)` Else: empty. |

> **Born-diet.** `CLAUDE.template.md` already carries **condensed** Universal-principles, Code-rules
> and Agent-Hierarchy cores inline, each pointing to its canonical full form under
> `templates/universal/{principles,code-rules,agent-hierarchy}.md` (the SSoT — see `agent-knowledge/README`).
> There is **no** `{{UNIVERSAL_*}}` full-inline substitution anymore — a generated CLAUDE.md stays a lean
> "rules + pointers" file (~200 lines), matching the diet the existing projects run. To change a core, edit
> the canonical `templates/universal/` file, never each project's CLAUDE.md.

### Step 3 — Generate the project files

Render each template (substituting placeholders) to its destination in the target project:

| Template | → Destination |
|---|---|
| `templates/CLAUDE.template.md` | `CLAUDE.md` |
| `templates/state/STATUS.template.md` | `state/STATUS.md` |
| `templates/state/BACKLOG.template.md` | `state/BACKLOG.md` |
| `templates/state/BLOCKERS.template.md` | `state/BLOCKERS.md` |
| `templates/state/JOURNAL.template.md` | `state/JOURNAL.md` |
| `templates/state/ACTIVITY.template.md` | `state/ACTIVITY.md` |
| `templates/state/leads/team-lead.template.md` | `state/leads/team-lead.md` |
| `templates/docs/ADR-0001.template.md` | `docs/adr/0001-project-foundation.md` |
| `templates/settings/base.settings.json` | `.claude/settings.json` |
| `templates/gitignore/base.gitignore` | `.gitignore` |
| `templates/memory/project.template.md` | project memory file (see Step 5) |

**Agent definitions.** Copy the **thirteen agent files listed below** **verbatim** (no
substitution) into the project's `.claude/agents/` — the nine worker subagents and the four
domain-lead defs (see the note below for why the leads are copied now, not in Phase 0):

| Template | → Destination |
|---|---|
| `templates/agents/code-writer.md` | `.claude/agents/code-writer.md` |
| `templates/agents/code-reviewer.md` | `.claude/agents/code-reviewer.md` |
| `templates/agents/test-writer.md` | `.claude/agents/test-writer.md` |
| `templates/agents/phase-gate-checker.md` | `.claude/agents/phase-gate-checker.md` |
| `templates/agents/constraint-checker.md` | `.claude/agents/constraint-checker.md` |
| `templates/agents/prior-art-researcher.md` | `.claude/agents/prior-art-researcher.md` |
| `templates/agents/memory-keeper.md` | `.claude/agents/memory-keeper.md` |
| `templates/agents/debugger.md` | `.claude/agents/debugger.md` |
| `templates/agents/security-auditor.md` | `.claude/agents/security-auditor.md` |
| `templates/agents/architect-lead.md` | `.claude/agents/architect-lead.md` |
| `templates/agents/backend-lead.md` | `.claude/agents/backend-lead.md` |
| `templates/agents/frontend-lead.md` | `.claude/agents/frontend-lead.md` |
| `templates/agents/design-lead.md` | `.claude/agents/design-lead.md` |

The first nine are the stack-agnostic worker subagents the roster documents
(`agent-knowledge/agents/subagents.md`). Eight are spawned by the leads / team-lead — the
write→review→test loop, plus `debugger` and `security-auditor` on demand (a failing test, a
high-risk change). The ninth, `memory-keeper`, is a read-only drift-checker spawned by the
session-lifecycle skills (`/start-session`, `/checkpoint`) — scaffolding it from init means
those skills use the real agent instead of their inline fallback. `debugger` and
`security-auditor` are read-only too: they diagnose / audit and hand a fix brief to
`code-writer`, never editing themselves. Each carries its own explicit `tools:` allowlist
(`workflow/governance.md` § Tool least-privilege); do **not** widen them.

Create empty dirs that the layout expects but templates don't fill: `docs/design/`,
`state/leads/` (already created by the lead file).

> **Workers vs. leads.** The nine *worker subagents* and the four *domain-leads*
> (architect/backend/frontend/design — pinned defs, `templates/agents/*-lead.md`, fixed `tools:`
> incl. `Agent`) are **all copied at init**. A def written in the middle of a session is not
> spawnable for minutes (`Agent type '<name>' not found` — see
> `agent-knowledge/agents/team-lead.md`), so the lead defs must already be on disk when Phase 0
> runs instead of being created by it. **Phase 0 only decides which leads are active** and records
> that in the CLAUDE.md roster (a pure API runs without `design-lead`/`frontend-lead`). Unused defs
> stay where they are — projects change. The `team-lead` is the **session
> persona** — its `state/leads/team-lead.md` is created now; it is not a `.claude/agents/` def.
> Per-lead know-how: `~/.claude/agent-knowledge/agents/*-lead.md`; governance in
> `workflow/governance.md` § Real spawns for leads + subagents (no inline roles).

### Step 4 — Tooling setup

- **Git:** if confirmed, `git init` in the target dir (do **not** commit — the first commit
  is the human's decision, per the git convention). The `.gitignore` is already in place.
- **graphify hook:** run `python -m graphify hook install` in the target dir. On Windows use
  the `python -m` form, never the bare `graphify` binary (see
  `agent-knowledge/tooling/graphify.md`).
- **Initial graph (optional):** if the human wants it now, run `/graphify .` and update the
  Knowledge Graph line in STATUS. Otherwise leave it — the STATUS template already says the
  graph is not built yet.

### Step 5 — Project memory

The per-project auto-memory is managed by Claude Code **outside the repo**, keyed by the
project's absolute path — typically `~/.claude/projects/<path-slug>/memory/` with a
`MEMORY.md` index plus one file per topic. The slug derives from the project path, so the
exact dir may not exist until Claude Code first opens the project there.

- If the project's memory dir already exists (or you can determine its path), write the
  rendered `project.template.md` into it as the project memory file and add a line to
  `MEMORY.md` (create the index if absent).
- If the path can't be determined yet (e.g. the project hasn't been opened in Claude Code
  from its final location), **stage** the rendered memory file at `docs/project-memory.md`
  in the repo and tell the human to move it into the project's memory dir on first open.
  Don't guess a slug and write to the wrong place.
- **No secrets / tokens / PII** in memory (CLAUDE.md § Security).

### Step 6 — Register nothing global, verify locally

- This skill does **not** add project-specific skills to `~/.claude/CLAUDE.md`. Start/stop
  and other project skills are created later, once the stack runs, and live in the project's
  own `.claude/skills/`.
- Verify every generated file exists and contains no unresolved `{{PLACEHOLDER}}` markers
  (grep the tree for `{{` — any hit is a bug to fix before finishing).

### Step 7 — Summary & handoff

Print a summary:

```
✅ Project scaffolded: <name>  (<target dir>)

   FRAMEWORK:   CLAUDE.md, state/ (6 files), docs/adr/0001, .claude/settings.json,
                .gitignore, project memory
   AGENTS:      9 worker subagents (code-writer, code-reviewer, test-writer, phase-gate-checker,
                constraint-checker, prior-art-researcher, memory-keeper, debugger, security-auditor)
   LEADS:       team-lead persona; all four lead-defs copied (architect/backend/frontend/design) —
                Phase 0 decides which are active
   TOOLING:     git init <done/skipped>, graphify hook <installed>
   STACK:       NOT decided — Phase 0 Intake is the next step

   NEXT STEP:   Run Phase 0 Intake — decide the tech stack with the human, then:
                 1. fill ADR-0001 (Options/Decision/Consequences)
                 2. complete CLAUDE.md TODO sections (Tech stack, Folder layout,
                    project-specific code rules)
                 3. mark the leads the stack needs as active in the CLAUDE.md roster
                    (the defs are already in .claude/agents/ — leave unused ones in place)
                 4. close Phase 0 with /end-session and start the first task in a NEW
                    session — agent defs are only reliably spawnable from session start
                 5. create project start/stop skills once the stack runs
```

End by explicitly asking the human if they want to start Phase 0 Intake now.

---

## Guardrails

- **Never decide the stack.** If the human gives stack hints during intake, capture them as
  notes in BACKLOG/STATUS for Phase 0 — don't bake them into the framework.
- **Don't commit.** `git init` only; the first commit is the human's call.
- **Don't overwrite silently.** Conflicts → list + ask.
- **No unresolved placeholders.** Grep for `{{` before declaring done.
- **Shell-context discipline.** `settings.json` hook command strings use **bash** (they run
  in Claude Code's bash-based hook runner — Git Bash on Windows). Interactive shell commands
  *you* run during setup use the **OS's native** shell (PowerShell on Windows). Don't
  conflate the two. (See `agent-knowledge/tooling/settings-json.md`.)
