---
name: capture-learning
description: "Extrahiert Agent-Team-Learnings aus dem Projekt und schlägt Ergänzungen für agent-knowledge/ vor; schreibt erst nach Bestätigung. Trigger: /capture-learning"
trigger: /capture-learning
---

# /capture-learning

Mine the **current project** for learnings worth carrying to future projects, and fold them
into `~/.claude/agent-knowledge/`. This is how the knowledge base grows: every project that
taught us something feeds the next one.

> **Interactive by design.** Nothing is written to the knowledge base until you confirm it.
> The skill *proposes*; you accept / reject / adjust each item.

> **Distill, don't dump.** A learning is a reusable *rule or pattern* with a *why* — not a
> transcript of what happened. Project-specific detail goes in `agent-knowledge/projects/`;
> general lessons go in the topical files.

---

## Step 0 — Detect project type (what counts as a source)

The project type decides *where* the learnings live and *what* to read. **Same detector as
`/start-session` (decision C2):**

1. `CLAUDE.md` frontmatter has an explicit `type:` → that wins.
2. else `state/STATUS.md` exists → **coding**.
3. else a master-plan / roadmap doc exists (`DISCUSS-TODO.md`, `ROADMAP*.md`, `PLAN*.md`,
   `PHASE*.md`) → **planning/meta**.
4. else `.obsidian/` (vault) or `LEARNING-LOG.md` → **learning**.
5. else → **generic**.

> Until the shared detector is factored into `agent-knowledge/`, this mirrors
> `/start-session`'s Step 0 (four types) — keep the two in sync. **For capture-learning a
> `learning` project is mined like `generic`** (MEMORY.md + notes): the personal IT-learning
> log is *not* agent-team knowledge, so it isn't harvested into the KB (E3 decision).

## Step 1 — Read the current project (by type)

Read, to reconstruct what this project taught:

**coding** (has `state/`):
- `CLAUDE.md` — especially project-specific code rules, boundaries, any conventions that
  deviate from or extend the universal baseline.
- `state/leads/*.md` — how each lead was actually set up and what they noted.
- `state/JOURNAL.md` (last ~50 lines) — decisions, sign-offs, scope changes, `[META]`
  resolutions.
- `state/ACTIVITY.md` — orchestration patterns, recurring frictions.
- `state/STATUS.md` + `state/BLOCKERS.md` — what stalled and why.
- `docs/adr/*.md` — architectural decisions and their consequences.
- `git log --oneline -20` — what actually shipped (use the OS's native shell).

**planning/meta** (no `state/`, has plan docs — e.g. an effort to improve the framework itself):
- the master-plan doc (`DISCUSS-TODO.md` / `ROADMAP*` / `PLAN*`) + the relevant `PHASE*` /
  ADR docs — the decisions, their rationale, what was ratified vs. deferred.
- `MEMORY.md` index + the project-memory file — durable facts already captured (mine *deltas*).
- `git log --oneline -20` if a repo; else note there is none.

**generic**: `MEMORY.md` + project-memory + top-level `README`/docs, best effort.

## Step 2 — Read what the knowledge base already knows

Read `~/.claude/agent-knowledge/` (README + the relevant topical files) so proposals are
**deltas**, not duplicates. If a lesson is already captured, note it and move on — don't
restate it.

## Step 3 — Identify candidate learnings, by category

Sort findings into the knowledge-base structure:

| Category | Target file(s) | Looks like |
|---|---|---|
| **Agents** | `agents/<lead>.md`, `agents/subagents.md` | Why a role is set up as it is, a boundary that mattered, a failure mode. The rule itself belongs in the role's def (a rule change, see below); no role reads `agents/` while working. |
| **Workflow** | `workflow/tiers.md`, `phases.md`, `skills.md`, `governance.md`, `observability.md` | A tuning insight about tiers/phases/gates/governance, a logging pattern, a skill that helped or was missing. |
| **Tooling** | `tooling/graphify.md`, `git-hooks.md`, `settings-json.md` | A concrete tool quirk, an OS gotcha, a hook that worked. |
| **Anti-patterns** | `anti-patterns.md` | Something that bit us: what went wrong, why, the preventing rule. |
| **Project retrospective** | `projects/<this-project>.md` | The project-specific snapshot + stack-specific notes (always create/update this one). |

For each candidate, draft it in the target file's existing style (what / why / rule).

**Check the section it lands in.** Read the target section (and any entry the candidate names) before
drafting: does the candidate contradict it, repeat it, or replace it? Say which in the proposal (Step 4).
A replaced entry does not stay next to the new one — it goes to the archive (Step 5). This is the cheap
moment to keep the knowledge base from only growing.

**Copy no list, number or format whose source lives elsewhere** — a def, a template, a skill, a test's
output, a tool's help. Name the source instead ("the roster in `agent-hierarchy.md`", "the count is in
`test-hooks.js`'s output"). A review of the knowledge base found every such copy stale: tools per role, hook-check counts, the
template's length, tool names, `/new-agent`'s registration format (`anti-patterns.md` #17).

**Assign a `Scope:` tag to every anti-pattern (and any stack-bound learning):**
- `universal` — applies to every project regardless of stack (process, team, state, git,
  security baseline).
- `platform:<os>` — OS-specific (e.g. `platform:windows`).
- `stack:<name>` — tech-stack-specific (e.g. `stack:node`, `stack:react`,
  `stack:server-rendered-html`).

The tag is what lets `/new-code-project-setup` seed `universal` lessons into a new project
without dragging in another stack's baggage. When unsure between `universal` and `stack:`,
ask: *would a project on a completely different stack benefit from this?* If no → `stack:`.

**Mark volatile facts.** If the learning contains a dated/version-pinned value (library
pin, free-tier quota, model/context limit), add a `⏳ Verify after: <date>` marker and
phrase the durable *pattern* separately from the perishable *number*.

**Check whether it reaches the role (`anti-patterns.md` #43).** The knowledge base is read when
someone looks something up, not by an agent mid-task. For every candidate ask: *should this change
what a role does?* If yes, name the role and the file it actually reads while working — its def
under `.claude/agents/`, the project `CLAUDE.md`, a template in `new-code-project-setup/templates/`,
`templates/universal/agent-hierarchy.md` — and mark the candidate as a **rule change**. If no, mark
it **knowledge only**. A lesson that shows up a second time is a sign it never reached its reader.

## Step 4 — Propose interactively, one at a time

For each candidate, show the human:

```
📌 Proposed learning  [<category> → <target file>]  Scope: <universal | platform:<os> | stack:<name>>
   <the drafted entry, in final form>

   New entry / extends existing section: <which>
   Checked against: <section read> — no conflict | extends <entry> | replaces <entry> (old text → archive)
   Reaches the role: <role> reads <file> → rule change, decided separately | knowledge only
   Accept (a) / Reject (r) / Adjust (describe) ?
```

- **Accept** → stage it for writing.
- **Reject** → drop it.
- **Adjust** → revise per feedback, show again, re-confirm.

Go through all candidates before writing anything. Keep it brisk — batch related small ones
if the human prefers.

## Step 5 — Write the confirmed entries

- Append/integrate each accepted entry into its target file, matching the existing structure
  (don't reformat the whole file; insert cleanly).
- Always create or update `agent-knowledge/projects/<this-project>.md` with the project
  snapshot + stack-specific notes, even if no general lessons emerged. Give it a dated state line
  ("this write-up runs to <date>"), so a later look can see that it lags its project.
- **An accepted entry that replaces an older one:** move the old text to
  `agent-knowledge/archive/retired.md` (number, heading, retired on, reason, merged into, old text
  verbatim — the format at the top of that file); a retired anti-pattern keeps its number as a
  one-line tombstone, because `#N` references in templates, defs and skills must not break.
- **Rule changes are not written here.** For every accepted entry marked *rule change*, record an
  open decision in the project's working memory — the master-plan doc's open decisions
  (`DISCUSS-TODO.md` / `ROADMAP*` / `PLAN*`) for planning/meta, `state/BACKLOG.md` for coding, the
  project memory file for generic. Name the role, the file it reads and the sentence that would go
  there. The def or template changes later, as its own decision with its own diff — never inside
  this skill. Otherwise the open change lives only in the chat and is gone after `/clear`.
- Keep the **single-source-of-truth** rule: if a lesson belongs in `anti-patterns.md`, put it
  there and cross-reference from elsewhere rather than duplicating.
- **No secrets / tokens / PII** ever enter the knowledge base.
- **If `~/.claude` is a git repo** (check it; don't assume it is not): after writing, run
  `git -C ~/.claude status --short agent-knowledge/` and show what is uncommitted. Commit only on the
  human's okay; the memory of this project may go along, memory files of other projects never.

## Step 6 — Summary

Print what was captured:

```
✅ Captured <N> learnings into the knowledge base.

   AGENTS:        [files touched, or none]
   WORKFLOW:      [files touched, or none]
   TOOLING:       [files touched, or none]
   ANTI-PATTERNS: [added / none]
   PROJECT:       projects/<this-project>.md [created/updated]

   RULE CHANGES:  <count> to decide — role → file each, recorded in <working-memory file>; or none

   GIT (~/.claude): [uncommitted files under agent-knowledge/ — committed on okay / left for the human]

   REJECTED:      <count> (not carried forward)
```

**How it ends.** Inside `/end-session` (its step 7) the summary is the end; `/end-session` goes on
with its own steps. Run on its own — also when an `/end-session` deferred it to this session — end
with exactly one question, in the session's language, and propose no new work: *"Continue working,
or `/end-session`?"* Never offer the next work step as "Shall I …?" (seen in practice: after the
learnings came "Shall I start the short plan?" instead of the closing).

---

## When to run

- At the end of a project, or after a milestone that genuinely taught something.
- Prompted by `/end-session` when a session yielded learnings (it reminds; this skill does
  the work).
- Anytime you notice a reusable lesson and want it captured before it's forgotten.

## Guardrails

- **Confirm before writing.** No silent additions to the knowledge base.
- **Delta, not duplicate.** Read the base first; don't restate known lessons.
- **General vs. project-specific.** Reusable rules → topical files; project detail →
  `projects/`.
- **Distill.** Rules and patterns with a *why*, not transcripts.
- **Knowledge is not behaviour (#43).** A rule changes what a role does only once it stands in the
  file that role reads. This skill names that file and records the open change; it does not edit
  defs or templates.
- **No secrets / PII.**
