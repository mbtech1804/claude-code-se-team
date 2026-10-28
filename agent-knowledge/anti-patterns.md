# Anti-patterns

Things that bit the team. Each entry: what went wrong, why, and the rule that prevents a
repeat. This is the single source of truth for "don't do that again" — other files
cross-reference here instead of re-stating.

> **Gaps in the numbering are deliberate.** This publication keeps only the entries about the
> software-engineering team. Entries from other kinds of work (data and LLM pipelines, research,
> game modding, personal tooling) are left out; their numbers are not reused, so `#N` references in
> templates, defs and skills stay stable.

## Scope tags — read before seeding

Every entry carries a **`Scope:`** tag so the setup skill knows what to seed and what to
leave out. Without this, a new Go web app would inherit lessons from a Python data stack it will
never use.

- **`universal`** — applies to every project regardless of stack (process, team, state,
  git, security baseline). `/new-code-project-setup` seeds **only these** by default.
- **`platform:<os>`** — OS-specific (e.g. `platform:windows`). Seeded only when the new
  project's OS matches.
- **`stack:<name>`** — tech-stack-specific (e.g. `stack:node`, `stack:react`,
  `stack:server-rendered-html`). **Not** seeded blindly — pulled in on demand when the project
  actually uses that stack.

Seeding rule for `/new-code-project-setup`: include `universal`, include `platform:` only
on a matching OS, skip all `stack:` entries unless the chosen stack matches.

---

## 1. Fabricating state

**Scope:** universal

**What:** Writing progress, sign-offs, "tests green", or test numbers into state files that
didn't actually happen this session.
**Why it's bad:** State files are the cold-start ground truth. A fabricated "Phase 4 signed
off" sends the next session down a wrong path that's expensive to unwind.
**Rule:** Anti-fabrication. Only log what actually happened. Test/lint numbers = last known
value from STATUS unless tests demonstrably ran this session. When in doubt, leave open or
ask. (`/checkpoint`, `/end-session` enforce this.)

**Special case — logging work under a role name nobody ever spawned.** `state/ACTIVITY.md` in
one project records `code-writer implement-complete …` and `debugger diagnosed root cause …`;
dated via the commits those lines cite, they fall into a session whose transcript shows **zero**
subagent spawns, and `debugger` was never spawned in any of seven projects. The role was **narrated, not executed** (see also `workflow/governance.md`
§ Failure modes, inline-simulation).

Unlike an invented test number, this variant is **mechanically checkable**: every role-attributed
line in `ACTIVITY.md` must have a matching `subagent.start` carrying that `agent_type` in
`state/events.jsonl`. No matching spawn event → the attribution is fabricated. It is a cheap
check, and per #24 a rule nothing checks is a rule that will not hold. **Not built as a standing
check:** only the script that measured the trials compares the two.

**Instance (a research project):** not a state file, but the same mechanism in a design
doc. A summary line under an 82-row role table gave the split as "31 / 27 / 14", written from
impression; counting the rows gave 35 / 31 / 16. **A count that sits next to its own table is
computed from the table** (grep or a short script), never recalled. A cross-check of the same
appendix also found three skills that the documents referenced but the skill list did not contain.

**Second instance (an analysis project):** a chat summary gave "about 18,000 log lines"
where the four counts on screen summed to 15,951; and while editing, a date ("since 2026-07-03")
went into a knowledge-base file without a source — noticed and removed in the same turn. Both were
re-typed from impression next to a computed value. **A number or date in a summary is copied from
the output that produced it, or left out.**

---

## 2. Referencing a skill/file that doesn't exist

**Scope:** universal

**What:** CLAUDE.md referenced `/end-session` before the SKILL.md was ever created.
**Why it's bad:** The procedure looks installed but silently does nothing when triggered.
**Rule:** Referencing ≠ implementing. When you register a skill in CLAUDE.md, verify the
SKILL.md file actually exists. `/new-code-project-setup` only registers skills it creates.

---

## 3. Wrong shell syntax for the execution context

**Scope:** universal (the rule); examples are `platform:windows`

**What:** Using the wrong shell's syntax for where the command actually runs. On Windows three
contexts get conflated: **(a)** the Bash tool (Git Bash), **(b)** the PowerShell tool (Windows
PowerShell 5.1) and **(c)** `settings.json` command hooks (a bash-compatible runner — Git Bash).
**Why it's bad:** A Unix one-liner (`date +%H:%M`, `&&` chains) sent to PowerShell 5.1 fails;
equally, a PowerShell hook string fails in the bash-based hook runner. Both misbehave
silently and are hard to spot.
**Rule:** Match the syntax to the shell that executes the command — **not "PowerShell
everywhere"**, and not "never Unix" either. Bash tool → bash; PowerShell tool → PowerShell 5.1
(no `&&`, no `?:`); `settings.json` hook string → bash (`case`, `[ -f ]`, `2>/dev/null`,
`|| true`). The project template relies on bash in the Bash tool: the `ACTIVITY.md` line with
`$(date …)`, and `log-event.js` with single-quoted JSON, which PowerShell 5.1 mangles. Prefer
dedicated tools (Read/Write/Edit/Grep/Glob) over shelling out where possible. (Full treatment + the
proven graphify hook example: `tooling/settings-json.md`. Windows graphify binary quirk:
`tooling/graphify.md`.)

**Instance:** an inline `python -c "…"` inside a double-quoted bash command breaks the
moment the Python contains `'''` or backticks — the outer shell parses them first, and the error
(`unterminated triple-quoted string`) points at Python rather than at the quoting. Write the script
to a file with a **quoted heredoc** (`cat > x.py <<'PY'`) and run the file.

---

## 4. Stack-hardcoded "universal" skills

**Scope:** universal

**What:** `/review-all` hardcoded "Expo + NestJS" commands and paths.
**Why it's bad:** Breaks the moment it's run on any other stack; not actually reusable.
**Rule:** A universal skill reads the stack from CLAUDE.md and adapts. No framework names
baked into a skill meant to be portable. (See `workflow/skills.md`.)

---

## 5. Skipping the phase gate "just this once"

**Scope:** universal

**What:** Announcing a phase transition on T1 work without running `phase-gate-checker`,
with "we'll clean it up later".
**Why it's bad:** Phases stop being real; half-done work flows into the next phase and
compounds.
**Rule:** On T1, the gate is mandatory and mechanical. The Team Lead ignores any transition
that skips it without a valid T2/T3 fast-track. "Later" is a FAIL. (See `workflow/phases.md`.)

---

## 6. WIP living only in chat

**Scope:** universal

**What:** Decisions, next steps, and findings discussed in chat but never written to
`/state/`.
**Why it's bad:** `/clear` or a context overflow erases it. The next session starts blind.
**Rule:** "If it matters tomorrow, it goes in a file today." State at transitions, not in
chat. `/end-session` before every `/clear`.

---

## 7. Vague brief to code-writer

**Scope:** universal

**What:** Spawning `code-writer` with a fuzzy, unscoped brief.
**Why it's bad:** Produces plausible-but-wrong code that costs more to review than to
rewrite.
**Rule:** A vague brief is itself a violation. The lead pushes back for specificity (files,
scope, acceptance) before spawning. (See `agents/subagents.md`.)

---

## 8. Secrets in code or logs

**Scope:** universal

**What:** Hardcoded secrets in application code, or tokens/passwords/PII in logs.
**Why it's bad:** Security exposure; leaks survive in history and log aggregators.
**Rule:** Secrets via env vars only; `.env` never committed; `.env.example` present. Logs
never contain secrets/PII. The *only* scoped exception: hardcoded **seed** values in a
private app's seed scripts, each with a `// why:` comment — never in `src/`. (See
`agents/backend-lead.md`.)

---

## 9. Formatter race after Write/Edit

**Scope:** universal

**What:** A PostToolUse formatter reformats a file right after a Write/Edit; a follow-up
Edit then targets a now-stale region with an old `old_string`.
**Why it's bad:** The dependent edit fails or corrupts.
**Rule:** If a formatter may have touched the file, Read it before the dependent edit. (See
`tooling/git-hooks.md`.)

---

## 10. Tier inflation / deflation

**Scope:** universal

**What:** Running full 5-phase machinery on a typo (inflation), or treating a schema change
as a quick patch (deflation).
**Why it's bad:** Inflation burns time/tokens; deflation skips the sign-off that protects
data integrity.
**Rule:** Classify honestly. Unsure between two tiers → pick the higher one or ask. Schema
or architecture change → always T1. (See `workflow/tiers.md`.)

---

## 11. CI code-gen step after tsc

**Scope:** stack:ci-codegen (Prisma, protobuf, openapi-generator, graphql-codegen, …)

**What:** Running `npx tsc --noEmit` before `npx prisma generate` (or any other code-gen
step) in CI — the generated `@prisma/client` types don't exist yet, causing ~100 phantom
TypeScript errors like `Property 'X' does not exist on type 'PrismaService'` and
`Module '"@prisma/client"' has no exported member 'PrismaClient'`.
**Why it's bad:** Fails the CI TypeScript check despite the code itself being correct.
Root cause is invisible — the errors look like real type bugs.
**Rule:** In any CI pipeline that uses code-gen (Prisma, protobuf, openapi-generator,
graphql-codegen, etc.), run the generate step **before** the TypeScript check. The safe
order: `install` → `generate` → `tsc` → `lint` → `tests`.

---

## 14. npm lockfile drift causing `npm ci` failure in CI

**Scope:** stack:node

**What:** `npm ci` fails with "does not satisfy" / "Missing" errors when `package-lock.json`
is out of sync with `package.json`. Happens silently when a framework (e.g. Expo, Next.js)
releases minor-patch updates between commits — the lockfile was generated at an older version.
**Why it's bad:** CI breaks at the dependency install step, not in user code. The error lists
package versions and resembles a real dependency conflict, hiding the actual cause (stale
lockfile). Time is spent debugging the wrong thing.
**Rule:** When `npm ci` fails with version-mismatch errors in CI, run `npm install` (not
`npm ci`) locally in the affected package, then commit the updated `package-lock.json`. Never
touch the lockfile in CI — `npm ci` is strict by design. For projects with rapidly-updating
frameworks, regenerate and commit the lockfile after any `npm install` that changes transitive
versions, especially after bumping framework versions locally.

---

## 17. Staging/mirror bundle drifting from the live source

**Scope:** universal

**What:** Keeping a second copy of a system — a setup bundle, a vendored template tree, a
"deployable" snapshot — next to the live source it was cut from, then editing only the live
one. The copy silently goes stale. Observed: a `codeSetupTemplate/` snapshot of the
knowledge base sat at 16 files while live had grown to 20, and every file it *did* contain
predated the latest edits.

**Why it's bad:** Two sources of truth where there should be one. The stale copy still looks
authoritative ("the deployable bundle"), but a re-deploy *from* it silently reverts the live
system and loses everything the live source gained since the fork. The damage is invisible
until someone trusts the wrong copy.

**Rule:** Pick one source of truth — the live location — and treat any mirror as a derived
artifact, not a peer. If a mirror must exist (portable backup, offline bundle), give it an
explicit sync discipline: a "re-sync from live before use" note where it's seen, a
last-synced stamp, and no manual edits to the mirror. A mirror with no sync discipline and
no clear owner should be deleted, not left to rot into a lie.

**Inside the knowledge base itself.** A review found every list or number that a file
had copied from its source out of date: tools per role (`workflow/governance.md` named two writers;
the lead defs carry `Write`/`Edit`/`Bash`), subagents per phase (`security-auditor` and `debugger`
missing), the hook test count (57 against 84), the template's length (226 against 258). **Rule:**
name the source (the def, the test's output, the template) instead of copying its list or count.

---

## 18. Prettier one-liner expansion breaks `eslint-disable-next-line`

**Scope:** stack:react

**What:** When Prettier auto-reformats a one-liner callback to multi-line, a
`// eslint-disable-next-line` comment placed *before* the outer call no longer
suppresses the rule violation inside the callback body — it now targets the outer
call line instead.

Before (one-liner, disable works):
```ts
// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => { setIsHydrated(true); }, []);
```

After Prettier reformats (disable targets wrong line):
```ts
// eslint-disable-next-line react-hooks/set-state-in-effect  ← targets useEffect(), not the inner call
useEffect(() => {
  setIsHydrated(true);  ← violation still fires here
}, []);
```

**Why it's bad:** A Prettier run that looks purely cosmetic breaks the ESLint/CI lint
step. The root cause is invisible — the code is the same, only indentation changed.

**Rule:** Place `eslint-disable-next-line` comments *inside* the callback body,
directly above the flagged statement — never outside the block that wraps it:

```ts
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setIsHydrated(true);
}, []);
```

General form: the disable comment must be on the line *directly before* the flagged
statement, inside the same syntactic scope. If there's a `() => { ... }` or any
block boundary between the comment and the violation, the comment is in the wrong scope.

---

## 19. Self-graded "done" — synthetic evidence mistaken for validation

**Scope:** universal

**What:** Declaring something "built & tested" on the strength of evidence you constructed
yourself — hand-written fixtures that encode your own assumptions, a schema recalled from
memory, a green check you awarded — without grading it against the source of truth (the real
API docs, the real files, a real run). Observed once: an event emitter and its consumer were
marked "built/tested" after synthetic unit/integration tests. A critical re-audit against the
live docs and the actual code then surfaced a real bug (a subagent `SessionStart` would
truncate the graph) and a scale trap (the whole event file was re-read on every 2 s poll) —
both invisible to the synthetic tests.

**Why it's bad:** Synthetic tests confirm the code does what you *assumed*, not what's *true*.
They pass precisely because the fixture encodes the same assumption as the code, so a wrong
assumption stays invisible. "Tested" then overstates the strength of the evidence, and the next
session (or a rollout) inherits latent defects under a false green light.

**Rule:** Separate the tiers of verification and state them honestly in status: *self-checked*
< *synthetic/unit-tested* < *integration-tested* < *live-validated against the real
dependency*. Never let a lower tier wear a higher tier's label ("synthetic ≠ live"). After you
declare something done, run one critical pass that grades against ground truth — the real
docs/spec, the real files, a real run — not against your own summary. Verify the behavior/math,
not just the verdict. (Distinct from #1: there the evidence is *fabricated*; here it is *real
but self-referential and over-labelled*.)

---

## 20. Scaffolder inlines the full source of truth (born-fat generated files)

**Scope:** universal

**What:** A scaffolder that renders each output file by inlining the *full* canonical source.
`new-code-project-setup` substituted the entire `principles` / `code-rules` / `agent-hierarchy`
docs into every generated `CLAUDE.md` via `{{UNIVERSAL_*}}` placeholders. The template measured
188 lines (with placeholders), but a *rendered* `CLAUDE.md` was ~620 — born over-length,
immediately needing the same diet that was hand-applied to older projects. Fixed since: the
template carries condensed cores + pointers (`workflow/governance.md` § Context-window economy).

**Why it's bad:** A generated project file is *derived output*; inlining the full source defeats
the "rules + pointers" norm at birth, so every new project starts in drift and carries a
frozen snapshot of the source of truth that can itself go stale (cf. #17). The template's own line
count hides it — you must measure the *rendered* artifact, not the template-with-placeholders.

**Rule:** Scaffolders render a **condensed core + a pointer to the canonical source of truth**,
never the full inline. Hold generated project files to the same size/diet norm as hand-written
ones, and measure the *rendered* output. To change a shared core, edit the canonical file — not
each generated copy. (Cross-ref: #17 mirror-drift; `workflow/governance.md` § Context-window economy.)

---

## 21. Trusting a live test against a stale (no-hot-reload) server

**Scope:** universal

**What:** After editing backend source to fix a bug, running a live verification test against a
dev server that was started *before* the edit — the server keeps serving the old compiled code,
so the test result reflects the pre-fix behavior, not the fix. Happened twice in one session
(one project, during a `/review-all`): a CSV-team-name-whitelist fix that should reject an
unknown team name was instead silently accepted (`200`), and the stale code went on to write a
fabricated test row into a real table (`TableResult`) before the mismatch was even noticed.

**Why it's bad:** A stale-server false positive/negative doesn't just waste a test — for any
endpoint that writes data, it executes the *old* behavior against real state, leaving unintended
writes that then need manual cleanup (here: a targeted SQL `DELETE` on the exact row). The
failure is silent: the server responds normally, just with outdated logic, so nothing *looks*
wrong until the response contradicts what the fix is supposed to do.

**Rule:** Before trusting any live-verification result after a backend code edit, compare the
running server's start time (`preview_list`) against the file's last-modified time. If the
server predates the edit, restart it first — always, not just "when in doubt". This sharpens the
existing rule in `tooling/preview-mcp.md` ("requires explicit restart for backend code changes")
with the concrete cost of skipping it: a live test isn't just wrong, it can mutate real data
under a false result.

---

## 24. Declared but never enforced — a rule nothing checks

**Scope:** universal

**What:** A rule is decided properly, written down clearly, and never becomes practice, because
nothing verifies it. Three instances surfaced in a single session. One project's
CLAUDE.md declared "active leads: architect-lead + backend-lead" and, six lines later, that every
lead is spawned from a pinned `.claude/agents/*.md` def and never inline-simulated — **neither def
existed on disk**; the event log agreed (zero `Agent` calls in 4 sessions) and four earlier audits
had read past it. `LEARNING-LOG.md` was built, wired to a session type, and sat at its 4 seed
entries for eight weeks. The "locate-then-read" rule went into the source files; a month later the
measurement said it was not being followed (`Read` p90 = 153k characters in one call).

**Why it's bad:** Prose ages silently, and it ages *while looking correct*. A reader confirms the
documented half and never notices the unexecuted half — the tidiness of the note is exactly what
buys it trust. Worse, the declaration keeps paying interest: the roster looks staffed, the log looks
adopted, the rule looks in force, so nobody re-opens the question.

**Rule:** Every durable rule gets either a **cheap automated check** or an **explicit expiry date**.
Neither available → delete the declaration rather than carrying it as "open". The check does not
have to be clever: a 170-line drift-check script found in its first run what four prose
audits had missed. **Prose documents; only code checks.** (Distinct from #2, which is about a
reference being wrong at registration time; this is about behaviour drifting away from a
declaration that was true when written, or never made true at all.)

**The trigger half.** A check catches a broken rule afterwards,
but the rule also needs a *moment* that delivers it. Measured over seven projects: "re-read the
state files at session start" held in 7 of 7 cold starts without anyone typing `/start-session` —
it sits in the always-loaded CLAUDE.md and hangs on a moment that certainly occurs — and failed
after compactions (state re-read within 15 operations after only a third of them), because a
compaction is not a session start. Rules that waited for someone to remember them failed the same
way (the team-lead's no-code boundary, plan-before-build, `/end-session`); in the watched test run
every rule bound to a moment fired unasked. The one convention without a moment, the semantic
event line, was written zero times in 23 prompts — and still zero in four projects months later
(`workflow/observability.md` § The lead convention).

**Rule:** bind every rule to an event that happens anyway: the always-loaded file for the session
start, a hook event for everything else. Pick the event at which the rule can still be acted on:
`PreCompact` fires when the compaction is already under way, which is too late to ask for a
checkpoint. Built: `SessionStart` with source `compact` re-anchors after a compaction
(`reanchor.js`), and `PreToolUse` reminds before a code write (`write-reminder.js` — a reminder, not
a refusal); detail in `workflow/observability.md` § Trigger hooks. And give the hook something to
read: tier, phase and sign-offs kept as prose (6 of 7 projects; none of 42 sign-offs carries both a
date and what was approved) are invisible to any check. A new rule line in a CLAUDE.md is not a
repair.

---

## 27. New branch silently inherits the currently-checked-out branch's history

**Scope:** universal

**What:** Creating a new branch without first explicitly checking out `main` (or the correct target)
inherits the ancestor history of whatever branch happens to be currently checked out. In one
project, `fix/score-upsert-timeout` was branched while `docs/adr-versioning` was still checked out
(not `main`) — the fix branch silently carried the ADR-versioning changes along with it, including a
`.gitignore` change the human had explicitly deferred ("nein noch nicht"). The human merged the branch
before the coupling was noticed and corrected.

**Why it's bad:** The mistake is invisible on the new branch itself — `git log` there looks completely
normal, with no obvious sign anything is wrong. It only surfaces via `git diff --stat` against the
intended target. It silently overrides an explicit human decision about scope/sequencing that nobody
intended to override.

**Rule:** Before `git checkout -b <new-branch>` for any self-contained change, always `git checkout main`
(or the correct target branch) first — never branch off whatever happens to be currently checked out.
When in doubt whether this happened, `git diff --stat <target>...<new-branch>` before merging — it will
show any unintended extra files immediately.

---

## 28. Working around a blocked tool action instead of reporting the block

**Scope:** universal

**What:** After a tool action is denied by the harness's auto-mode classifier ("Blocked by classifier"),
attempting the same effect through a different tool or command instead of stopping. In one
project a direct `git merge --no-ff ... main` was blocked. The correct response — taken here — was
to verify the working tree was left unmodified, then report the block to the human with the exact
commands for them to run themselves, rather than searching for another way to force the merge through.

**Why it's bad:** The classifier is a deliberate safety gate for that specific class of action. Routing
around it via a different tool defeats the gate's purpose even when technically possible — the block
exists precisely to require human judgment or execution at that point.

**Rule:** Never route around a classifier-blocked action via a substitute tool or command. Verify no
unintended side effect occurred, report the block transparently, and hand the human the exact command(s)
to run themselves. A procedure the human changes after learning of the block is not a workaround — the
`test-writer`'s mutation probes moved to a throwaway copy that way (#42); an agent
that finds its own way around the block is.

---

## 30. Silent schema break in an append-only log

**Scope:** universal

**What:** An event name keeps being written after its meaning changed, with nothing in the file
marking the change. `subagent.stop` was emitted for main-session turn ends as well as for real
subagent stops until 2026-08-26; from 2026-08-28 the emitter discriminates and writes the former
as `turn.end`. Both eras sit unmarked in the same `state/events.jsonl`: **382 entries mean
something different from the 68 beside them.** Two separate analyses read the old rows as
subagent activity before the discrepancy (448 stops against 71 starts) gave it away.

**Why it's bad:** An append-only log is trusted precisely because it is never rewritten — so a
reader assumes one row means the same as the next. A fix in the emitter repairs the future and
**poisons the past**: every later query silently mixes two definitions, and the error is invisible
because the field names still validate. The tidier the log looks, the longer the mistake survives.

**Rule:** Treat an event log as a **data contract**. When an event's meaning changes, either
stamp a **schema version on every line** (cheapest at write time) or record a **dated cutoff**
where readers will see it — a comment in the emitter's source is not enough, because analysts
query the data, not the producer. Fixing the emitter is only half the repair; the other half is
letting the past be told apart from the present. Related: #17 (a copy that silently stops matching
its source), #24 (a rule nothing checks).

---

## 31. The wrong denominator

**Scope:** universal

**What:** Computing a rate against the count that is easy to obtain rather than the one the
question is about. "`/end-session` ran in 1 of 139 sessions" used **138 session IDs** — produced
by 131 `startup` + 106 `resume` + 35 `compact` events, most of which never received a single human
prompt. Only **15** were actual work sessions. The rate was off by a factor of ~9, and had already
motivated a fix for a problem that, at the true denominator, was not clearly there.

**Why it's bad:** A wrong denominator does not look like an error — it looks like a finding, and
usually a dramatic one, because the distortion tends to run in the "worse than reality" direction.
It then buys a decision: build the nudge, prune the roster, add the check. The numerator is
normally scrutinised; the denominator is inherited from whatever the instrument happened to count.

**Rule:** Before quoting any rate, **state what one unit of the denominator is** and verify that
definition against a second source (here: sessions containing at least one `prompt.submit`, plus
the state files' own closure lines). If the denominator was not chosen deliberately, the rate is
not evidence yet. Counterpart to the blind spot in #24: there data are *missing* and absence looks
like inactivity; here there are *too many* and activity looks rare.

---

## 37. Fan-out sized to the task, not to the plan limit

**Scope:** universal

**What:** Spawning as many parallel subagents as the task has subtopics, all on the session's
default (strongest) model. In a research project seven research subagents ran in parallel
on Opus; each grew to 250–500k tokens over 60–90 tool calls, and after about 20 minutes the
subscription's session limit cut off **all seven at once**, before any had handed back a report.
Three days later the same kind of work — three researchers pinned to `sonnet` plus one Opus report
writer — ran through without touching the limit.
A second instance eleven days earlier (a trial project): two leads running in parallel plus
their reviewer and auditor were cut off together on a Sonnet-pinned team; the lead then surveyed
the disk before resuming anyone and found the frontend further along than its last report.

**Why it's bad:** A subscription limit is shared by everything in the session, so a wide fan-out
fails as a unit and blocks the human until the reset. Whether the work survives is then luck: here
every agent happened to have written its notes file minutes before the cutoff.

**Rule:** (1) Size the fan-out to the plan, not to the decomposition: about three tool-heavy agents
at a time, pinned to `sonnet` via the spawn's `model` override; keep Opus for the single synthesis
step. (2) Tell every long-running agent to save a first complete version of its output file early
and refine it afterwards. (3) After a cutoff, inspect the artifacts on disk (headings and file
tails) before resuming anyone, and resume only agents whose artifact is incomplete — resuming seven
250–500k-token contexts would have burned the fresh window for reports that already existed.
Related: `workflow/tiers.md` § Model per tier (plan-limit headroom), #19 (check the artifact, not
the report).

> ⏳ Verify after: 2027-01 — the numbers (seven agents, 20 minutes) belong to the plan tier and
> model generation of 2026-09; the pattern does not.

---

## 38. Allocating work before asking what the budget is

**Scope:** universal

**What:** Recommending who does what (which model, which tool, how many agents) on an unstated
assumption about the human's resources. In a research project the concept recommended
"Claude builds everything, Codex only reviews", a lead on Opus and up to four concurrent agents.
Only when the human mentioned their plans in passing — the smallest paid tier on both sides — did
it turn out that neither subscription could carry that allocation. The
recommendation flipped (coding spread across both subscriptions, Sonnet as lead, two agents at a
time) and the concept needed a third version.

**Why it's bad:** The kickoff asked four scoping questions (basis, platform, roster, first
deliverable) but not the one constraint every later allocation depended on. The assumption was
invisible from the inside because the first recommendation was internally consistent; it surfaced
only through the human's remark, after two research rounds and two concept versions.

**Rule:** When a design allocates scarce resources (model tiers, parallel agents, subscription or
API quota, money, the human's review time), ask for the hard budget at kickoff, next to scope and
format, and write it into the document's constraints section. If a recommendation rests on an
assumed budget, say so in the recommendation itself. Related: #37 (a fan-out the budget could not
carry).

---

## 39. A number with only one instrument behind it

**Scope:** universal

**What:** A count enters a document on the strength of one measurement method, and the method's
blind spot becomes the finding. Three of nine such cases from one series of analyses:
**(a)** "Hooks fire only in the main session", because 5,657 logged `tool.use` events matched 5,670
main-session tool calls in the transcripts. One day reconciled item by item refuted it: 175 events
against 84 main-session plus 95 subagent calls. The totals had matched by coincidence.
**(b)** Main-session code writes, counted as 346 + 29, came out at 329 + 26 on a recount, because
the transcripts repeat tool-call entries (one project: 714 lines, 630 unique IDs). **(c)** A text
search for `"agent":"` found nothing, and "`tool.use` carries no agent attribution" went into the
notes; the field is an object and sat on 1,924 of 2,353 events. The other six (a Grep that skipped
three log files, spawn totals agreeing 55 ↔ 55 over two errors, lines counted *by* a role instead
of mentions, `len: 0` in all 624 prompts, `session: null` on every lead event, #31's denominator)
were of the same kind.

**Why it's bad:** Every instrument has a blind spot it cannot show you, and a single method returns
a clean number either way. Two totals that agree feel like confirmation, yet they can hide two
errors that cancel out. The wrong number then buys a decision, or, as in (a), rules out a fix that
was possible all along.

**Rule:** No number goes into a document without a cross-check by a second method: another tool,
another source, or an item-level reconciliation. Reconcile **items** (per day, session, role or
ID), not totals. Count **unique IDs**, not matching lines. **A zero is a measurement too:** when a
search or a field returns nothing at all, check the instrument against a case where you know the
answer before reporting the absence. Keep the script that produced a number next to it, or a later
recount cannot be reconciled. Related: #31 (the denominator is one case of this), #30, #19.

---

## 40. A port check that can only say "free"

**Scope:** platform:windows

**What:** Checking a port with `netstat -ano | grep LISTENING`. On a localized Windows the state
word is translated (German prints `ABHÖREN`), so the grep never matches and every port reads as
free. In one project the lead's precheck had reported "ports free" for the whole project. It
surfaced only when two fresh dev servers died with `EADDRINUSE`: stopping the background tasks had
ended the `npm` wrappers but not the `node` processes underneath, which kept ports 4000 and 8083.
The correct command had been in this knowledge base for a month, in a tooling note about
background services, where nobody looks while starting a dev server.

**Why it's bad:** A check that cannot fail looks exactly like a check that passed. It was "right"
the first few times by coincidence, which is what bought it trust. And a lesson filed under the
incident that produced it is not found at the moment it is needed.

**Rule:** On Windows check ports with `Get-NetTCPConnection -LocalPort <N> -State Listen`, which
does not depend on the display language. Stop a dev server by the process that owns the port
(`Stop-Process -Id (Get-NetTCPConnection -LocalPort <N> -State Listen).OwningProcess`) and confirm
the port is free afterwards; stopping the wrapper task is not enough. Before trusting any precheck,
run it once against a state you know is occupied. File an operational rule where the action
happens — #43. Related: #19.

**Reaches the role:** a line in the global `~/.claude/CLAUDE.md`, which every session loads.

---

## 41. A rollout plan that treats a by-reference file like a copied template

**Scope:** universal

**What:** A change package said "template changes apply only to newly scaffolded projects".
True for the copied agent defs; false for
`templates/universal/agent-hierarchy.md`, which every project's CLAUDE.md reads by path and which
is live everywhere the moment it is saved. The plan's file list was short as well: 7 files named,
12 touched; the next package 19.

**Why it's bad:** The team-lead reads the by-reference file, the leads read their copied def.
Seven projects nobody was looking at would have run on two different rules, with no end date.

**Rule:** For every file in a change package note how it reaches a project — copied at scaffold,
read by path, or global (hooks, settings) — and therefore when it acts. When by-reference and
copied files change together, put a dated guard sentence into the by-reference file ("where the
project's def does not know X yet, the def holds") and plan the refresh. Before building,
reconcile the plan's file list against a grep for the old wording across templates, knowledge base
and consumers; a parser in another project may read the format you are about to change. Related:
#17, #20.

---

## 42. Editing files by script through the shell

**Scope:** universal

**What:** An agent changes source or test files with a script run through the shell —
`python - <<'EOF'` with `str.replace`, `sed -i`, `>` into a file — instead of the edit tools,
usually to make several changes in one call.

**Why it's bad:** A `replace` whose old text is not there writes the file back unchanged and says
nothing, where `Edit` fails loudly. Escaping through two languages (Bash heredoc → Python string →
a regex in the test) is fragile; one `\$` survived only because Python tolerated an invalid escape.
The change is invisible in the session's diff, to write hooks and to write counts from the tools;
formatter conventions get lost (double quotes, Prettier needed afterwards). A rewrite of the whole
file also drops its line endings *(platform:windows)*: Python's text mode reads `\r\n` as `\n`, and
`Write` writes the content as given, so a CRLF file comes back LF; only `Edit` keeps them. Where git
stores the CR (`core.autocrlf=false`, no `.gitattributes`) the diff then shows every line changed;
with `autocrlf=true` it shows nothing.

**Seen:** in one trial the `test-writer` patched tests this way in three of four runs; a lead
renamed variables with `sed -i` past the write reminder. In the next trial the team-lead rewrote
`STATUS.md`, its lead file
and `BLOCKERS.md` with Python scripts three times: twice a German quotation mark („…“, closed by an
ASCII `"`) broke the string — once after it had already reported the files as updated —, once a
line-by-line delete left the continuation lines of a multi-line entry in `BLOCKERS.md`. It noticed
each time itself. The rule had never reached it: it stood only in the writer defs. State files are
no exception: the shell only appends. In a knowledge-base review (a repo with
`core.autocrlf=false`): a Python heredoc that shortened one block of `README.md` and wrote with
`newline='\n'` turned the whole file LF — `git diff --stat` showed every line, restored before the
commit; a `Write` of another file did the same and went into a commit unnoticed, because that file
was rewritten on purpose and a full diff was expected. `git ls-files --eol <file>` shows it
(`i/crlf w/lf`).

**Rule:** Files in the repository change through `Edit`/`Write`; several changes to one file are
several `Edit` calls. The shell writes only appends to logs and state files and throwaway files
outside the repository. In the writer defs and in the project `CLAUDE.md` (which the lead defs
send their leads to). The write reminder reads shell commands but stays silent on state files.
**One exception:** the `test-writer`'s mutation probes run in a throwaway copy outside the project,
and there the shell may break the code (`sed`, `cp`) — because in-repo probes were stopped by the
auto-mode classifier in a trial. It keeps
#42's point: before every run the copy is compared with the project file, so a `sed` that found nothing
cannot pass for a probe. Related: `workflow/observability.md` § Analysing ("Tool mix depends
on the client mode").

---

## 43. A lesson filed where the role never reads it

**Scope:** universal

**What:** A lesson goes into the knowledge base as a rule, but not into the file the role works
from — the project `CLAUDE.md`, the role's def, a template. Two cases in one trial:
"write the state first, then spawn the checker" had stood in `workflow/phases.md` since the first
test run, yet the team-lead's gates failed five of nine times on stale state. "The shell only
appends to state files" stood under #42 and in the writer defs, yet the team-lead rewrote state
files by script three times.

**Why it's bad:** The knowledge base is read when someone looks something up — while capturing,
planning, analysing — not by an agent mid-task. A rule there is knowledge, not behaviour, and the
next run repeats the mistake with the lesson already on file.

**Rule:** When a learning should change what a role does, name in the entry the file that role
reads and get the sentence there (a template change is a rule change and needs its own decision),
or mark the entry as knowledge only. A lesson that shows up a second time is a sign it never
reached its reader. In `/capture-learning`: every proposal says which file the role
reads or "knowledge only", and each accepted rule change goes into the project's working memory as an
open decision — the skill itself does not edit defs or templates. Related: #24, #41.

---

## 44. A unit-blind seam swapped by a "tidy-up"

**Scope:** universal

**What:** In a trial project (a crypto watchlist), a commit "Simplify price service wiring" replaced the
injected `systemClock` (Unix seconds) with `Date.now` (milliseconds). Both are `() => number`, so
`tsc` stayed green; every one of the 1726 tests injects its own fake clock, so none touched the
composition root. Five days later quote times rendered as arbitrary dates and the persisted
`fetched_at` values were ~1000x too large. The upsert guard (`WHERE excluded.fetched_at > stored`)
would have rejected every correct write from then on — the code fix alone was not enough; the rows
had to be repaired (÷1000, backup first). **Provenance:** the faulty commit was planted on purpose for
a team trial (to exercise the `debugger`); the team did not know. The failure mode is real, the
incident staged.

**Why it's bad:** With a plain `number` the unit lives only in a name or comment, and a "simplify"
removes exactly that name. Seam tests with fakes cannot see wiring. A monotonic ("newer wins") guard
turns one bad write into a permanent one.

**Rule:** (1) Put the unit in the type or the identifier of an injected clock/amount (`nowSeconds`,
a branded type). (2) Keep one test that builds the real composition root, or asserts the magnitude of
the real default clock. (3) After fixing a wrong-unit write, check the persisted data and any
monotonic guard before calling it fixed; keep the backup outside the repo (#46). (4) "Simplify",
"move" and "rename" commits are behaviour changes: full test run and `code-reviewer` like any T3 (see
`workflow/tiers.md` § Tuning notes). Related: #19 (green tests that never touch the real thing).

**Reaches the role:** `code-reviewer` (`.claude/agents/code-reviewer.md`) — in the template
(Dimension A, point 6); existing projects get it when refreshed from the templates.

---

## 45. A hand-listed contract test misses the case that breaks

**Scope:** stack:server-rendered-html

**What:** In the same trial project, a commit "Move utility classes to the misc section of the
stylesheet" moved `.visually-hidden` and misspelled it `.visualy-hidden`. Screen-reader-only text
(button suffixes "Bitcoin", the target-gap sentence, field-error prefixes) became visible. No error,
all tests green: the existing `cssClasses` test checked only a hand-written list of price classes, and
the view tests asserted the HTML (`class="visually-hidden"`), never the stylesheet. **Provenance:**
the faulty commit was planted on purpose for a team trial (to exercise the `debugger`); the team did
not know. The failure mode is real, the incident staged.

**Why it's bad:** A hidden-by-default utility fails *open*: a broken selector shows content instead
of hiding it, and only a person looking at the page notices. A list someone has to remember to extend
covers the cases that were already on their mind.

**Rule:** Derive the set from the producer: scan the view sources for literal `class="..."` names and
require a selector for each in the stylesheet (tokens with interpolation have no fixed name — say so
in the test). Prove the test by re-introducing the typo (mutation check) and seeing it fail. When
moving or rewriting CSS rules, compare the selector set before and after. Related: #19, #24.

**Reaches the role:** knowledge only (the test now lives in the project).

---

## 46. An ignore pattern by extension does not cover derived copies

**Scope:** universal

**What:** In the same trial project, a backup of the SQLite file, `data/watchlist.db.bak-before-clock-fix`,
showed up as untracked: `.gitignore` listed `data/*.db`, `data/*.db-wal` and so on, not this suffix.
The file held password hashes. Only staging by explicit path kept it out of the commit; `git add -A`
would have committed it.

**Why it's bad:** Ignore rules by extension describe the files that exist today. Any copy, export or
backup with a new suffix falls outside them, and the one holding secrets is exactly the one nobody
planned for.

**Rule:** Make backups outside the repo (scratchpad / temp directory), or ignore the whole data
directory (`data/*` with `!data/.gitkeep`). When `git status` shows untracked files, stage by explicit
path. Delete the backup once the human has confirmed the repair. Related: #8.

**Reaches the role:** project `.gitignore` — it stays in the project. The template
`base.gitignore` has no data directory; where a stack keeps one, its ignore line belongs there.
