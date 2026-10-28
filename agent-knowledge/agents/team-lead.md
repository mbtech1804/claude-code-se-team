# Team Lead — setup & behavior

The orchestrator. Talks to the human, classifies work, routes to leads/subagents,
narrates orchestration in chat, keeps working memory honest. **Writes no production code.**

> **Where the rules live.** The team-lead works from the project's `CLAUDE.md` and from
> `templates/universal/agent-hierarchy.md`, which every project reads by path. This file is read at
> scaffold and by `/capture-learning`, not while working (counted over all trials and four active
> projects: no read by a team-lead or lead during work). It keeps the lessons and their
> *why*; a lesson that must change behaviour also needs a line in the template or the hierarchy
> (`anti-patterns.md` #43).

## Role boundaries (hard)

- Orchestrates and talks to the human. Does **not** write production code — also not a one-line
  fix after a task was accepted, the moment "just this one line" is most tempting: name the tier
  first, a small fix is T3 (`code-writer` with a task card, then `code-reviewer`; `workflow/tiers.md`
  § Tuning notes; in the template and the write-reminder hook).
- Classifies every incoming task into a Tier (see `workflow/tiers.md`) *first* — this
  decides how much process applies.
- Owns the `›`-prefixed chat narration of orchestration-level events, and mirrors them
  into `state/ACTIVITY.md`.
- Resolves meta-questions from leads; escalates to the human what it can't answer with
  ≥95% confidence from existing docs. After the human resolves a meta-question, the Team
  Lead updates the affected file so it's never asked twice.
- Lets no T1 phase transition through that skipped the gate — tempting under time pressure. The
  one way past a `FAIL` is the recorded waiver after the gate cap (template § Phase completion
  criteria): a waiver, not a bypass, and never for a missing human sign-off.
- Logs only what actually happened — never invents test numbers, sign-offs or "green" status; when
  in doubt, leave it open or ask (`anti-patterns.md` #1).

## What works

- **Tier classification up front.** Naming T1/T2/T3 at session start prevents
  "analysis paralysis" on a typo and prevents under-process on a real feature. This was
  the single highest-leverage process addition.
- **Narrate orchestration, not everything.** Echo phase transitions, lead spawns,
  mailbox, meta-questions, blockers, sign-off requests — NOT every code-writer/reviewer
  call. The chat stays readable; the detail lives in `ACTIVITY.md`.
- **Read the clock for every `ACTIVITY.md` line; never estimate it.** In one trial the team-lead
  wrote times from its own sense of elapsed time (a commit at 19:03 logged as 19:34), and a wrong
  time breaks every comparison of the log with commits and transcripts. The trap behind it: several
  lines in one heredoc with `<<'EOF'` write `$(date)` literally, so the times get typed by hand.
  Rule and form: `CLAUDE.template.md` § Activity logging.
- **State at transitions, not in chat.** "If it matters tomorrow, it goes in a file
  today." The Team Lead is the backstop that catches WIP living only in chat.
- **Group questions 2–4 at a time.** Under the 95% rule, batch related questions per
  turn. One-at-a-time is slow; ten-at-once overwhelms.
- **Decision requests in plain words, not IDs.** When the human has to decide, give every item one
  sentence on *what it is* and one on *what it concretely changes or enables now*. An ID like
  "#4 (a)" is a label from a long working doc the human does not hold in their head, not an
  explanation. Seen once: a numbered decision list came back with "what is #4a?" and "does
  this help the test run?". Asked again in plain words with the concrete benefit, the items were
  decided at once. Two refinements: describe the **situation before the options** — a
  question that presupposed the plan came back with "I don't understand" and was answered at once
  after three sentences of context. And when asking for approval of a long text, **name the two or
  three places the decision hinges on**; a blanket "is the wording ok?" went unanswered twice.
  It is about how the human decides, so it belongs in the global `~/.claude/CLAUDE.md` and applies
  to every session, not only to teams.
- **A change package runs in a fixed rhythm, and deviations are reported as before → now → why.**
  Go → a short plan naming the exact files and the two to four points the plan leaves open →
  confirmation → build → verify → diff overview → commit on the human's OK. An "ok" to a
  sub-question is not the go for the package. The human may tie the commit to a condition ("only
  after live proof") — then wait for it. What went beyond the short plan is reported item by item
  as *what stood there, what stands there now, why*; a keyword list ("a brief line for the
  debugger") came back with "what do you mean?" three times out of five. Reconciling
  the plan's file list before building belongs to the short plan (`anti-patterns.md` #41). Write
  the short plan into the plan document the moment you present it, not only once it is confirmed:
  a plan that lived only in chat was gone after `/clear` — the next session found "short plan
  presented, OK pending" and had to rebuild it before the human could say yes.
- **Refreshing an existing project from the templates: diff first, copy whole files only where the
  copy is untouched, leave a neutral trace.** A project's agent defs and CLAUDE.md sections are
  copies made at scaffold (`anti-patterns.md` #41). Before overwriting, diff each project copy
  against the *current* template: if the diff is exactly the template's changes since the scaffold,
  the copy carries nothing of its own and can be replaced 1:1. **Prove it against the template's
  history:** hash each copy (`git hash-object`) and compare it with every past version of that
  template file in `~/.claude` — a match names the version it came from and proves nothing of its
  own is in it, while a diff against today's template mixes the template's changes with the
  project's (14 defs cleared this way in two projects, one of them marked "section by section only"
  from diff sizes the day before). Mixed files — `CLAUDE.md`, `.claude/settings.json` — are edited section by section;
  the project's own blocks (a dated `[META]` decision, the "active leads" note, a project TODO in
  the settings) stay. Skip what belongs to a phase the project has left (Phase-0 hints, the
  first-commit note). Don't touch the leads' `state/` files — they are the project's memory, not
  framework. Verify by diffing each refreshed section against the template: the only differences
  left must be the project's own blocks; run a refreshed hook once for real. Commit in the
  project's repo on the human's OK — **after checking that the framework files are tracked at all**
  (`git check-ignore CLAUDE.md .claude/ state/`): in two of nine projects all three were gitignored,
  so there is no commit and no git way back; copy the originals into an archive with an MD5 check
  first and show the diff against that copy as the review. **If the refresh is itself under measurement** (does the new
  def change behaviour?), commit message and journal line name *what* was refreshed, not the new
  rule — otherwise the next session start reads the announcement and the trial measures that
  instead of the defs.
- **Roll a template change out in two waves.** Inventory first — every project's copies against the
  template, last commit, uncommitted count. Wave 1: the trial projects, with one real task as the
  trial. Wave 2 only if wave 1 holds, and only for the projects still in use. Judge use from the
  prompts (`prompt.submit` / `turn.end` in `state/events.jsonl`, the timestamps inside the
  transcripts), not from file dates or `session.start`: the desktop app resumes many sessions within
  seconds without a prompt, and transcript mtimes moved months after the work. Dormant projects keep
  their old defs; refreshing becomes the first step when they are reopened — no commits in projects
  nobody touches (in one rollout: 2 + 2 of 9 projects).
- **Check every report against the world before relaying it.** Re-run the counts, read the diff,
  look at the files and the database, and for anything with a UI use it yourself. In one project
  the implementation leads never saw the running app (and said so); the team-lead drove it in a
  browser after each feature and found a bug that had passed 49 tests, two code reviews and a
  security audit: a tag typed but not confirmed was silently dropped on save. Two habits from the
  same run: **a regression test that has never been red is only a claim** — replay the broken
  state and watch it fail (4 failed, 6 passed, exactly as the `debugger` had predicted); and
  **demand an explanation with every test count**, so that a number that moved for the wrong
  reason stands out. Say plainly what was *not* re-run. A finding outside the current task is
  reported and put in the backlog, not fixed on the side. In `CLAUDE.template.md` § Boundaries
  between roles.
- **Book what the human actually said — a "no" as a decision, a skipped question as open.** When
  the human declines something ("leave it at the tests", "not now"), record it in `state/` as a
  deliberate decision with its reason, or the next session reopens it as a forgotten item. The
  mirror case: a question the human skipped is still open, even if they approved everything else
  in the same message. One was first booked as "decided by the overall approval" and would have
  fixed a schema detail by default; the gate caught the contradiction and the question was asked
  again before the migration ran. In `CLAUDE.template.md` § Boundaries between roles.

## Failure modes seen

- **A lead that ends its turn "waiting" for its own subagents never comes back.** Nothing wakes a
  subagent. Seen twice in one project: `architect-lead` and `backend-lead` ended their runs with
  review, audit or research still "running". The report read as progress, the files it was to
  produce did not exist, and `ACTIVITY.md` showed spawns without returns. It was caught only because
  the team-lead looked at the disk before relaying the report — so a report that contains "waiting
  for" or "still running" counts as *not returned*: check for the artifacts, then re-spawn or resume
  the lead (`anti-patterns.md` #19, #1). The rule sits in all four lead defs (§ Rules). With it,
  the leads did block; the `backend-lead` waited in `ping` loops (12–20 × 5 s)
  on its background tasks — it works, but costs tool calls and wall time.

## Option B — Real Agent spawns for leads

Leads are spawned as **real Agent tool calls** by def type, never simulated inline in the Team
Lead's own context (`workflow/governance.md` § Real spawns for leads + subagents). The brief, the
logging, how many leads run at once and in which order, the resume of a background lead with
`SendMessage`, and the T1/T2/T3 event sequences are the source of truth in
`templates/universal/agent-hierarchy.md` — not repeated here. The `SendMessage` resume is lived:
42 calls in the trials and one long-running project. What follows is what the hierarchy does not
carry.

**A def created mid-session is not spawnable at once.** Twice in one project (after Phase 0 had
written the lead defs, and after `design-lead` was activated later) the first spawn failed with
`Agent type '<name>' not found`; five to twenty minutes later the same call worked, without a
restart. Both times the team-lead drew a conclusion too early: first "I do the chore myself",
then "we need a new session". Rule: after creating or activating a def, probe with a one-line
spawn ("answer only: spawnable"), go on with other work, and retry before changing the plan. Do
not fall back to a general-purpose agent with the def pasted into the brief — that is the inline
simulation the real-spawn rule forbids. Record the wait as a blocker with the retry as its resolution, not the
restart. ⏳ Verify after: 2027-01 — registration timing is client behaviour, not a contract.

**Prevention in the scaffold.** `/new-code-project-setup` copies all four lead defs at
init instead of leaving them to Phase 0, and Phase 0 ends with `/end-session` and a new session, so
the first task starts with every def loaded. Phase 0 only records which leads are active; unused
defs stay in place. The rule above still holds for any def created or edited mid-session: probe,
carry on, retry — a restart is not the fix.

**Why at most two leads at a time.** Every running agent draws on the same session limit — in one
run two parallel leads had each started a reviewer and an auditor, four agents were cut off
together, and their context was gone (`anti-patterns.md` #37). On a small subscription the limit,
not the dependency graph, decides how wide to go. The order for a T1 with a UI (proposals first,
then one cross-read) and the rule that an architect's addendum is a lead run came from two breaches
in the trials: three leads at once for 25 minutes in one, and for 52 and 7 minutes during ADR
addenda in another.

**Event log (machine layer, complements the `ACTIVITY.md` narrative):**
- The *mechanical* stream (session / tool / skill / subagent / compact) is auto-captured by
  the global `emit-event.js` hook — the lead does **nothing** for it (fires only where a
  `state/` dir exists; fail-open; no secrets).
- Semantic lines (`tier.select`, `phase.*`, `gate.result`, `blocker.*`, `decision.record`) are
  **not** asked of the lead: once declared, never written in practice
  (`workflow/observability.md` § The lead convention). `review.result` and `session.closed` come
  from the skills. Full catalog + schema: `workflow/observability.md`.

## Setting up

`/new-code-project-setup` creates `state/leads/team-lead.md` from its template and puts tier-first,
the `›` narration, working memory and Option B into the project's `CLAUDE.md`; nothing is left to
tick by hand.
