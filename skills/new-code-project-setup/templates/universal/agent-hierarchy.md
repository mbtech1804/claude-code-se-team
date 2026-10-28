## Agent Hierarchy & Workflow (Option B)

This project uses **Option B** — all leads are spawned as real `Agent` tool calls (not
inline roles simulated in the Team Lead's own context). Each lead runs autonomously, spawns
its own subagents, and logs under its own role name. The Team Lead never writes production
code (except it may delegate a T3 chore straight to `code-writer`, see below) — **not even a fix
after a task was accepted** (since 2026-10-24): name the tier before the first change; a one-line
fix is a T3, its test goes to `test-writer`.

> **Pinned lead defs.** The four domain-leads are real `.claude/agents/*-lead.md` definitions —
> fixed `tools:` (including `Agent`, so they can spawn subagents), `model:`, and boundaries —
> scaffolded like the subagents. A lead spawn is therefore `Agent(subagent_type: "backend-lead")`,
> and the lead's **identity, logging rules, boundaries, and available subagents come from its def**;
> the brief below supplies only the task specifics (project path · task + Tier · phase · report-back).
> The **team-lead** is the exception — it is the session persona you talk to, not a spawned def.
> Inline-simulating a lead or a subagent instead of spawning it is **forbidden**
> (see `~/.claude/agent-knowledge/workflow/governance.md` § Failure modes).

> _Phase 0: record which leads this project uses (e.g. no Design Lead for a pure API,
> no Frontend Lead for a CLI). All four lead defs are scaffolded at setup; unused ones stay in
> place. The roster below is the full Option-B model._

> **Older projects (rules dated 2026-10-13).** The task card, the gate cap, the limit of two leads
> and the dated ACTIVITY format below describe projects scaffolded or refreshed after 2026-10-13.
> Where a project's own `.claude/agents/*-lead.md` does not know the task card yet (it still says the
> lead "may write code directly"), **the project's def holds** until it is refreshed — don't hold a
> lead to a rule its def doesn't carry.

### Hierarchy

```
human
  └── team-lead                 (coordinates; never writes code)
        ├── architect-lead       (T1: schema / ADR / shared-contract decisions)
        ├── backend-lead         (T1 + T2: all backend work — plans; code-writer implements)
        └── frontend-lead        (T1 + T2: all frontend work — plans; code-writer implements)

Specialists — not part of every task, called on a trigger:
  design-lead        the task changes what the user sees and operates on screen
                     (spawned by the team-lead; a lead like the others once active)
  debugger           the cause of a failure is unclear after a first look, or a fix attempt failed
  security-auditor   MANDATORY when the change touches login/auth, sessions or tokens, passwords,
                     permissions, secrets, crypto, or input at a trust boundary: once per task before
                     sign-off, next to the code-reviewer; CRITICAL/HIGH block the sign-off, then one
                     re-check of the fixed points only. Recommended on other T1 and dependency changes.
                     (debugger + security-auditor: by any lead or the team-lead; read-only)

Each lead spawns its own subagents:
  lead → prior-art-researcher    (Phase 2 EXPLORE)
  lead → constraint-checker      (Phase 2 + 4 CONVERGE)
  lead → phase-gate-checker      (T1: every phase transition; stop after the third FAIL of one gate)
  lead → code-writer             (Phase 5 IMPLEMENT: one task card per step, one writer at a time)
  lead → test-writer             (Phase 5 IMPLEMENT)
  lead → code-reviewer           (Phase 5: once over the whole task, before sign-off)
```

**Lead plans, writer implements.** `backend-lead` and `frontend-lead` write no feature code. They
break the task into small steps and hand each to `code-writer` as a task card (below), check the
return against the card, then run `test-writer` and one `code-reviewer` over the whole task. The
lead's only own edits are small corrections: what a writer has just delivered or what the reviewer
flagged, in files of this task, without a new file, function or component.

**State first.** Before each gate run, bring `STATUS.md`, your lead file and `BLOCKERS.md` up to
date — the checker reads them as of its spawn, and most FAILs are stale state.

**Gate cap.** After the third `FAIL` of the same gate the lead stops re-running it and reports the
open gaps to the team-lead. **No fourth run** (since 2026-10-15): the team-lead records the open gaps
as known (`[META]` in `state/JOURNAL.md` + an entry in `state/BLOCKERS.md`) and lets the transition go
ahead — a recorded waiver, not a bypass, and never for a missing human sign-off — or puts the gaps
to the human.

### ACTIVITY.md role names (exact, lowercase-hyphenated)

| Role | Name in ACTIVITY.md |
|---|---|
| Team Lead | `team-lead` |
| Architect Lead | `architect-lead` |
| Backend Lead | `backend-lead` |
| Frontend Lead | `frontend-lead` |
| Design Lead | `design-lead` |
| code-writer subagent | `code-writer` |
| test-writer subagent | `test-writer` |
| code-reviewer subagent | `code-reviewer` |
| phase-gate-checker subagent | `phase-gate-checker` |
| constraint-checker subagent | `constraint-checker` |
| prior-art-researcher subagent | `prior-art-researcher` |
| debugger (specialist) | `debugger` |
| security-auditor (specialist) | `security-auditor` |
| Human | `human` |

### Team Lead → Lead: brief template

When team-lead activates a lead, it MUST first log to ACTIVITY.md, then spawn the Agent —
by def type (`subagent_type: "backend-lead"`). With pinned lead defs (see note above),
elements **1, 5 and 6 live in the def**; the brief MUST still carry **2, 3, 4 and 7**
(repeating the rest is harmless redundancy). Only in a project whose lead defs are not yet
deployed (pre-Block-F) does the full 7-element brief stay mandatory:

```
1. Role identity      — "You are the backend-lead for <Project>."
2. Project path       — absolute path to the working directory
3. Task + Tier        — "[Task description]. Tier: T1 / T2."
4. Phase to start     — "Begin at Phase 1 CLARIFY." (T1) or "Jump to Phase 5 IMPLEMENT." (T2)
5. Logging block      — copy verbatim:
     "Log every action to state/ACTIVITY.md: YYYY-MM-DD HH:MM <your-role> <verb> <object ≤8 words>.
      Your role name is backend-lead. Required events:
        - activated        : first line when you start
        - subagent-spawn   : before every subagent call (object = subagent-name — task)
        - subagent-return  : after every subagent returns (object = subagent-name — outcome)
        - implement-started / implement-complete / tests-running / review-running
        - sign-off-requested team-lead : when ready for sign-off
        - awaiting-input team-lead about <topic> : when blocked"
6. Available subagents — list only the ones relevant to this task.
7. Report-back format — what to return when done (summary + files changed + test results).
```

### Lead → Subagent: brief format

| Subagent | Brief pattern |
|---|---|
| `prior-art-researcher` | "Researching [topic] for [stack]. Surface 2–3 viable approaches with trade-offs." |
| `constraint-checker` | "Proposed approach: [summary]. Check against CLAUDE.md and existing codebase." |
| `phase-gate-checker` | "Gate-check `backend-lead` for Phase [N] exit. Feature: [feature-name]." |
| `code-writer` | A **task card**, one per step — see below. |
| `test-writer` | "Write [unit/e2e] tests for [module]. Critical paths: [list]. Runner: [command]. Report the `Mutation probes:` block." — a return without that block is not accepted. |
| `code-reviewer` | "Review changes in [files]. Context: [what the change is meant to do]." — once per task, over everything it changed. |
| `debugger` | "[test / command / feature] is failing: [symptom]. Repro: [how]. Context: [intended behaviour]. Already tried: [failed fix, if any]. Find the root cause." |

**The task card** (lead → `code-writer`; team-lead → `code-writer` for a T3 chore):

```
Goal:         what this step achieves, in one sentence
Files:        the files to create or change
Interface:    inputs, outputs, states and errors it must handle
Acceptance:   the command(s) that must pass, and what the lead will check
Not in scope: what the writer must leave alone
```

A step is small enough when its card fits these five lines and the writer's plan fits five bullets.
A writer who gets a card with a missing field asks for it instead of guessing.

### Parallel vs sequential lead spawning

- **At most two leads run at the same time** — the `design-lead` counts. Within a lead: **one
  writer at a time**, and reviewer and auditor one after the other, not side by side. Every running
  agent draws on the same session limit; when it is hit, all of them stop together and their
  context is lost.
- Leads with **no dependency** on each other → may run in parallel, up to that limit (one message,
  two `Agent` calls).
- Leads that need another lead's output (e.g. frontend-lead needs design-lead's wireframes)
  → spawn sequentially.
- **T1 with a UI — proposals first, then one cross-read** (since 2026-10-15): `architect-lead` and
  `design-lead` work out contract/ADR and brief (two leads). When both stand, the implementing leads
  cross-read contract **and** brief in one pass (two leads). Starting the cross-read while the
  `design-lead` is still working makes three.
- **An architect addendum is a lead run** (since 2026-10-24): an addendum by `architect-lead` (ADR,
  contract) counts toward the two. It waits for a free slot, not for both implementing leads to
  finish. A lead that needs the addendum to go on ends its run with a report (what is done · what
  it needs) instead of waiting in the background; the architect adds it, then the team-lead spawns
  the lead again with that report in the brief, and the lead first checks what is already written.
- Dependency check: "does Lead B need an artifact Lead A produces?" → if yes, spawn A first.

### Background Agent + SendMessage resume (T1 leads needing mid-run human input)

For a T1 lead that needs human sign-off mid-run (Phase 4 CONVERGE), don't spawn a fresh
Agent afterwards — it starts cold with no memory of Phases 1–3. Resume the existing one:

1. Spawn the lead with `run_in_background=true`.
2. Lead runs Phases 1–3, logs `sign-off-requested team-lead`, and stops.
3. Team Lead presents the design questions to the human in chat.
4. Once the human answers, Team Lead loads SendMessage via ToolSearch **first**
   (`{ query: "select:SendMessage" }`) — it is a deferred tool; its schema must be fetched
   before it can be called, or the call fails with `InputValidationError`.
5. Team Lead calls SendMessage with the agentId and the sign-off decisions.
6. Lead resumes with full context, completes Phase 4, and returns its final report.

### T1 event sequence (full workflow)

**Team Lead logs** (`team-lead` role):
```
YYYY-MM-DD HH:MM team-lead session-start — <task summary>
YYYY-MM-DD HH:MM team-lead lead-activated backend-lead — <task>
YYYY-MM-DD HH:MM team-lead delegated backend-lead — <task>
YYYY-MM-DD HH:MM team-lead sign-off-received backend-lead — approved
YYYY-MM-DD HH:MM team-lead commit — <hash> <subject>
YYYY-MM-DD HH:MM team-lead session-end — <task> done
```

**Lead logs** (`backend-lead` role — written by the lead itself inside its Agent call):
```
YYYY-MM-DD HH:MM backend-lead activated — <task summary>
YYYY-MM-DD HH:MM backend-lead subagent-spawn prior-art-researcher — <topic>
YYYY-MM-DD HH:MM backend-lead subagent-return prior-art-researcher — complete
YYYY-MM-DD HH:MM backend-lead subagent-spawn constraint-checker — <approach>
YYYY-MM-DD HH:MM backend-lead subagent-return constraint-checker — no hard conflicts
YYYY-MM-DD HH:MM backend-lead subagent-spawn phase-gate-checker — phase 2 exit
YYYY-MM-DD HH:MM backend-lead subagent-return phase-gate-checker — PASS
YYYY-MM-DD HH:MM backend-lead implement-started — <feature>, 3 task cards
YYYY-MM-DD HH:MM backend-lead subagent-spawn code-writer — card 1/3 <step>
YYYY-MM-DD HH:MM backend-lead subagent-return code-writer — card 1/3 accepted
YYYY-MM-DD HH:MM backend-lead subagent-spawn code-writer — card 2/3 <step>
YYYY-MM-DD HH:MM backend-lead subagent-return code-writer — card 2/3 accepted
YYYY-MM-DD HH:MM backend-lead subagent-spawn code-writer — card 3/3 <step>
YYYY-MM-DD HH:MM backend-lead subagent-return code-writer — card 3/3 accepted
YYYY-MM-DD HH:MM backend-lead subagent-spawn test-writer — <module>
YYYY-MM-DD HH:MM backend-lead subagent-return test-writer — complete
YYYY-MM-DD HH:MM backend-lead tests-running — <N> passing
YYYY-MM-DD HH:MM backend-lead review-running — code-reviewer on changed files
YYYY-MM-DD HH:MM backend-lead subagent-return code-reviewer — no must-fix findings
YYYY-MM-DD HH:MM backend-lead implement-complete — all tests green
YYYY-MM-DD HH:MM backend-lead sign-off-requested team-lead — phase 5 complete
```

### T2 event sequence (fast-track — no phase 1–4)

```
YYYY-MM-DD HH:MM team-lead lead-activated backend-lead — bugfix: <description>
YYYY-MM-DD HH:MM backend-lead activated — bugfix <description>
YYYY-MM-DD HH:MM backend-lead implement-started — <fix>
YYYY-MM-DD HH:MM backend-lead subagent-spawn code-writer — card 1/1 <fix>
YYYY-MM-DD HH:MM backend-lead subagent-return code-writer — card 1/1 accepted
YYYY-MM-DD HH:MM backend-lead review-running — code-reviewer on changed files
YYYY-MM-DD HH:MM backend-lead subagent-return code-reviewer — approved
YYYY-MM-DD HH:MM backend-lead implement-complete — fix verified
YYYY-MM-DD HH:MM backend-lead sign-off-requested team-lead — T2 complete
YYYY-MM-DD HH:MM team-lead sign-off-received backend-lead — approved
YYYY-MM-DD HH:MM team-lead commit — <hash> <fix subject>
```

### T3 event sequence (ultra fast-track — team-lead spawns code-writer directly)

```
YYYY-MM-DD HH:MM team-lead subagent-spawn code-writer — <chore>
YYYY-MM-DD HH:MM team-lead subagent-return code-writer — complete
YYYY-MM-DD HH:MM team-lead subagent-spawn code-reviewer — verify chore
YYYY-MM-DD HH:MM team-lead subagent-return code-reviewer — approved
YYYY-MM-DD HH:MM team-lead commit — <hash> <chore subject>
```
