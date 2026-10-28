# Agent Knowledge Base

Cross-project, accumulated knowledge about **how to run the agent team** — not about
any single project. This is the institutional memory that survives `/clear`, survives
project boundaries, and gets richer with every project.

> **Final home:** `~/.claude/agent-knowledge/`
> **Read by:**
> - **every project while it works, by path:** `workflow/` and `anti-patterns.md`, through the pointers in
>   its `CLAUDE.md` — a change there acts in all projects at once;
> - **`/new-code-project-setup`** when scaffolding (step 0: `agents/team-lead.md`, `anti-patterns.md`,
>   `workflow/`);
> - **`/capture-learning`** before it writes (this README and the target files).
>
> `tooling/` is read on lookup. No role reads `agents/`, `projects/` or `archive/` while working
> (counted over the trial transcripts and the active projects).
> **Written by:** `/capture-learning` (after a session/project yields a reusable insight)

## What lives here

| Path | Contains |
|---|---|
| `agents/` | Why each lead and the subagents are set up as they are, lessons and failure modes. The rules themselves are in the defs (`new-code-project-setup/templates/agents/`) and `agent-hierarchy.md`. |
| `workflow/` | Tiers, phases, skills, governance (profiles + agent-selection) — how the *process* works and what we learned tuning it. |
| `tooling/` | Concrete tool and stack quirks, one file per tool or stack, and OS-specific gotchas. |
| `anti-patterns.md` | Things that bit us. What went wrong, why, and the rule that prevents a repeat. |
| `projects/` | One retrospective file per project — the raw source the general knowledge is distilled from. `/capture-learning` creates it. *Not part of this publication.* |
| `archive/retired.md` | Full text of retired entries (reason, date, merged into). **Not read while working** — no role, skill or seeding step reads it; retired anti-patterns keep their number as a tombstone. *Published empty.* |

> **Universal CLAUDE.md cores — source of truth.** The three universal docs every project's
> CLAUDE.md is built from — `principles.md` (95%-rule · meta-questions · plan→discuss→execute ·
> tiers), `code-rules.md` (the 10 stack-agnostic code rules), and `agent-hierarchy.md` (Option-B
> roster · brief templates · ACTIVITY event sequences) — are **canonically owned by**
> `~/.claude/skills/new-code-project-setup/templates/universal/`. Project CLAUDE.mds keep a
> **condensed** core inline and **point** to these files for the full detail — they are the
> single source, never mirrored per-project. (`agents/team-lead.md` § Option B and
> `agents/subagents.md` point to `agent-hierarchy` and keep only the *why*; they don't duplicate.)

## How to use it

- **Starting a new project?** `/new-code-project-setup` reads `agents/team-lead.md`, `workflow/`,
  and the **`universal`-scoped** entries of `anti-patterns.md` to seed the new project's
  CLAUDE.md and team-lead file — so you never start from zero, but you also never inherit
  another stack's baggage. `stack:`/`platform:` entries are pulled in later, when the
  Phase 0 stack decision makes them relevant.
- **Finished meaningful work?** `/capture-learning` extracts what was learned and
  proposes additions here (interactively — you confirm before anything is written).

## Principles for entries

- **Distill, don't dump.** A learning is a *rule* or *pattern*, not a transcript.
- **Why over what.** Every entry says what failed/worked AND why, so the lesson transfers.
- **Project-agnostic in the general files.** Project-specific detail stays in `projects/`.
- **One source of truth per fact.** If it's in `anti-patterns.md`, don't also inline it elsewhere — cross-reference.
- **Tag the scope.** Every anti-pattern (and any stack-bound learning) carries a
  `Scope:` tag — `universal`, `platform:<os>`, or `stack:<name>`. This is what keeps a Go
  web app from inheriting React lessons. **Seeding only pulls `universal` (plus a
  matching `platform:`); `stack:` entries are pulled on demand.** See the legend at the
  top of `anti-patterns.md`.
- **Mark volatile facts.** Anything dated or version-pinned (library pins, free-tier
  quotas, model/context limits) WILL rot. Tag it `⏳ Verify after: <date>` and treat it as
  "re-check before trusting", never as a permanent truth. A stale library pin can actively
  cause harm months later.

## Keeping it true

Entries are only appended by `/capture-learning`, which checks the section an entry lands in and
copies no list, number or format whose source lives elsewhere. Appending alone lets the base grow
stale, so review it now and then. A full review — every area, `anti-patterns.md`, `workflow/`,
`tooling/`, `agents/`, `projects/` and this README with `agent-builder.md`, checked against the
world — showed:

- **Check against what the team works from and what it leaves behind, not against the knowledge
  base itself.** Paths, `#N`/`§` references and expiry markers, checked by script, found almost
  nothing. Every finding came from comparing with the template and defs, the hook tests, the
  event logs and git history of the active projects, and the tools the harness offers today.
- **"Declared, but practised?" is countable.** The lead convention for semantic events had 0 lines
  in 15,951 log lines while three files called it wired; a branching rule held only in the one
  project with a remote.
- **"Does the command or tool still exist?" is cheap** (`--help`, the session's tool list). It
  found renamed browser-pane tools and a CLI that is not on PATH.
- **A list or number copied from its source goes stale** — `anti-patterns.md` #17. The same holds
  for a format: `/new-agent` and this KB's `agent-builder.md` agreed with each other on a
  registration format the files they write had dropped months before. Ask: *does the skill fit the
  files it reads and writes?*
- **"Who reads this while working?" is countable too** (the tool calls in the transcripts). Nobody
  read `agents/` while working, so copies of the defs there went stale unnoticed — they are pointers
  now.
- **A retrospective lags its project** once the project goes on without `/capture-learning`: compare
  its last date with the project's last prompt and commit, and add a dated state line rather than
  rewriting it.
- Retired text goes to `archive/retired.md`; a retired anti-pattern keeps its number as a
  tombstone.

## Source projects

This publication keeps what is about the software-engineering team. It is distilled from seven
projects so far; their retrospectives (`projects/`) are not part of it, and what is general in them
is in the files above.

1. **Buli Tippspiel** — the blueprint. Private Bundesliga prediction app (Expo + NestJS +
   Postgres, Windows). Produced this whole setup system: tiers, phase gate, state-in-files,
   the CI/lockfile lessons.
2. **Agent Builder Test** — meta-project for the `/new-agent` skill itself. Produced the
   builder roster, the multi-file-consistency failure mode, and the skill-count guard. See
   `agent-builder.md`.
3. **StocksDashboard** — personal stock news dashboard (Expo + NestJS + Prisma 7 + SQLite,
   Windows). Produced Prisma 7 e2e patterns (`tooling/nestjs-prisma.md`), the
   Prettier/eslint-disable-next-line anti-pattern (#18), the Windows git staging note, the
   Option B lead-spawn workflow and its brief template, the Background+SendMessage resume pattern,
   the phase-gate FAIL types, and the `$queryRaw`-for-date-groupBy pattern.
4. **Agent Office** — local agent-team dashboard (Node.js + Express + vanilla SVG + ES modules, Windows).
   Produced the preview-MCP restart pattern, the PowerShell here-string git commit pattern,
   the demo-script-as-artifact practice, the Express integration-test pattern (real server on `:0`),
   the ES-Modules-as-SRP-enabler pattern, and the ESLint v10 flat config. See
   `tooling/preview-mcp.md` and `tooling/eslint.md`.
5. **Codex Claude SE Team** — the *measurement* rounds on the team itself (planning/docs, no git):
   analysis, a watched test run, the rebuild, three trials, the rollout in two waves and a full
   knowledge-base review. Produced #30, #31, #39–#43, the trigger half of #24, § Analysing and
   § Trigger hooks in `workflow/observability.md`, and most entries in `agents/`. Not seeded into
   new projects.
6. **SE Agent Teams New** — a from-scratch concept for an AI-agent software team on Claude Code and
   Codex CLI (planning/research, no git, no code yet). Produced the fan-out-against-the-plan-limit
   (#37) and allocation-before-budget (#38) anti-patterns, the detector gap in `workflow/skills.md`
   and `tooling/claude-code-codex.md`. Not seeded into new projects.
7. **Krypto Watchlist** — private local web app (TypeScript on Node 24, Hono, `node:sqlite`, Windows)
   with live Coinbase prices. Produced the unit-blind-seam (#44), hand-listed-contract-test (#45) and
   ignore-by-extension (#46) anti-patterns and the "a fix after acceptance gets a tier too" note in
   `workflow/tiers.md`. Set up as a trial project of the measurement rounds (5); the incidents behind
   #44 and #45 were planted for that trial. Not seeded into new projects.

Plus **Insights** — **the meta-effort itself** (the framework-optimization work): retro'd for its
*method* (phased, ADR-per-block) and its meta-learnings (verify-against-truth #19, mirror-drift
#17). It mostly *curates* this KB — but since it started **measuring** the framework instead of
only reasoning about it, it also feeds it: the declaration/enforcement gap (#24) comes from there.
It is not seeded into new projects.

> Most `universal` entries trace back to Buli. The `Scope:` tags make that lineage explicit and keep
> cross-contamination out of new projects.
