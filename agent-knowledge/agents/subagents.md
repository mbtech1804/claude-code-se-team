# Subagents — setup & behavior

The worker pool the leads spawn (plus `memory-keeper`, spawned by the session-lifecycle skills). Read-only checkers verify; writers produce.

> **Logging.** Spawn and return land in `state/events.jsonl` automatically (`subagent.start` /
> `subagent.stop` hooks, with `agent_type`). The spawning lead still writes the `subagent-spawn` /
> `subagent-return` line in `ACTIVITY.md` (template § Activity logging); subagents don't self-log.
> Semantic events are not asked of the leads (`workflow/observability.md` § The lead convention).

> **Deployable source.** This file is the *know-how* (roster + why). The deployable
> `.claude/agents/*.md` definitions — the nine workers and the four leads — live as verbatim
> templates in `new-code-project-setup/templates/agents/` and are all copied into a new project at
> init (why the leads too: `agents/team-lead.md` § Option B). Change a subagent's behavior or
> `tools:` there — never in a project copy (that's drift). Leads: `workflow/governance.md` § Real
> spawns for leads + subagents and
> the per-lead know-how in `agents/*-lead.md`.

## The roster

| Subagent | Read/write | Purpose | When |
|---|---|---|---|
| `code-writer` | write | Implements one step from a task card (goal · files · interface · acceptance · not in scope). | Phase 5 IMPLEMENT — every step, one writer at a time; T3 chores (direct from Team Lead). |
| `code-reviewer` | read-only | Reviews a change against CLAUDE.md § Code rules. | Before any merge, every tier. MUST-FIX gates the merge. |
| `test-writer` | write | Unit / integration / e2e tests for a module. | Phase 5 IMPLEMENT. |
| `phase-gate-checker` | read-only | Mechanically verifies a phase's exit criteria. | Every T1 phase transition. |
| `constraint-checker` | read-only | Verifies an approach against CLAUDE.md + codebase. | EXPLORE + CONVERGE. |
| `prior-art-researcher` | read-only | Researches how similar problems were solved. | EXPLORE. |
| `memory-keeper` | read-only | Cross-checks state/plan claims against git + files; returns a drift report with proposed fixes (never writes). | Session start (`/start-session`) + checkpoint. Spawned by the meta-skill layer, not a lead. |
| `debugger` | read-only | Reproduces a failure, finds the root cause, hands a fix brief to `code-writer` (never edits). | **Specialist, trigger:** the cause is still unclear after a first look, or a fix attempt has failed. From a lead or the team-lead. A bug whose cause is already known goes straight to `code-writer`. |
| `security-auditor` | read-only | Deep security pass (secrets, authz, injection, crypto, deps); proposes fixes, never edits. | **Specialist, mandatory on its trigger (every security change is audited):** the change touches login/auth, sessions or tokens, passwords, permissions, secrets, crypto, or input at a trust boundary → once per task before sign-off, next to the `code-reviewer`; CRITICAL/HIGH block the sign-off, then one re-check of the fixed points only. Recommended on other T1 and dependency changes. |

> **Specialists.** `debugger`, `security-auditor` and the `design-lead` are not
> part of every task; each is called on a named trigger, which sits in its def and in the hierarchy
> (`templates/universal/agent-hierarchy.md`; `design-lead`: `agents/design-lead.md`). Why: in the
> test run `debugger` and `design-lead` each added something the lead had not, yet neither was
> called unprompted. A role without a trigger is not thought of, and a role that is never called
> gets cut as "ceremony".

> **Model.** Set in each def's frontmatter: the read-only scouts `constraint-checker` and
> `memory-keeper` run `haiku`, all others `sonnet`. Why, and the note on re-running the eval when
> the aliases move: `workflow/tiers.md` § Model per tier. Haiku for the two scouts passed an A/B
> eval against Sonnet.

## What works

- **Read-only checkers are mechanical, not vibes.** `phase-gate-checker` verifies
  *evidence*: files exist, journal entries written, blockers resolved. It returns
  `PASS` or `FAIL: [gaps]`. This removed subjective "looks done to me" transitions.
- **`code-reviewer` runs on every tier, even T3.** It's the one gate that never gets
  skipped. MUST-FIX blocks merge; SHOULD-FIX is fixed or explicitly deferred to backlog.
- **A precise brief is the writer's contract.** A vague brief is itself a rule violation —
  the lead pushes back and gets specificity before spawning `code-writer`. Garbage brief →
  garbage code.
- **`prior-art-researcher` before inventing.** Cheap to check how it's been solved; saves
  re-deriving a known pattern.
- **`memory-keeper` proposes, the caller applies.** Read-only like the other checkers, but its
  consumer is the session-lifecycle skills, not a lead. It flags a stale `STATUS`/`BACKLOG`
  *before* you build on it; the skill that spawned it owns the write. git/code is the truth.
- **Brief read-only auditors with the "already accepted" list.** When spawning
  `security-auditor`/`code-reviewer` for a review pass, explicitly name known-and-already-accepted
  risks in the brief (e.g. a documented `npm audit` exception from a prior session). Otherwise the
  subagent burns budget re-deriving or re-flagging a decision that was already made, and the report
  reads like a false alarm where there isn't one. Seen in a `/review-all` R3 pass — the
  security-auditor was told upfront that the npm-audit backlog was an accepted risk and correctly
  excluded it from its findings instead of re-flagging it.

## Failure modes seen

- **Spawning `code-writer` on a fuzzy brief.** Produces plausible-but-wrong code that
  costs more to review than to rewrite. Fix: brief must name files, scope, and acceptance.
- **Treating the gate-checker as advisory.** Its `FAIL` is binding on a T1; the only way past it
  is the recorded waiver after the gate cap (`agents/team-lead.md` § Role boundaries).
- **Mocking internal modules in tests.** `test-writer` mocks only at boundaries (network,
  FS, time, randomness). Mocking internal modules is a smell.
- **A mocked seam that nothing tests directly.** Mocking at the boundary is right, but then the
  boundary module needs tests of its own. In one project every hook test mocked the API client and
  the client's own tests covered only the error cases, so the single function that builds the list
  query was unreachable from the suite: 74 green tests said nothing about an inverted filter in
  it. When a module is mocked everywhere, `test-writer` checks that its real behaviour is pinned
  somewhere, one case per input value.
- **`test-writer` mutation probes are writes to production code — so they run in a copy.** A probe
  breaks the code under test, watches the new test fail and restores the code; it proves the test
  catches the change. In the repo it has two risks: a run cut off between break and restore (the
  limit stops all running agents together, `anti-patterns.md` #37) leaves broken code nobody
  reported, and in auto mode the classifier denies the test run right after a probe `Edit` to
  production code (in one trial 3 of 3 runs were denied; the probe proved nothing and no report said
  so). In a copy outside the project neither happens: in the same task the `backend-lead` probed that
  way, 10 mutants plus 1 by the `test-writer`, no denial, and the repo never held broken code.
  **Rule** (`test-writer` def; the `backend-`/`frontend-lead` accept no return without the
  `Mutation probes:` block): only the `test-writer` probes, only in a copy, and a run denied anyway
  is reported as "not checked (test run refused)", never moved back into the repo
  (`anti-patterns.md` #28). **For counting:** a `test-writer` write to a non-test file is first a
  probe — check the net effect with git, not the write count.
- **Who writes the code follows the wording of the def and the cost of the brief, not the role
  name.** Everyday use over seven projects across three months: `code-writer` and `test-writer` were
  spawned on four days and then never again, and the main session wrote the code itself
  against its own hard boundary. A watched test run: `frontend-lead` plus `backend-lead` wrote
  108 code edits themselves against 16 by `code-writer` — allowed by their defs then ("write code
  directly for scoped work, or delegate substantial chunks"), but **inverted**: the substantial work
  by the leads, the small jobs whose change the lead had already designed to `code-writer`.
  Reading (one run, not an experiment): where the def leaves no choice ("tests go to
  `test-writer`") delegation happened every time, even with long briefs; where it offers a choice,
  the lead takes the branch that needs no brief. A code brief has to be composed from context the
  delegator already holds and is cheap only once the change is designed (cost curve:
  `workflow/tiers.md` § Tuning notes). A mechanical block on the lead's writes, on its own, leaves
  that cost where it is, and the pressure finds another way out.
  **Decided:** remove the choice and make the brief cheap in the same move — the lead
  plans and hands each step to `code-writer` as a task card, and that card is the brief (rule: the
  lead defs and `agent-hierarchy.md`). A `PreToolUse` reminder, not a block, holds the lead's own
  edits to small corrections (`workflow/observability.md` § Trigger hooks), because on a day when
  `code-writer` cannot be spawned a block stops the work. **Measured:** four small T2/T3 tasks:
  3 of 3 lead runs by task card, lead code writes 1 + 0 against 22 by `code-writer`;
  the team-lead took 83 % of all tokens, mostly its own checking in the browser — when the limit is
  tight, look there first, not at the spawns. The first T1: lead code writes 1 + 1
  against 38 by `code-writer` (87 by the leads in the test run's T1); 5 of 11 cards carried all five
  fields, and the writer coped. **Fallback** if the session limit bites too early: the lead writes,
  `code-writer` takes parallel or pre-specified chunks.

## Setting up

`/new-code-project-setup` copies all thirteen defs at init (step 3). The project's `CLAUDE.md` wires
`code-reviewer` as the gate on every tier and `phase-gate-checker` on T1 transitions; the event log
runs wherever `state/` exists. `debugger` and `security-auditor` passed their evals (2 of 2
scenarios each, negative-control-validated).
