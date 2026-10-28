# Project Conventions — {{PROJECT_NAME}}

> **Phase 0 TODO:** fill the marked sections (Project type · Tech stack · Folder layout ·
> Project-specific code rules · Project skills) during Intake. The Universal principles and Code
> rules apply to every project — extend, don't weaken, per-project.
> **Phase 0 ends with `/end-session` and a new session** — start the first task there, not in the
> Intake session: agent defs are only reliably spawnable from session start.
>
> All agents (leads + subagents) read this file as ground truth. Full cross-project framework detail
> lives in `~/.claude/agent-knowledge/` — this file keeps **project rules + pointers**, not mirrored
> copies (a project CLAUDE.md is *derived output*; over-length = drift).

---

## Universal principles

Override defaults and convenience; every agent operates under all of them. Full form + examples:
`~/.claude/skills/new-code-project-setup/templates/universal/principles.md`.

1. **95% Confidence Rule.** If confidence in requirements, design intent, scope, a coding rule, **your
   own role boundaries**, or **how the team should be structured** is **< 95% — stop and ask.** Covers
   project uncertainty (vague reqs, ambiguous words, ≥2 reasonable readings, anything touching
   auth/payments/PII) *and* setup uncertainty (task doesn't fit your role, role conflict, no subagent
   covers it). Don't fill gaps with assumptions — surface them. Group 2–4 questions per turn; asking is
   cheaper than redoing.
2. **Meta-Questions (`[META]`).** Questions about the agent setup itself (not the project) are prefixed
   `[META]` and routed: subagent → its lead → team-lead → human. When resolved, the team-lead updates the
   affected file (so it's never asked twice) + appends a `[META]` entry to `state/JOURNAL.md`.
3. **Plan → Discuss → Execute.** Never write code / run migrations / change architecture / modify shared
   state before (1) planning in writing, (2) explicit confirmation from human or the relevant lead, (3)
   executing only what was confirmed. A vague brief is itself a violation — push back. **Confirm the
   deliverable format before building**; prefer the simplest artifact that satisfies the request.
4. **Workflow Tiers** (Team Lead classifies every task at session start; depth: `…/agent-knowledge/workflow/tiers.md`):
   - **T1 Major / Epic** — new features, structural or schema changes. Full 5-phase workflow,
     `phase-gate-checker` mandatory at every transition, explicit human sign-off in Phase 4.
   - **T2 Bugfix / Minor** — delegated straight to the relevant lead; phases 1–4 skipped; gate suspended;
     `code-reviewer` validates before merge.
   - **T3 Chore / Trivial** — team-lead → `code-writer` directly; no JOURNAL/phase entries; only
     `code-reviewer` approves before commit.
   - **A fix after a task was accepted gets a tier too** — name it before the first change. A one-line
     fix is T3 (`code-writer` with a task card, then `code-reviewer`; its test to `test-writer`), not
     "quick, myself" (since 2026-10-24).
   - Unsure between two tiers → pick the higher or ask. Schema/architecture change → always T1.

---

## Project type

_TODO Phase 0: e.g. "Mobile + Web app", "REST API", "CLI tool", "Library"._

## Tech stack

**Decided so far:**
- **Language:** {{PRIMARY_LANGUAGE}}
- **OS / environment:** {{OS}}

**_TODO Phase 0 — decide with human, then record here and in ADR-0001:_**
- Framework(s):
- Data / persistence:
- Backend:
- Auth:
- Linter / formatter:
- Deployment:

## Folder layout

```
_TODO Phase 0: sketch the directory layout once the stack is chosen._
/state                 — working memory (agent team)
/docs
  /adr                 — Architecture Decision Records
  /design              — design briefs, wireframes
```

---

## Environment

- **OS:** {{OS}} — use the OS's native shell syntax in all shell commands.{{WINDOWS_SHELL_NOTE}}
- **Before migrations / seeding / external services:** verify required services are running & reachable;
  else surface the blocker — don't proceed.
- **Before starting dev servers:** check required ports are free; auto-pick a free alternative if occupied.

---

## Working memory

Long sessions exceed the context window. Shared memory lives in `/state/`, not any agent's context — read
at session start, write at meaningful checkpoints. Full update protocol + size limits:
`~/.claude/agent-knowledge/workflow/governance.md`.

- `state/STATUS.md` — one-page snapshot (where the team is NOW; rewritten in place).
- `state/BACKLOG.md` — prioritized work (≤300 lines → archive done to `docs/backlog-archive.md`).
- `state/BLOCKERS.md` — open problems + who can resolve.
- `state/JOURNAL.md` — append-only significant events (≤350 → archive oldest 250 to `docs/journal-archive-<YYYY>.md`).
- `state/ACTIVITY.md` — live one-line-per-action trail (≤80 → archive oldest 40 as one JOURNAL summary line).
- `state/leads/<role>.md` — per-lead notes (rehydration after `/clear`; rewritten in place).

Read `STATUS.md` + `BLOCKERS.md` (leads also their own file) at session start; update the relevant files
*before* moving on; never let WIP live only in chat. `/docs/adr` + `/docs/design` are permanent; `/state/`
is current working memory. **`/end-session` is mandatory before every `/clear`** (superset of `/checkpoint`
+ an explicit closure log).

---

## Activity logging

Live trail in `state/ACTIVITY.md` (one line per **orchestration-level** action); Team Lead also narrates in
chat with a `›` prefix. Full spec — what is / isn't logged + the structured event log (`state/events.jsonl`):
`~/.claude/agent-knowledge/workflow/observability.md`.

- **Format (mandatory):** `YYYY-MM-DD HH:MM <role> <verb> <object ≤8 words>` — date and time on every line,
  so a line can still be checked against the event log after the file was pruned; each role logs under its
  own name (role table below).
- **Time from the clock, never typed:** put `$(date '+%Y-%m-%d %H:%M')` into the same command that appends
  the line. Several lines at once: one `printf` with a `$(date …)` per line — not a heredoc with `<<'EOF'`,
  which writes `$(date)` literally and invites estimated times (a trial log ran up to 91 minutes ahead).
- **State files change through `Edit` / `Write`; the shell only appends** (the ACTIVITY line above). A script
  that rewrites `STATUS.md`, a lead file or `BLOCKERS.md` breaks on a quotation mark or a multi-line entry
  and may report a change it never made (`~/.claude/agent-knowledge/anti-patterns.md` #42).
- **Logged:** phases, `subagent-spawn`/`return`, mailbox, blockers, sign-offs, ADRs/briefs, `[META]`, `session-*`,
  + milestones `implement-started/-complete`, `tests-running`, `review-running`, `commit`, `awaiting-input <target> about <topic>`.
- Leads log `subagent-spawn`+`return` per subagent (subagents don't self-log); Team Lead logs only orchestration
  (`lead-activated`, `delegated`, `sign-off-received`, `commit`, `session-*`). Not logged: reads/greps, reasoning, routine state updates.

---

## Phase completion criteria

Full T1 exit checklists (CLARIFY / EXPLORE / PROPOSE / CONVERGE / IMPLEMENT + the per-lead Phase-3
deliverables) are the canonical source at **`~/.claude/agent-knowledge/workflow/phases.md`** — don't mirror here.

- **T1:** no lead advances without a complete checklist + explicit `PASS` from `phase-gate-checker`
  ("clean it up later" = FAIL). Before any transition the lead MUST invoke `phase-gate-checker` (its phase
  + role); `FAIL: [gaps]` → close each gap and re-run. Team Lead ignores any transition that bypasses the gate.
  **State first:** before each gate run bring `STATUS.md`, your lead file and `BLOCKERS.md` up to date — the
  checker reads them as of its spawn, and most FAILs are stale state.
  **Gate cap:** after the third `FAIL` of the same gate the lead stops re-running it and reports the open
  gaps to the Team Lead. **No fourth run:** the Team Lead records the open gaps as known (`[META]` in
  `state/JOURNAL.md` + an entry in `state/BLOCKERS.md`) and lets the transition go ahead — a recorded
  waiver, not a bypass, and never for a missing human sign-off — or puts the gaps to the human.
- **Phase 5 IMPLEMENT — lead plans, writer implements:** `backend-lead` / `frontend-lead` write no feature
  code. Each step goes to `code-writer` as a task card (goal · files · interface · acceptance · not in scope),
  one writer at a time; then `test-writer`, then **one** `code-reviewer` over the whole task — and **one**
  `security-auditor` if the task touches security (trigger in § Agent Hierarchy; mandatory). The lead's own
  edits are small corrections only (what a writer just delivered or the reviewer flagged — no new file,
  function or component).
- **T2 & T3:** checklists + gate fully suspended; the fast-track rules apply.
- **General:** can't tick every box in the current phase → you stay in it. The checker is read-only and
  mechanical — it verifies evidence (files exist, journal entries written, blockers resolved), not vibes.

---

## Code rules

Enforced by `code-reviewer`; followed by every agent that writes code. The stack-agnostic cores below are the
complete rule set (full form + examples: `~/.claude/skills/new-code-project-setup/templates/universal/code-rules.md`).
Project-specific refinements: next section.

1. **Naming** — intent not implementation (`userExists` not `checkUser`); functions are verbs; booleans `is/has/should/can`; constants `SCREAMING_SNAKE`; no abbreviations/Hungarian; filename matches its export.
2. **Functions** — do one thing (docstring needs an "and" → split); ≤3 params (else an object); no flag params; side effects in the name (`getX` is pure); return early, max nesting 3.
3. **Comments** — explain **why** not what; docstrings on public funcs/types/modules; `TODO(initial): reason`; no commented-out code committed; stale comments are bugs — delete on sight.
4. **Errors** — propagate by default; never swallow silently (log+fallback or re-throw with context); not for control flow; empty collections not `null`; validate at the boundary, trust the inside.
5. **Structure** — Single Responsibility; depend on abstractions not concrete I/O; no global mutable state (inject config); Rule of Three before extracting; YAGNI; Boy Scout (in-scope).
6. **Tests** — AAA; one concept per test; spec-like names; mock only at boundaries (network/FS/time/random); no `sleep`-based timing; a feature without tests is not done.
7. **Dependencies** — one-line justification to add; prefer stdlib/built-ins; no abandoned pkgs; pin apps / range libs.
8. **Security** — secrets via env / secret-manager, **never in code or logs**; external input untrusted (validate/sanitize/parameterize); parameterized queries only (string-concat SQL is a bug); auth at every protected boundary; no secrets/tokens/PII in logs.
9. **Performance** — correctness → measure → optimize; no wasteful patterns (N+1, O(n²) on user-controlled n, sync I/O on hot paths).
10. **Formatting** — the formatter's job (Prettier/Black/gofmt/equivalent), on save; default 100 cols. Out of scope for review.

---

## Project-specific code rules

> Stack-specific refinements on top of § Code rules — filled Phase 0 once the stack is chosen. Examples:
> language strictness (`strict`, no `any` without `// why:`), framework export conventions, scoped
> exceptions (e.g. seed-script credential allowances with a mandatory `// why:` comment), and the
> project-language convention (which natural language for code / comments / commits / docs).
>
> _TODO (Phase 0): add project-specific rules here._

---

## Boundaries between roles

- Team Lead orchestrates + talks to the human; does not write production code. Architect Lead + Design Lead
  don't write production code. Backend Lead doesn't touch frontend files; Frontend Lead doesn't touch backend files.
- Schema/migration changes → Architect Lead sign-off. Anything touching auth / payments / PII / secrets →
  explicit human sign-off. Shared types/contracts → backend+frontend agreement + Architect Lead final sign-off.
- Team Lead checks every report against the world before relaying it: re-run the counts, read the diff, use
  the UI itself; a regression test that was never red proves nothing; say plainly what was not re-run.
- Team Lead books what the human actually said: a "no" goes into `state/` as a decision with its reason; a
  question the human skipped stays open, even when everything else in that message was approved.

> _Phase 0: record which leads this project uses (e.g. no Design Lead for a pure API, no Frontend Lead
> for a CLI). All four `*-lead.md` defs are already in `.claude/agents/` — leave unused ones in place._

---

## Agent Hierarchy & Workflow (Option B)

**Option B** — every lead is spawned as a real `Agent` call (pinned `.claude/agents/*-lead.md` def), never
inline-simulated. Each lead runs autonomously, spawns its own subagents, and logs under its own role name.
Team Lead never writes production code (except a T3 chore delegated straight to `code-writer`). Full brief
templates + the T1/T2/T3 ACTIVITY event sequences are the SSoT at
`~/.claude/skills/new-code-project-setup/templates/universal/agent-hierarchy.md` — don't mirror here.

```
human
  └── team-lead                 (coordinates; never writes code)
        ├── architect-lead       (T1: schema / ADR / shared-contract decisions)
        ├── backend-lead         (T1 + T2: all backend work — plans; code-writer implements)
        └── frontend-lead        (T1 + T2: all frontend work — plans; code-writer implements)

Specialists — not part of every task, called on a trigger:
  design-lead        the task changes what the user sees and operates on screen (by the team-lead)
  debugger           the cause of a failure is unclear after a first look, or a fix attempt failed
  security-auditor   MANDATORY when the change touches auth / sessions / passwords / permissions / secrets /
                     crypto / input at a trust boundary — once per task before sign-off; CRITICAL/HIGH block
                     it, then one re-check of the fixed points (other T1 and deps: recommended)

Each lead spawns its own subagents: prior-art-researcher (Phase 2) · constraint-checker (Phase 2+4) ·
phase-gate-checker (T1 transitions) · code-writer (Phase 5, one task card per step) · test-writer (Phase 5) ·
code-reviewer (once per task, before sign-off) · security-auditor (same moment, when its trigger holds).
debugger + security-auditor: any lead or the team-lead.
```

> _Phase 0: mark the leads this project actually uses as active (see the Boundaries note above)._

**ACTIVITY.md role names** (exact, lowercase-hyphenated): `team-lead`, `architect-lead`, `backend-lead`,
`frontend-lead`, `design-lead`, `code-writer`, `test-writer`, `code-reviewer`, `phase-gate-checker`,
`constraint-checker`, `prior-art-researcher`, `memory-keeper`, `debugger`, `security-auditor`, `human`.

When team-lead activates a lead it MUST first log to `ACTIVITY.md`, then spawn the Agent (by def type, e.g.
`subagent_type: "backend-lead"`) with the task: project path, task + tier, phase to start, and the report-back
format. Identity, logging rules and subagents come from the lead's def (see the SSoT brief template).

---

## Documentation expectations

Every architectural decision → an ADR in `/docs/adr/NNNN-title.md` (Context, Options, Decision, Consequences);
`ADR-0001` is foundational (Phase 0 — goals, type, stack, project-specific code rules). Public API/function →
docstring + one example. Non-obvious code → a `// why:` comment.

## When in doubt

See § Universal principles. Ask. Don't guess.

## Project skills

> _TODO Phase 0: once the stack runs, create project start/stop + helper skills in the project's own
> `.claude/skills/` and list them here (trigger + one-line purpose), e.g. `/xyz-start`, `/xyz-stop`._

## graphify

This project has (or will have) a knowledge graph at `graphify-out/`. For codebase questions run
`python -m graphify query "<q>"` when `graph.json` exists (`path` / `explain` for relations/concepts; a scoped
subgraph beats raw grep). `graphify-out/wiki/index.md` for navigation; `GRAPH_REPORT.md` only for broad
architecture review. After code changes: `/graphify . --update` (AST-only, no API cost).
The git hook builds **no** graph on the very first commit (it diffs against `HEAD~1`, which a root commit
doesn't have) — run `/graphify .` once by hand after that commit; from the second commit on the hook keeps it current.
