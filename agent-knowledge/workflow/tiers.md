# Workflow Tiers (T-Shirt sizing)

The Team Lead classifies **every** task into one of three tiers at session start. The tier
decides how much process applies. This is the highest-leverage knob against both
over-process (analysis paralysis on a typo) and under-process (a real feature shipped raw).

## The three tiers

| Tier | When | Process |
|---|---|---|
| **T1 — Major Feature / Epic** | New features, structural code changes, DB-schema changes. | Full 5-phase workflow for all affected leads. `phase-gate-checker` mandatory at every transition. Explicit human sign-off in Phase 4 required. |
| **T2 — Bugfix / Minor Patch** | Edge-case bugs, cosmetic UI fixes, single data field without architecture break. | Team Lead delegates straight to the relevant lead. Phases 1–4 skipped. Lead notes root cause (3 bullets) in chat, jumps to Phase 5 IMPLEMENT. Gate-checker suspended. `code-reviewer` validates before merge. |
| **T3 — Chore / Trivial** | Doc updates, typos, simple CSS/styling, npm bumps. | Team Lead skips leads entirely, delegates straight to `code-writer`. No JOURNAL / phase-file entries. Only `code-reviewer` must approve before final commit. |

## Model per tier

The tier is also a **model** signal — pick the lightest model that reliably handles it (Anthropic
cost guidance: reserve Opus for architecture/planning; Sonnet covers ~90% of coding; Haiku for
mechanical sub-agent work). On a subscription the lever is **plan-limit headroom** (Opus burns the
5-h / weekly budget ~5× faster than Haiku), not per-token cost — so this is the single biggest
efficiency knob. `/fast` stays Opus and saves nothing.

| Tier | Main session | Why |
|---|---|---|
| **T1** | **Opus** — ideally *Opusplan* (Opus plans → Sonnet executes) | deep architectural reasoning where it matters |
| **T2** | **Sonnet** | covers bugfix work at ~⅕ of Opus's budget burn |
| **T3** | **Sonnet** (Haiku for truly trivial) | chores don't need Opus |

Subagents declare their own `model:` (roster in `agents/subagents.md`): the mechanical read-only
scouts (`constraint-checker`, `memory-keeper`) run **Haiku**; gates (`code-reviewer`,
`phase-gate-checker`) and generators (`code-writer`, `test-writer`) stay **Sonnet** — cheapening a
gate is a false economy.

**Parallel fan-out multiplies the burn.** Several subagents on Opus at once can exhaust a session
limit in minutes and are then cut off together. Size the fan-out to the plan and pin tool-heavy
agents to `sonnet` — see `anti-patterns.md` #37.

> **Use aliases, not pinned versions.** The table and the roster use model **aliases**
> (`opus` / `sonnet` / `haiku`), never pinned version IDs — an alias resolves to the newest
> model of that tier the harness serves, so agents upgrade automatically when the alias flips.
> When it does, re-run the model A/B evals to confirm the gates still hold.

## What works

- **Classify first, always.** The tier is the first decision of the session. Everything
  downstream (which agents wake up, which gates fire) follows from it.
- **The `code-reviewer` is the floor.** Even T3 passes through it. It's the one gate that
  is never suspended.
- **Fast-track is explicit, not implicit.** "Skipping the gate" is only legitimate as a
  declared T2/T3 fast-track. An undeclared skip on a T1 is a process violation the Team
  Lead must reject.

## Failure modes seen

- **Tier inflation / deflation** — `anti-patterns.md` #10.

## Tuning notes

- Tiers were added specifically to stop the full 5-phase machinery from running on trivial
  work. They are a pure efficiency mechanism layered on top of the phase model.
- The boundary case "is this T1 or T2?" usually resolves on: *does it change architecture
  or schema?* If yes → T1.
- **Delegation has a half-life** (measured over 15 work sessions / 71 spawns). Spawn
  density is **bimodal**, never in between: either team mode (1 spawn per 1–2 human turns) or
  solo mode (1 per 27–54). Within one project it decays chronologically —
  `1:1.7 → 1:2.1 → 1:27 → 1:54 → 0` across five weeks — while a freshly scaffolded project drops
  straight back into team mode (1:1.2, including five `phase-gate-checker` runs). The capability
  is not lost; the habit is. The worst densities sit on the **longest** sessions.
  → Team mode is cheap at the start of a session and gets expensive as it grows: writing a
  self-contained brief costs more than editing the file yourself, and costs most exactly when
  your own context already holds the answer. Bind delegation to the early moment, or cut the
  session shorter. **Do not answer this by pruning the roster** — an earlier improvement round
  already made that mistake once (the agents proposed for deletion turned out to be the most-used).
- **A fix after acceptance gets a tier too.** No code from the team-lead after
  acceptance either: before the first change of such a fix it names the tier; a one-line fix is T3
  (`code-writer` by card, then `code-reviewer`; its test to `test-writer`). A human's direct request
  does allow the direct edit — then the recap says in one line that the review step was skipped, so it
  is a decision, not a gap. Still a reminder, not a gate. **Reaches the role:** `CLAUDE.md` § Workflow
  Tiers, `universal/agent-hierarchy.md` and the write reminder's text. Origin: in a trial, three
  direct fixes went in from the main session after acceptance.
