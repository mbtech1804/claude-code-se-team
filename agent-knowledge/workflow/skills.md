# Skills — what we have and how they fit

Skills are `/`-triggered markdown procedures at `~/.claude/skills/<name>/SKILL.md`,
registered in a category file (`~/.claude/skills-<domain>.md`) that the global
`~/.claude/CLAUDE.md` imports (§ CLAUDE.md as an @-import category router below). They encode
repeatable procedures so the agent runs them the same way every time.

## Universal skills (carry to every project)

| Skill | Purpose | Notes |
|---|---|---|
| `/new-code-project-setup` | Scaffolds a new project's full agent framework from this knowledge base. | 4-question intake, no stack decision. Reads `agent-knowledge/`. |
| `/capture-learning` | Extracts learnings from the current project into `agent-knowledge/`. | Interactive — proposes, you confirm before writing. |
| `/start-session` | Cold start: detects the project type, reads the working set, verifies it against git/files, briefs the next step. | Read-first; the counterpart of `/end-session`. |
| `/new-agent` | Wizard for a new agent skill: intake, architecture, SKILL.md, registration, smoke test. | Intake has no `Tools: *` option (`workflow/governance.md` § Tool least-privilege). |
| `/checkpoint` | Mid-session working-memory snapshot. State sync + compact + graph + git warning. No tests. | Universal. Not a substitute for `/end-session`. |
| `/end-session` | Session closure. Superset of `/checkpoint` + closure log. **Mandatory before `/clear`.** | Reminds about `/capture-learning` if the session yielded learnings. |
| `/review-quick` | Fast review of changed files (`git diff HEAD`) against CLAUDE.md § Code rules. | Spawns `code-reviewer`. For T2/T3. No phase gate. |
| `/review-all` | 6-step full-stack review (R1–R6). Persistent report, waits for feedback per step. | Reads stack from CLAUDE.md — not hardcoded to any framework. |
| `/graphify` | Builds / updates the knowledge graph at `graphify-out/`. | `--update` after code changes is AST-only, no API cost. |

## What works

- **State-management skills are the backbone of long projects.** `/checkpoint` and
  `/end-session` make `/clear` safe — working memory lives in `/state/`, not in context.
  Cold-start sessions rehydrate from the MDs.
- **`/end-session` is a hard gate before `/clear`.** "No session is finished without it."
  This is the discipline that keeps STATUS/JOURNAL honest across a multi-week project.
- **Review skills come in two sizes.** `/review-quick` for fast diff checks, `/review-all`
  for a full 6-step sweep that survives `/clear` via its persistent report. Both lean on
  `code-reviewer` and CLAUDE.md § Code rules.
- **Check blast radius before applying a suggested review fix, not just severity.** A
  LOW/MEDIUM finding can still be expensive to fix safely. In one `/review-all` R3 pass, a
  route-param-validation fix looked like a one-line pipe addition but would
  have touched 16 existing spec files using non-ID-shaped fixture values — found only by
  grepping how many call sites the change would affect. Before committing to a fix mid-review
  (R3/R6), grep for downstream impact; a large or unclear blast radius is a signal to defer
  the fix as its own planned task rather than force it into the review session.
- **Global skills are registered in a category file the global CLAUDE.md imports.** A skill the
  model doesn't know about won't fire, so registration is part of "installing" a skill; a
  project-local skill under `<project>/.claude/skills/` is listed by the harness and needs none.

## Project-specific skills (emerge per project, NOT generated at init)

- Start/stop dev-environment skills (e.g. `/buli-start`, `/buli-stop`) are written once the
  stack is known. They live in the project's `.claude/skills/` and orchestrate that
  project's concrete services (Docker, dev servers, health-check, screenshot).
- Deploy / migrate / debug skills come later, with the needs of each project. Keep them in
  mind; don't pre-build them.

## CLAUDE.md as an @-import category router

Instead of listing every skill directly in `~/.claude/CLAUDE.md`, the global CLAUDE.md acts
as a thin router:

```
@skills-core.md
@skills-coding.md
@skills-agents.md
```

The `@file.md` syntax is resolved by the Claude Code harness at session start — the file's
contents are inlined exactly as if they had been pasted directly. Existing projects get all
their skills unchanged.

**Rules:**
- Global skills → write into the matching `skills-<domain>.md` file, not directly into CLAUDE.md.
- Project-specific skills → live in `<project>/.claude/skills/`; the harness **auto-lists**
  them in-project, so **no router file is needed** (and never a global `skills-<project>.md`).
- `/new-agent` Step 0 counts the skill lines across all `skills-*.md` files.
- `/new-agent` Step 7 routes by Q5 category to the correct target file.

**Why:** A monolithic CLAUDE.md grows without bound and raises context-budget pressure.
Category files allow project-specific loading and keep the global CLAUDE.md clean.

---

## Failure modes seen

- **A skill referenced in CLAUDE.md but never created** — `anti-patterns.md` #2.
- **Stack-hardcoded universal skills** — #4.
- **Wrong-context shell syntax in skill commands** — #3 and `tooling/settings-json.md`.
- **A plan doc the project-type detector does not know.** The shared Step-0 detector
  (`/start-session`, `/checkpoint`, `/end-session`, `/capture-learning`) recognises a planning
  project by `DISCUSS-TODO.md`, `ROADMAP*.md`, `PLAN*.md` or `PHASE*.md`; one research project kept
  its master plan in `KONZEPT.md`, had no `CLAUDE.md` and was classified `generic`.
  Fix it per project, not per name: give such a project a `CLAUDE.md` whose frontmatter sets
  `type:` — all four skills let it win (instead of adding names to the list).
- **A closing skill needs a phase, not just a sequence of steps.** `/end-session` listed its steps
  in order, all questions in step 7, and still twice the session did not close. Once
  `/capture-learning` ran on its own (deferred by the previous `/end-session`); after the discussion
  of its points the model offered the next work step ("Shall I start the short plan?"), and the
  human had to ask for `/end-session`. Once the human's question about `/clear` came after the
  marker. A nested skill plus a discussion drops the model back into working mode, because nothing
  says "we are closing now". Rule: a closing skill states its phase — an entry line; what belongs to
  it, the discussion included; what does not, namely new work (ask "note it for the next session, or
  abort the closing?"); and a fixed last line. A skill that can also run on its own ends with one
  question and offers no new work. Built into `/end-session` and `/capture-learning`.
