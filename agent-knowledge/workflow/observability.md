# Observability — the event log

The canonical *decision* lives in `workflow/governance.md` § Observability — event log; **this**
file is the operational detail — what gets logged, the schema, and how it flows to a viewer.

## The model — two native sources, one log

Claude Code emits two complementary streams; we don't invent telemetry, we route it.

| | **Hooks** → domain log | **Native OTEL** → metric layer |
|---|---|---|
| Carries | who / edge / state / gate (workflow semantics) | tokens / USD / latency / span-tree |
| On via | one hook block in `~/.claude/settings.json` (global) | env-block in settings (global) |
| Transport | JSON on stdin → append a JSONL line | OTLP → a collector |
| Infra | none | an OTLP receiver must run |
| Role | **primary** — feeds the viewer | **Layer 2, opt-in** |

**Both stay.** The earlier assumption that native OTEL would make
the hook log redundant is wrong: the blind spots are complementary, not overlapping. **Only the
hook log** knows *subagent identity* (`agent.type`) and project semantics; **only OTEL** knows cost
per model *and per skill*, `tool_decision` accept/reject, `tool_result.duration_ms`, and the
per-call token split. The proof it mattered: a Phase-5 claim ("24 subagent starts, the roster is
theory") was falsified only because the hook log had typed starts the transcripts' *main stream*
does not carry. Retiring it would have destroyed the only instrument able to answer the question.

> **Correction — subagent turns ARE in the transcripts, in their own files.**
> The claim "`isSidechain` is always 0" holds only for the main `<session>.jsonl`. Subagent turns
> live in **`<session>/subagents/agent-<id>.jsonl`** with `isSidechain: true`, and the id in the
> filename maps to a role through `agent.id` → `agent.type` in `state/events.jsonl`. That is how
> `frontend-lead` was shown to have written 52 code files itself.
> **The "keep both layers" decision stands — but for a different reason: retention, not
> visibility.** Only 28 of 71 subagent transcripts still exist, and none of the eight July writer
> spawns. The hook log keeps the count; the transcripts keep the content, for a while
> (→ § Analysing, *Retention*).

`ACTIVITY.md` (human narrative) is a third, decoupled layer — it stays for checkpoints.

## `state/events.jsonl` — the log

- **Location:** `<project>/state/events.jsonl`, append-only, one JSON object per line.
- Co-located with the `state/` MDs a file-watching viewer already reads.
- Machine layer; `ACTIVITY.md` stays the human layer.

## Schema

| Field | Meaning |
|---|---|
| `v` | schema version — `2` since 2026-09-11; absent = legacy v1 (see *Schema versions* below) |
| `ts` | ISO-8601 UTC with ms |
| `ev` | event name, dotted namespace (`session.start`, `gate.result`, …) |
| `src` | `hook` (mechanical) \| `lead` (semantic) — provenance, handy to filter |
| `session` | `session_id` from the hook — correlates a whole session |
| `prompt` | `prompt_id` from the hook — correlates one turn |
| `project` | slug from `cwd` — a stable key for a viewer's project registry |
| `agent` | `{id,type}` on subagent lifecycle events (the subagent concerned); since v2 also on every hook event fired *inside* a subagent (the acting subagent) — absent there = main session; the role on lead events |
| `attr` | event-specific object (see catalog) |

```jsonc
{"v":2,"ts":"2026-07-02T14:03:07.118Z","ev":"subagent.start","src":"hook","session":"a1b2","prompt":"p-88","project":"invest-dashboard","agent":{"id":"sub-7","type":"code-reviewer"},"attr":{}}
{"v":2,"ts":"2026-07-02T14:03:09.301Z","ev":"tool.use","src":"hook","session":"a1b2","prompt":"p-88","project":"invest-dashboard","agent":{"id":"sub-7","type":"code-reviewer"},"attr":{"tool":"Read","path":"api.ts"}}
{"v":2,"ts":"2026-07-02T14:03:11.482Z","ev":"review.result","src":"lead","session":"a1b2","prompt":"p-88","project":"invest-dashboard","agent":{"type":"team-lead"},"attr":{"must_fix":3,"should_fix":1}}
{"v":2,"ts":"2026-07-02T14:03:11.940Z","ev":"gate.result","src":"lead","session":"a1b2","prompt":"p-88","project":"invest-dashboard","agent":{"type":"team-lead"},"attr":{"result":"FAIL","gaps":["JOURNAL entry missing"]}}
```

> **Schema versions.** An append-only log is read long after it was written, so a change in what a
> field *means* has to be visible per line (anti-pattern #30). Lines without `v` are legacy v1, and
> v1 holds two silent breaks: before **2026-08-28**, `subagent.stop` also recorded main-session turn
> ends (warning below); before **2026-09-11**, hook events fired inside a subagent (`tool.use`,
> `skill.invoke`, …) carried no `agent` and are indistinguishable from the main session's. `v:2`
> (from 2026-09-11) attributes them. Hooks do fire inside subagents — one project's log for a day
> holds 175 `tool.use` against 84 main-session + 95 subagent tool calls in the transcripts. Bump `v` whenever a field changes meaning, in `emit-event.js` and `log-event.js`
> together.

> **On "OTEL-aligned":** the field names are OTEL-*inspired*, not semconv (`gen_ai.*`)-conformant.
> A later Phoenix/Langfuse bridge is a bounded transform — forward-*mappable*, not drop-in lossless.

## Event catalog

**Mechanical — auto from hooks (no one logs by hand):**

| `ev` | Hook | Key `attr` |
|---|---|---|
| `session.start` | SessionStart | `source` (startup/resume/clear/compact), `model` |
| `session.end` | SessionEnd | `reason`; `closed` (true/false — was there a `session.closed` marker for this session) |
| `prompt.submit` | UserPromptSubmit | `len` — *length, not text* |
| `tool.use` | PostToolUse | `tool`; `path` for Edit/Write/Read — **never** raw input/output |
| `skill.invoke` | PostToolUse (`tool=Skill`) | `skill` |
| `subagent.start` | SubagentStart | `agent_type`, `agent_id` |
| `subagent.stop` | SubagentStop **with** `agent_type` | `agent_type`, `agent_id` |
| `turn.end` | SubagentStop **without** `agent_type` | — (see the warning below) |
| `task.done` | TaskCompleted | `title` |
| `compact` | PreCompact | `trigger` |
| `reminder.write` | PreToolUse (Edit/Write/NotebookEdit and Bash/PowerShell) — written by `write-reminder.js`, not the emitter | `role` (team-lead/lead), `kind` (code/test), `via: "shell"` for a shell write — **no** path, command or content |

**Semantic — the lead emits one line (the vocabulary Claude Code can't see):**

| `ev` | When | Key `attr` |
|---|---|---|
| `tier.select` | Team Lead picks a tier | `tier` (T1/T2/T3) |
| `phase.enter` / `phase.exit` | phase transition | `phase` |
| `gate.result` | phase-gate-checker verdict | `result` (PASS/FAIL), `gaps[]` |
| `review.result` | code-reviewer verdict | `must_fix`, `should_fix` |
| `brief.issue` | brief handed to a writer | `target`, `scope` |
| `blocker.raise` / `blocker.resolve` | BLOCKERS.md changes | `id`, `summary` |
| `decision.record` | an ADR is written | `adr`, `title` |
| `session.closed` | `/end-session` reaches its closure step (the skill runs `log-event.js session.closed`) | — |

> ⚠ **`SubagentStop` does not mean "a subagent stopped."** In the shipping Claude Code version it
> also fires at **main-session turn end**, with no `agent_type`. Taking it at face value produced
> **382 ghost events over 7 weeks** — one project logged 70 `subagent.stop` against 71
> `prompt.submit` with **zero** spawns, each stop landing at turn end right before the next prompt.
> The viewer then rendered them as a phantom `"subagent"` node (its parser falls back to that
> string when `agent.type` is absent) — the exact ghost the event log was built to eliminate.
>
> Since **2026-08-28** the emitter therefore writes an **untyped stop as `turn.end`**, and records `attr.subagent_type`
> on `Agent`/`Task` tool-calls. **The trustworthy spawn signal is the start side**, confirmed twice:
> `Agent` tool-calls and `subagent.start` match per project (56/60 · 2/2 · 9/9 · 0/0). When
> analysing history, **filter on `agent.type`** — the ghost events stay in the log, because a log is
> a journal, not state.

## The emitter — `~/.claude/hooks/emit-event.js`

- Reads the hook's stdin JSON, **guards** (no-op unless `<cwd>/state/` exists → never writes into
  non-framework dirs), **whitelists** fields, appends one line to `<cwd>/state/events.jsonl`.
- Fails open: any parse/IO error → exit 0, never breaks the session.
- **Security:** logs tool *name* + path + sizes; **never** raw `tool_input`/`tool_output`;
  `prompt.submit` logs length not text. No secrets/PII (CLAUDE.md § Security).

**Global hook registration** — in `~/.claude/settings.json`:

```jsonc
{
  "hooks": {
    "SessionStart":     [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "SessionEnd":       [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "PostToolUse":      [{ "matcher": "*", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "SubagentStart":    [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "SubagentStop":     [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "TaskCompleted":    [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "PreCompact":       [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }]
  }
}
```

> Windows: the command runs in Claude Code's Git-Bash hook runner, where `~` expands. Every project
> with a `state/` dir logs; other dirs are a fast no-op via the guard. Verified end-to-end at
> activation (all 9 mechanical event types, secret/prompt-text redaction, guard).

## Trigger hooks — rules delivered by an event

Two more global hooks sit next to the emitter. They exist because a rule that only stands in a
`CLAUDE.md` wears off in long projects (anti-pattern #24): the main session wrote 329 code files
against "writes no production code", and after two of three compactions no state file was re-read.

```jsonc
"SessionStart": [ /* emitter */, { "matcher": "compact", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/reanchor.js" }] } ],
"PreToolUse":   [ { "matcher": "Edit|Write|NotebookEdit|Bash|PowerShell", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/write-reminder.js" }] } ]
```

- **`reanchor.js`** — after a compaction, prints to the context: re-read the state files that
  exist, how long ago `state/STATUS.md` was written, and the head of `STATUS.md`. Guard:
  `<cwd>/state/STATUS.md`; main session only. Writes nothing. `SessionStart` with source `compact`
  is the right event: its stdout reaches the model, while `PostCompact` has no channel into the
  context and `PreCompact` fires before the summary exists.
- **`write-reminder.js`** — when the main session (the team-lead) or a `backend-lead` /
  `frontend-lead` is about to write a code or test file, adds a one-paragraph reminder as
  `additionalContext`. Once per prompt and actor. **A reminder, not a lock:** always exit 0, no
  `permissionDecision` — exit 2 would block the write, and on a day when `code-writer` cannot be
  spawned a lock stops the work. Guard: `<cwd>/state/` **and** `.claude/agents/code-writer.md` — four
  projects have a `state/` dir but no agent team, and there the advice "hand it to `code-writer`"
  would be noise. File classes are those of the script that measured the trials (not `state/`, `docs/`,
  `.claude/`, `*.md`; but a script under `.claude/` — `.ps1`, `.sh`, `.py`, `.js` … — is code),
  so the reminder and the measurement count the same writes. Each reminder logs one
  `reminder.write` line. **It also reads Bash/PowerShell commands:** in the
  trial a lead renamed variables in a component with `sed -i` and the reminder never saw it.
  The command is parsed, never run — redirects `>`/`>>`, `tee`, `sed -i`, Set-Content/Out-File,
  Python `open(…, 'w')`/`write_text`, `writeFileSync`; a heredoc body counts only when it feeds
  `python`/`node`; a target the command does not show (a variable) stays silent. Same patterns as
  the measuring script — checked on 1,163 real commands, no difference. Costs one `node` start
  (~55 ms) per shell call.
- **A hook and the measuring tool that must count the same thing: mirror the logic, then prove it
  on every real case.** The write reminder (JavaScript) and the measuring script (Python) both decide
  which shell commands write which files. Unit cases prove only the patterns someone thought of.
  The proof that the two agree is to run both over every shell command in the saved transcripts
  and diff the results — 1,163 commands, 224 of them writing, no difference. Repeat it
  after a change to either side.
- **The clean-ending marker** — `/end-session` writes `session.closed`; the emitter stamps
  `closed` on `session.end` by looking for that marker in the last 256 KB of the log (SessionEnd
  hooks get 1.5 s in total). **Count clean endings by the marker, not by `session.end`:** the
  desktop app often ends without a SessionEnd at all — one project showed ten `session.start`
  against four `session.end`, all with reason `other`.

Proven as scripts — `node ~/.claude/hooks/test-hooks.js` (the number of checks
grows with each hook change and stands in its output): guards, roles, file classes,
once-per-prompt, fail-open, nothing but role and class in the log, marker match by session id,
under 50 ms on an 8 MB log. Run it after every change to a hook script; it works in a
throwaway dir under the temp dir.

**Proven live** — headless sessions (`claude -p`, the desktop app's runtime 2.1.295)
in a throwaway team-shaped dir, one session id throughout:
- *Reminder:* asked to write `src/hello.js` and to quote any note that came with the write, the
  model answered with the reminder's first sentence verbatim; the file was written (not blocked);
  the log shows `reminder.write {role: team-lead, kind: code}` right before the `tool.use`.
- *Marker:* `log-event.js session.closed`, run through the Bash tool, carried the same session id
  as the hook events, and `session.end` came out as `closed: true`.
- *Re-anchor:* after `/compact` the log shows `compact {trigger: manual}` → `session.start
  {source: compact}`; asked in the next turn, the model quoted "state/STATUS.md was last written
  7 minutes ago (…)" from the note. Before the compaction the same question got "NONE" — the hook
  does not fire on `resume`.

Live in a trial since: the lead variant of the reminder (`frontend-lead`). **Still
never seen:** an *automatic* compaction in a long interactive session (none in any trial so
far). A script test
cannot show that a hint reaches the model, and neither can a `cd` inside a running session — the
hook's `cwd` stays the session's project dir. Note that `closed` stays `true` for a session id
that is resumed and continued after `/end-session`, as long as the marker is inside the tail —
judge "ended cleanly" by what follows the marker, not by the flag alone.

**How to prove a context hook — the method behind the list above:**
- **Prove a hint by making the model quote it.** A script test proves the guard logic, not that
  the text reaches the model. Build a throwaway dir shaped like the target project, run a headless
  session on the cheapest model, let it do the triggering action and "reply with the first
  sentence, verbatim, of any note that arrived with it, or NONE". Ask the same question once before
  the trigger as a negative control. Then read the event log. Seven such calls cost about $0.06.
  Login and runtime for such runs: `tooling/claude-code-codex.md` § Headless runs.
- **A `PreToolUse` hint arrives with the tool result** — the first write of a prompt happens
  anyway. Judge the reminder by what follows `reminder.write` in the same prompt, not by whether a
  write occurred.

## The lead convention — semantic events (declared, never practised)

**Status:** declared, never practised. In four active projects (15,951 log
lines) there is not one `tier.select`, `phase.enter`/`exit`, `gate.result`, `brief.issue`,
`blocker.*` or `decision.record` line; every `src:"lead"` line comes from a skill (`review.result`
from the review skills, `session.closed` from `/end-session`). The convention hangs on no moment
(`anti-patterns.md` #24); a hook that derives the events was deferred in favour of the date in
`ACTIVITY.md`. The leads are no longer asked to write these lines (`agents/team-lead.md`); the
catalog and `log-event.js` stay, because the skills use them and a later hook could.

The convention as designed — when the team crosses a workflow boundary, append **one** line to
`state/events.jsonl`:
- picks a tier → `tier.select`
- enters / exits a phase → `phase.enter` / `phase.exit`
- a gate or review returns a verdict → `gate.result` / `review.result`
- raises / resolves a blocker → `blocker.raise` / `blocker.resolve`
- records an ADR → `decision.record`

**Producer — `~/.claude/hooks/log-event.js`.** The lead appends a line via the
Bash tool, from the project dir:

```bash
node ~/.claude/hooks/log-event.js tier.select   '{"tier":"T2"}'
node ~/.claude/hooks/log-event.js gate.result   '{"result":"FAIL","gaps":["JOURNAL missing"]}'
node ~/.claude/hooks/log-event.js review.result  '{"must_fix":3,"should_fix":1}'
```

Same discipline as the emitter (guard on `state/`, fail-open, no secrets); writes `src:"lead"`,
`agent.type:"team-lead"`. `session` comes from `CLAUDE_CODE_SESSION_ID` — an earlier version read
`CLAUDE_SESSION_ID`, a name the harness never sets, and every lead event it wrote carries
`session: null`. `prompt` comes from `CLAUDE_PROMPT_ID` when present, else `null`.
**The `~` form only works in the Bash tool:** from the PowerShell tool, `node ~/.claude/…` fails
with "Cannot find module" — use `node "$env:USERPROFILE\.claude\hooks\log-event.js" <ev>` there.
For months the convention stood in the team-lead's know-how; it never showed up in the logs
(status above).

> **Also emitted by the review skills.** `/review-all` (R6) and `/review-quick` write
> `review.result` after the `code-reviewer` run. **Run the `log-event.js` call via the Bash tool**,
> not PowerShell: PowerShell 5.1 strips the embedded double-quotes of the single-quoted JSON arg
> when passing it to a native `.exe`, so `attr` would arrive **empty** (must_fix/should_fix lost).
> Bash preserves the single-quoted JSON and expands `~`.

## Analysing — the log and the transcripts

Before a count from either instrument goes into a document, cross-check it with the other one or
with a second method (`anti-patterns.md` #39). The traps below were each measured.

- **Grep skips gitignored directories, and `state/` is often one.** The Grep tool (ripgrep) does not
  enter directories listed in `.gitignore`, and 4 of the 10 framework projects ignore `state/`. A
  glob such as `**/state/events.jsonl` does not help: it still matches an ignored *file* but never
  enters an ignored *directory*. Reproduced once: a Grep over all projects found 6 compaction
  events in 2 files, while the logs hold 38 in 5; pointed at one file directly, Grep found all 25
  in it. → Count over an **explicit file list** and check how many files were actually read.
- **Transcript layout.** Transcripts live in `~/.claude/projects/<slug>/`, where `<slug>` is the
  project path with every non-alphanumeric character replaced by `-` (`C:\Projects\My App`
  → `C--Projects-My-App`). The main session is `<session>.jsonl`. Each subagent is
  `<session>/subagents/agent-<id>.jsonl` with an `agent-<id>.meta.json` beside it (`agentType`,
  `parentAgentId`, `spawnDepth`, `toolUseId`, `description`), which is enough to rebuild the spawn
  tree without the event log. Tool calls are `tool_use` items (`id`, `name`, `input`) in assistant
  messages; results are `tool_result` items (`tool_use_id`, `is_error`) in user messages. **The same
  tool call can appear more than once, so count unique `id`s** (one project: 714 entries, 630 IDs).
  A compaction is a `system` line with `subtype: "compact_boundary"`; user lines flagged `isMeta` or
  `isCompactSummary` are not human prompts, and neither are `<task-notification>` messages.
  ⏳ Verify after: 2026-12-01, because the transcript format is internal, not a documented contract.
- **Whether a SessionStart hook's note arrived is in the transcript.** After a `compact_boundary`
  the hooks appear as `attachment` lines with `hookEvent: "SessionStart"`: `type: "hook_success"`
  with the hook's output in `content`/`stdout`, or `type: "hook_non_blocking_error"` with `command`
  and `stderr` when it failed. Look between the boundary and the next human prompt. In one headless
  run the first compaction showed the re-anchor hook failing (`Cannot find module`, the `~` path),
  the second its note — visible only there, the model just carried on. ⏳ Verify after: 2026-12-01
  (internal format).
- **Retention.** Claude Code deletes transcripts after `cleanupPeriodDays` (default 30 days).
  Raising it does not bring back what is gone: after it was set to `365`, the oldest surviving
  transcript dated from exactly 30 days earlier. Raise the setting **before** the period you will
  want to analyse, and copy the transcripts of a run you care about right after it ends.
  **Deleting a session in the desktop app deletes its transcript at once** — the main
  `<id>.jsonl` and the `<id>/subagents/` folder — and leaves only `<id>.desktop-released.json`
  (`"reason": "delete"`). In one trial four of five measured sessions were deleted the next
  morning by the human, who thought they were no longer needed; the report survived only as a
  copy and can no longer be regenerated. So: right after each measured session, copy its
  `<id>.jsonl`, its `<id>/` folder and `state/events.jsonl` into the analysing project's archive,
  write the report to a file at once, and tell the human when the sessions may be deleted.
  **Prove the copy before the session may go:** regenerate the report from the archive
  (`--transcripts <archive>`) and diff it against the run on the live folder. If both agree except
  for the source line, the copy alone suffices — only then tell the human the session may be
  deleted. ⏳ Verify after: 2026-12-01 (desktop app behaviour).
- **Attribution is an object.** `agent` is `{id, type}` and sits on every event fired inside a
  subagent (one test run: 1,924 of 2,353 `tool.use`). A text search for `"agent":"…"` returns
  nothing and reads as "no attribution". Parse the JSON; attribute writes per role from it.
- **Compare spawns per role, not in total.** The log can miss a spawn and counts a `SendMessage`
  resume as a `subagent.start`; in one report the totals still agreed at 55 ↔ 55.
- **Leads at the same time: busy is the run plus everything it started.** A lead's own lines are
  not enough: while it waits on a foreground writer it writes nothing for minutes, and a lead
  resumed by `SendMessage` an hour later has one transcript spanning the idle time. Take the time of
  every line of the lead *and* of every run it spawned (the spawn's `tool_use` id is the child's
  `toolUseId` in `.meta.json`), split where no line came for 15 minutes, and sweep the stretches per
  session. Checked by hand on a saved test run (two windows with two leads, 13 and 19 minutes); in
  the next trial it showed three leads at once at the first parallel spawn.
- **A spawn's report reaches the parent on one of three ways, and the `Agent` result holds it on
  only one.** *Directly* (foreground): the tool result is the report plus a trailer of ~200
  characters (`agentId: … (use SendMessage …)`, a `<usage>` block) — strip it. *As a completion
  notice* (background): the tool result is a start receipt ("Async agent launched successfully", a
  constant ~1,080 characters); the report is the `<result>` of the `<task-notification>` that
  carries the spawn's `<tool-use-id>`. Look in `queue-operation` lines first — 13 of 14 notices
  were only there. *As a handback*: the child calls `SubagentHandback` with the report as
  `message`; the parent's tool result is a ~350-character pointer, and a notice, if any, is a
  148-character pointer too. Which way is used depends on the runtime version: in one test run the
  first session had no handback, the second no notice; 40 of 81 reports came by handback. **The
  subagent's last message is only a fallback** — after a handback it is a short closing line, and a
  resumed lead has a later last message than the one the parent received. A result starting with
  `Agent type '…' not found` is a failed spawn, not a short report. Name the source per spawn.
  ⏳ Verify after: 2026-12-01 (internal format).
- **`ACTIVITY.md` logs a spawn under the spawning role** (`frontend-lead subagent-spawn
  test-writer`; for a lead also `delegated` / `lead-activated` by the team-lead) and is pruned on a
  line limit. Count the mentions, not the lines by the spawned role. **The pruned lines are not lost
  where git tracks the file:** `git log --reverse -p --unified=0 -- state/ACTIVITY.md` returns every
  line a commit ever added, and the commit's date dates old lines that carry only `HH:MM`. In the
  test run the file alone showed 15 of 81 spawns as logged, file plus history 58. Where `state/` is
  gitignored there is no history, and only the surviving window is checkable.
- **Tool mix depends on the client mode.** In auto mode the client steers file changes through the
  shell; writes made with `sed` or a heredoc are invisible to both instruments. Compare tool counts
  only between runs in the same mode, and state write counts as a lower bound. Subagents also write
  through the shell on their own: in one trial the `test-writer` patched test files with
  `python - <<'EOF'` in two of four runs — nine and four new tests, counted as zero test writes.
  Per-role write counts from `Write`/`Edit` are a lower bound in any mode; to close the gap, scan
  `Bash` commands for heredocs, redirects and in-place edits that target source or test paths.
- **Subagents run on their def's model**, not the session's (one run: the lead on Opus, the
  subagents almost entirely on Sonnet, the rest on Haiku). Name the models per role when reporting.
- **Token use and limit hits are in the transcripts.** Every assistant line carries
  `message.usage` (`input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`,
  `output_tokens`) and `message.model`. One API message is written as several lines — one per
  content block — that repeat the same usage: **count once per `message.id`** (one session: 611
  lines with usage, 334 messages). Subagent transcripts carry their own usage, which gives tokens
  per role. The `cost-state` line is no shortcut: it covers one process run, not the session (6.2 M
  cache-read tokens against 64.9 M counted). A limit hit is an assistant line with
  `isApiErrorMessage: true` and `error: "rate_limit"` ("You've hit your session limit · resets
  3pm"); it appears in the main session **and in every subagent running at that moment**, and again
  with every retry — group by session, day and message. The project's tokens over the five hours
  before a hit show how far the limit reached; use elsewhere on the same account counts against the
  same limit and is invisible here. How a subscription weighs the four token kinds is not
  published: tokens measure consumption, they are not a limit counter. One measured point
  (a test run, main session on Opus): the hit came 1 h 40 into the session, after 5
  prompts, 20 spawns and about 420,000 output tokens. **The limit can also arrive as a runtime
  notice instead of an error.** In one trial the main session got a meta user line
  with `usageLimitNote: "wrap_up"` ("Usage limit reached; a short grace allowance remains, then this
  turn is cut off without warning …", telling the model to finish the piece in hand and stop) and,
  after the reset, one with `"release"` — no `rate_limit` error at all. An instrument that looks
  only for the error reports "no limit hit". Count `wrap_up` as a hit with its own label. Second
  measured point (main session on Sonnet): the notice came 56 minutes in, at 37.5 M project tokens
  — a lower bound, an Opus session of another project drew on the same limit.
  ⏳ Verify after: 2026-12-01 (internal format; the limit itself moves).
- **Subagent `output_tokens` are often only the start value.** The largest value per `message.id`
  is the final one only if a line of that message carries a `stop_reason`. In subagent transcripts
  many messages never get that line and keep the streaming start value (2–32 tokens) although they
  wrote thousands of characters: 30 of 39 subagent messages in one session (328 tokens recorded for
  ~47,000 characters written); in a saved test run 420 of 1,830 messages, all in subagents — rare
  before 2026-09-25 (6 of 656), frequent after. Main-session messages were complete. Input and cache
  counts are set at message start and are complete — checked: all 75 incomplete messages of one
  trial carried them. There is no second source for the missing output: the `Agent` result's
  `usage`/`totalTokens` covers only the child's last message; a completion notice's
  `<subagent_tokens>` is one number per run without kinds. Estimating from the text written fails
  too: complete messages averaged 1.7 characters per output token instead of the usual ~4,
  presumably thinking that counts but is not in the transcript. So shares per role rest on total
  tokens, and output stays a lower bound marked "≥", reported with the share of messages lacking a
  `stop_reason`. Total tokens are mostly cache reads: they show how much context a role pushes
  through, not its share of a subscription limit. ⏳ Verify after: 2026-12-01 (internal format).
- **Check the instrument against raw instances — before the run, after its first session, and
  before any cause or "all"/"none" goes into a write-up.** Once the run is over, an instrument error
  and a finding look the same. Each point below was measured; together they are one lesson
  (`anti-patterns.md` #39; three repeats of it before it reached its reader are #43's sign).
  - *Before the run:* run the instrument over a **saved earlier run** and compare with values
    verified by hand — an untouched section must come out character-identical; for events that do
    not exist yet (a new hook's log line, a new line format) build a **synthetic mini project** — a
    dozen hand-written log and transcript lines with the expected numbers worked out beforehand.
    Say in the write-up which parts were proven only on synthetic data. (In one test run three of
    ten answers were wrong because of the script — lines counted instead of mentions, receipts measured
    as reports, a metric that looked only at the main session.)
  - *After the first real session:* run it again. Synthetic data only holds what you thought of:
    after one trial session the instrument showed output tokens recorded as start values, tests
    written through the shell, and a card field written `Acceptance (run it yourself …):` that the
    pattern missed — found after one session instead of four, so the values could still be checked
    by hand.
  - *After changing a class:* every number built on it moves. When `graphify-out/` became temp,
    seven other sections of the report changed too, so "every other section
    character-identical" is the wrong expectation. The proof is a counterfactual run: the new
    instrument with only the old rule patched back must reproduce the old report, except for the
    sections changed on purpose.
  - *Free text follows the session's language.* In a German-speaking trial four counts were wrong
    before any comparison: `### CRITICAL / HIGH / MEDIUM` followed by "Keine." read as one CRITICAL,
    sub-points under one finding counted as nine MEDIUM, card fields `Akzeptanz`, `Nicht im Scope`,
    `Datei` were missed, and the limit notice was not seen. Check a number parsed from prose
    (reports, briefs) against the text of at least one real instance.
  - *Search for the behaviour, not for the role that should show it.* One trial's instrument looked
    for mutation probes only in `test-writer` runs inside the project; the `backend-lead` had run 11
    in a scratch copy, and a rule was first decided on the wrong premise. Before "never" or "only",
    search every transcript of the run for the behaviour's traces, across roles and outside the
    project folder. Same for sessions: when the human describes a failure from memory, search every
    candidate session before naming one (once the wrong session was explained first).
  - *Open the raw case before writing a cause.* One trial's write-up read two diagnoses off the
    instrument's output: "the auditor reported no findings by severity" (the report was there, via `SubagentHandback`,
    but numbered its findings `M1.`, `L1.` …, which the parser did not count) and "`Mutation probes:`
    missing in all ten reports" (it stood in seven). A hand check with the parser's own pattern
    inherits its blind spot: two reports carried the block as `**Mutation probes**` without a colon —
    search for the bare words without punctuation and markup. **Reaches the role:** the analysing
    session, through its project memory.
- **Keep a measured trial measurable — rules for the human's sessions.** One task per session,
  each a fresh session (not resumed) on the same model; report a false start on another model
  separately. Prompts as in daily work: no role names, no "use the code-writer", no hint that it is
  a test — otherwise the trial measures the instruction. Choices without a preference: "take your
  recommendation". **Type nothing after `/end-session`'s closing message:** a prompt after the marker
  counts the session as not cleanly closed (a reply after it sets the marker again). State files
  `/end-session` leaves uncommitted are committed from outside (by the analysing session, on the
  human's OK). In older versions of `/end-session` the marker came before the skill's closing
  questions, so answering them counted as unclean — check a prompt right after a closing question
  by hand there. Stop background tasks that still run before closing: twice in one trial a
  hanging `python` line in the team-lead's append command kept running until stopped by hand, and
  could have written into an already committed file. **The analysing session draws on the same
  limit.** In one trial the build session hit it 56 minutes in, before implementation, while an Opus
  session checked screenshots of it in parallel — so the limit's reach for the build alone stayed
  unmeasured. Check in by short text at agreed points, take the numbers from the transcripts, and
  keep the analysing session idle while the build runs. **When the limit stops a build session,
  continue the same session after the reset** with a plain "continue" — no `/start-session`, no
  `/end-session` before. In one trial the team-lead itself proposed a fresh session; staying kept
  the context and the whole task in one transcript. The pause does not make it two tasks.
- **A planted bug in its own small commit is found through `git log`, not by the `debugger`.**
  Twice, in two different runs, the team-lead saw the foreign commit right
  before the symptom and had the cause in seconds — the `debugger`'s trigger ("cause unclear after a
  first look") never fired. To measure the trigger, the bug must not be the newest commit's obvious
  diff: bury it in a plausible larger change a few commits back. To measure the debugger's work
  instead, ask for it explicitly and say so in the write-up. (The first time this stood only as a
  falsified assumption in a project retrospective, where a trial's planner does not look —
  `anti-patterns.md` #43.)

## Consumption — a viewer

Any file-watching viewer can tail-read the log and derive a live graph from the events (e.g. pushed
to a browser via SSE). Building one is outside this framework.

## Native OTEL — Layer 2

Opt-in: OTLP/HTTP-JSON to a local collector (e.g. `localhost:4318`), retention set by the collector;
nothing needs to leave the machine. Residual risk to accept with it: `OTEL_LOG_TOOL_DETAILS=1` writes
`tool_parameters` — **full shell commands in clear text** — where the hook emitter deliberately
redacts them. A local collector is a long-running process: give it a watchdog and test its
recovery by killing it once.

## Deferred

- Langfuse/Phoenix escalation; retention/rotation of `events.jsonl` (still unbounded).
