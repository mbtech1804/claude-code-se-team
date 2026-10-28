# Design Lead — setup & behavior

Owns UX: user flows, wireframes, state coverage, accessibility. **Writes no production code.**
A **specialist**: not part of every task, called on a trigger.

> **The rules are in the def** (`new-code-project-setup/templates/agents/design-lead.md`): the
> trigger (the task changes what the user sees and operates on screen), the four Phase-3
> deliverables, low-fi first, error/empty branches. The hierarchy counts it against the limit of
> two leads at a time. This file keeps the *why*.

## Why the four deliverables

- **The state-coverage document** is the single artifact that made the frontend's four-state rule
  (loading / empty / error / success) enforceable.
- **Flow diagrams with an error or empty branch** force edge-case thinking before pixels. Designing
  only the happy path is the failure the gate catches — it checks the branches are there.
- **A11y named per flow, up front** (keyboard path, focus order, ARIA) — not retrofitted.
- **Low-fi on purpose:** keeps the conversation about structure and state, not colour. Fidelity
  comes later.

## What works

- **A review of a running screen, on request, without wireframes.** Phase 0 of a small list app
  dropped the design-lead as "ceremony without return"; it was activated later for a phone-width
  review. Given the team-lead's own measurements (tap targets, position of the first row at
  375 px) it contradicted the lead twice and was right both times: one proposal belonged in the
  first package, another would have missed the platform switch control entirely. Its main finding
  went beyond the numbers — the targets were not only too small but too high for one-handed use.
  Keeping the role out at Phase 0 with a written "activate when UX work appears" clause worked;
  what matters is that the clause is there and the team-lead uses it.

## Setting up

The def is scaffolded in every project; Phase 0 records whether it is active. A pure API/CLI leaves
it inactive — with the trigger written down, so it is used when UI work appears. `/docs/design/<feature>/`
is created when the role activates.
