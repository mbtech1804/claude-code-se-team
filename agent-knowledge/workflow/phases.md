# The 5-Phase Workflow (T1 only)

CLARIFY → EXPLORE → PROPOSE → CONVERGE → IMPLEMENT. Applies in full only to **Tier 1**
work. Each phase has a strict, mechanical exit checklist verified by `phase-gate-checker`.

> Naming discipline: these are "Phases 1–5". Review skills use "R1–R6" precisely so the
> two never get confused. Don't call a review step a "phase".

## The phases and what each must produce

| Phase | Produces | Gate checks (evidence, not vibes) |
|---|---|---|
| **1 CLARIFY** | Mental model, assumptions, open questions. | Assumptions in `leads/<role>.md`; open questions in BLOCKERS with `Resolve by:`; all resolved or escalated; journal entry. |
| **2 EXPLORE** | ≥2 viable options w/ trade-offs; prior-art; constraint check; preferred option. | `prior-art-researcher` + `constraint-checker` invoked; no unresolved HARD conflicts; state file updated; journal entry. |
| **3 PROPOSE** | Proposal doc in the right place; sent to reviewer leads. | ADR for architect / design brief for others; all required sections; mailbox sent; journal entry. |
| **4 CONVERGE** | Every critique addressed in writing; **human sign-off**. | Each critique accepted/rejected-with-reason/modified; final doc committed; **explicit human sign-off in chat** (silence ≠ sign-off); STATUS updated; journal entry. |
| **5 IMPLEMENT** | Working feature + tests + review clean. | All backlog items done; tests pass (output captured); all `code-reviewer` MUST-FIX resolved; docs updated; demonstrable end-to-end; journal entry. |

On a T1 with a UI, the PROPOSE cross-read waits until both the architect's contract/ADR and the
design brief stand; the implementing leads then read both in one pass — so no more than two leads
run at a time (`agent-hierarchy.md` § Parallel vs sequential lead spawning).

## What works

- **The gate is mechanical.** `phase-gate-checker` verifies files exist, journal entries
  written, blockers resolved. "We'll clean it up later" is a FAIL. This is the thing that
  makes phases real instead of aspirational.
- **Human sign-off in Phase 4 is explicit.** Implicit silence is never sign-off. The Team
  Lead must have it in writing in chat before IMPLEMENT starts.
- **Proposals live in `/docs/`, working notes in `/state/`.** Permanent vs. rewritable —
  never mix them. ADRs and design briefs are never deleted.
- **Phase 3 deliverables differ per lead.** Architect → ADR; design → flows+wireframes+
  state-coverage+a11y; backend → data model + API contract + migration approach; frontend
  → component tree + routing + data layer. Details in each lead's def (`.claude/agents/<lead>.md`,
  § What you do).

## Phase-gate FAIL types caught in practice

The gate loops: `FAIL: [gap]` → close gap → re-run. Running `phase-gate-checker` 2–3 times
per phase is normal and correct — not a sign something went wrong. Four concrete failure
types observed in T1 sessions:

1. **Missing journal entry** — lead announced transition but hadn't written the required
   `JOURNAL.md` entry. Gate: `FAIL: journal entry missing` → lead writes entry, re-runs → PASS.
2. **Missing reviewer agreement documentation** — Phase 3 proposal didn't record that other
   leads had been briefed / agreed. Gate: `FAIL: lead agreements missing` → lead added
   sign-off note to design doc → re-ran gate → FAIL again (next gap).
3. **Missing ADR table reference** — ADR was written in `/docs/adr/` but not listed in the
   architect's own ADR index table in `state/leads/architect.md`. Gate: `FAIL: ADR table in
   architect.md` → lead added the row → re-ran gate → PASS.
4. **The checker read the state as of its spawn.** One project ran `phase-gate-checker` 24 times
   for two features: four runs for one CLARIFY gate, four for a CONVERGE gate, five for an
   IMPLEMENT gate. Nearly every FAIL was bookkeeping, and one was self-inflicted: the lead spawned
   the checker and updated `STATUS.md` afterwards, so the checker judged the old version. Write the
   state first, then spawn the checker, and touch nothing it reads while it runs. Two or three
   runs are normal (above); a fourth means the lead is closing one gap per run — read the whole
   exit checklist and close everything before re-running. The loop is still worth having: one of
   those FAILs caught a product question the human had skipped and the lead had booked as "decided
   by the overall approval".
   **Cap:** after the third `FAIL` of the same gate the lead stops re-running it
   and reports the open gaps to the team-lead. **No fourth run:** the team-lead
   records the open gaps as known (`[META]` in the journal, an entry in `BLOCKERS.md`) and lets the
   transition go ahead — a recorded waiver, never for a missing human sign-off — or puts them to the
   human. The cap is in the four lead defs, the waiver and "state first" in the project `CLAUDE.md`
   and `agent-hierarchy.md`. It bounds the loop without removing the gate — the gate stays, because
   it caught the one thing it is there for.
   **What follows the cap needs a default** — hence the waiver above: in one trial "decide how to
   go on" turned into "one more run" twice, and the main cause was a checker started before the
   state files were up to date. All gate runs together took 4 % of the tokens: the loop costs time
   and attention, not the limit.

Key insight: the gate checks *evidence of completeness* (files exist, specific entries
written, specific tables updated), not whether the feature feels done. This distinction is
what makes it mechanical and trustworthy rather than advisory.

## Failure modes seen

- **Announcing a transition without running the gate** — `anti-patterns.md` #5.
- **Skipping prior-art / constraint checks in EXPLORE.** They're cheap and catch known
  pitfalls and HARD conflicts before they're baked into a proposal.
- **"Done" without tests.** A feature without tests is not done — it's a Phase 5 FAIL.
