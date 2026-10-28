# Agent Governance — families, profiles, selection

Who does what, who may do what, how work is coordinated. This is the canonical statement;
the per-agent and per-tier detail it points to lives in `agents/` and `workflow/tiers.md`
(one source of truth per fact — this file cross-references, it does not duplicate).

## Three families

| Family | Where | Character |
|---|---|---|
| **coding** | project `.claude/agents/` | stateful; tier-driven; writes repo + `state/`. team-lead + leads + 8 lead/on-demand-spawned subagents (+ `memory-keeper` via the session skills = 9 scaffolded). |
| **research** | global `~/.claude/skills/` | read-only; fan-out → synthesis; stateless. An orchestrator plus parallel specialists. |
| **meta** | global `~/.claude/skills/` | entry / workflow layer; human-triggered slash-commands (checkpoint, end-session, review-*, new-agent, capture-learning, …). Not an orchestration profile — it may *invoke* coding/research agents. |

## Two orchestration profiles

The two agent-orchestration domains follow different operative rules — legitimately, not by
drift. **meta** is the invocation layer on top, not a third profile.

| | **Profile A — coding** | **Profile B — research** |
|---|---|---|
| Trigger | a change to a code repo | analysis/research, no repo writes |
| Orchestration | team-lead → leads → subagents | orchestrator → N specialists in parallel |
| Control | **Tier (T1/T2/T3) × 5 phases** (`workflow/tiers.md`, `workflow/phases.md`) | **fan-out → synthesis**; no tier/phase |
| State | writes `state/` + repo | **stateless** |
| Gate | `code-reviewer` (all tiers) · `phase-gate-checker` (T1 only) · human sign-off (Phase 4, T1) | synthesis validation in the orchestrator |
| Reference impl | the coding team (9 subagents) | a fan-out research team |

**Solo skills are not a profile.** The two profiles govern *orchestrated* (multi-agent) work.
Global single-shot skills that do a bounded task directly (`html-coding-agent`,
`github-action-builder`, `graphify`, plus ops/utility skills) are the **skills layer** — they
follow the shared meta-rules, but tier/phase-gate/team do not apply because there is nothing to
orchestrate. Boundary: a code-writing solo skill runs **outside** the coding team's
`code-reviewer` gate — fine for small, human-supervised single-shots; anything needing a tier or
gating belongs in the coding profile instead.

## Shared meta-rules (all families)

- **Self-contained spawn.** A spawned agent gets a **self-contained prompt** and **no access
  to the parent conversation**. The two families keep their own spawn *mechanics* (research:
  `subagent_type:`; coding: "the lead spawns") — but this rule binds **both**. A brief like
  "review the change we discussed" is a violation: the child never saw the discussion.
- **Least-privilege tools.** Explicit `Tools:` allowlist, **never `*`**; read-only by default.
  See § Tool least-privilege.
- **Model default.** `sonnet` for worker agents unless the task justifies otherwise.
- **Single source of truth.** Rules come from this knowledge base, not from memory.
  Project CLAUDE.md are **derived output**, not hand-maintained originals; a hand-edit that
  diverges is drift, not truth.

## Agent selection — which agent, when

```
1. Workflow / lifecycle action?
   (session checkpoint, review, session end, build an agent, capture a learning …)
   → META skill (the matching slash-command). Done.

2. Research / analysis with NO repo change?
   (gathering external info, comparison, multi-perspective analysis)
   → RESEARCH profile: orchestrator fan-out → synthesis. Done.

3. A change to a code repo?
   → CODING profile. team-lead sets the tier at session start:

     T1  Major Feature / Epic / Schema / Architecture
         → full 5 phases · phase-gate-checker MANDATORY · human sign-off in Phase 4
     T2  Bugfix / Minor
         → fast-track: phases 1–4 skipped → Phase 5 · code-reviewer only
     T3  Chore / Trivial
         → team-lead → code-writer directly · code-reviewer only

     Which subagent when: the template's § Agent Hierarchy & Workflow (Option B) —
     phase subagents, gates, and the triggered specialists (debugger, security-auditor,
     design-lead). Not repeated here.
```

**Tie-breaker.** Unsure between two tiers → pick the **higher**. Anything touching
**schema/architecture** → **always T1**. (Canonical in `workflow/tiers.md`.)

## Tier × agent

Canonical in `workflow/tiers.md` (the tiers) and `agents/subagents.md` (the roster):
`phase-gate-checker` is **T1-exclusive**; `code-reviewer` is the **only gate across all tiers**
and is never suspended.

## Tool least-privilege

Not just the current state — an explicit rule:
- Every agent declares an **explicit `Tools:` allowlist**. **No `*`.**
- **read-only is the default.** `Write`/`Edit`, `Bash` and `WebSearch`/`WebFetch` only where the
  job needs them. Which role has which is recorded in the defs
  (`new-code-project-setup/templates/agents/`) and the roster table in `agents/subagents.md` — not
  repeated here, because a copied list goes stale (it did: an old list here named two writers and
  four `Bash` roles, while the lead defs carry `Write`/`Edit`/`Bash`).

A new agent requesting `Tools: *` is a **review blocker**. `/new-agent` enforces explicit tool
selection by construction (its intake has no `*` option).

**Scope — what this rule can and can't bind.** It binds **subagents** mechanically (every
`.claude/agents/` def carries an explicit allowlist, zero `*`). The **team-lead** is a session
persona (nothing to scope). The four **domain-leads** are pinned, tool-scoped
`.claude/agents/*-lead.md` defs (explicit `tools:` = least-privilege + `Agent`), so the rule binds
them too. **Slash-command skills** run with the full session toolset and cannot declare `tools:`;
for them the rule is a convention, enforceable only by converting a skill into a tool-scoped agent.

## Real spawns for leads + subagents

The point of the two profiles is **real agent spawns with fixed rules** — never a lead
inline-assuming a role in its own context.

- **Leads are pinned defs.** The four domain-leads ship as `.claude/agents/*-lead.md` (fixed `tools:`
  incl. `Agent`, `model: sonnet`, boundaries), exactly like the subagents — know-how in
  `agents/*-lead.md`, deployable defs in `new-code-project-setup/templates/agents/`. Their rules do
  not depend on the spawn brief. The **team-lead** stays the session persona.
- **Nested spawn is supported.** A subagent def with `Agent` in `tools:` can spawn its own subagents
  (Claude Code ≥ v2.1.172; depth limit 5). The default hierarchy is depth 2 (session → lead →
  subagent).
- **Anti-inline is binding.** A lead/subagent role must be a real `Agent` spawn (own context, own
  def). Inline roleplay is forbidden (§ Failure modes) and is observable via the `subagent.start`
  events in the event log.
- **Rollout acceptance criterion.** A project is not "rolled out" until it has **both** (a) the
  Option-B `{{AGENT_HIERARCHY}}` section in its CLAUDE.md and (b) every `.claude/agents/*.md` it uses
  — the subagents **and** the domain-lead defs it keeps after Phase 0. Missing either → the lead
  can't spawn a pinned role and falls back to inline (the anti-pattern). Verify file presence per
  project.

## Determinism — LLM vs. tool

Where an agent combines **hard signals** (numbers, counts, thresholds) into a **categorical
verdict**, the mechanical part is a **deterministic signal skeleton** — comparison / counting /
thresholding in code — and the LLM **interprets** that signal; it never does the arithmetic.
Purely qualitative judgment (no hard inputs) stays entirely with the LLM. "Blueprint first,
model second."

- **Compute the signal, don't hard-code the verdict.** A reproducible *signal* (e.g. "value below
  threshold") is code; whether that signal means "good" or a trap is interpretation — keep it with
  the LLM. Over-determinism (a hard rule replacing nuanced judgment) makes output dumber, not more
  reliable.

## Observability — event log

Logging is a **structured, append-only event log** — `state/events.jsonl`, one JSON object per
line, per project — **not** narrative prose. It is fed by **hooks** (mechanical events —
`session.*`, `tool.use`, `subagent.start`/`subagent.stop` with `agent_type`, `task.done`,
`compact`) and by the **skills** (`review.result`, `session.closed`). A thin **lead convention**
for the semantic events (`tier.select`, `phase.enter`/`exit`, `gate.result`, `blocker.*`,
`decision.record`) was declared too and **never practised**: zero such lines in four active
projects (`workflow/observability.md` § The lead convention). One **global** hook covers **every**
project; a file-watching viewer can derive a live graph from the events.

- **Feed the viewer you have — don't stand up a second system.** Native OTEL (token/cost/latency/
  traces) stays an **opt-in Layer 2**; managed tracing backends are the escalation path. The JSONL
  uses OTEL-*inspired* field names so a later bridge is a bounded transform — and no OTLP collector,
  DB, or SaaS is required (data stays self-hosted).
- **Narrative stays.** `ACTIVITY.md` remains the human/checkpoint layer; `events.jsonl` is the
  machine layer. Two levels, decoupled.
- **Never log raw content.** The emitter whitelists fields (tool *name*, path, sizes) and never
  dumps `tool_input`/`tool_output`; `prompt.submit` logs length, not text — redact-by-default.
- **Wiring:** the global hook in `~/.claude/settings.json` (`matcher:"*"` emit). Every project with
  a `state/` dir logs; other dirs are a no-op via the guard. Detail: `observability.md`.

## Context-window economy

The token budget is mostly protected by the harness already; the goal is to **not re-solve solved
problems** and to name the real levers.

- **CLAUDE.md: rules + pointers, no history.** Project CLAUDE.md is **derived output**; detail goes
  into an **on-demand skill** (skill *bodies* are lazy-loaded) or `docs/`, history into the
  knowledge base. `@import` shortens the *file* and fixes drift but does **not** cut tokens
  (imports load eager). **No fixed line count:** rules that move into the file the team-lead works
  from, so they reach the role (`anti-patterns.md` #43), are growth of the right kind; growth by
  history, examples or detail a pointer could carry is drift. The scaffolder renders condensed
  cores + pointers to `templates/universal/` instead of the full inline (#20).
- **The biggest early lever is already native.** MCP tool schemas load **deferred** (names only;
  full schema pulled on demand via ToolSearch) and skill **bodies** are lazy (only the one-line
  `description:` loads eagerly). Residual lever: keep skill/agent **descriptions** tight
  (verb-first, one line). ⏳ Verify after 2026-12 (harness-version-dependent).
- **Session hygiene.** `/compact` at phase boundaries, `/clear` on a topic switch, `/context` to
  surface "quiet offenders" when a session feels heavy. Discipline, not tooling.
- **Model routing (the biggest lever on a plan).** The tier is a model signal, and subagents
  declare `model:` per the roster. Table and reasons: `workflow/tiers.md` § Model per tier.
- **Caching discipline.** The static prefix (CLAUDE.md, settings.json, tool set) is prompt-cached
  (~10% cost after the first message; Claude Code auto-requests a 1-hour TTL on a subscription).
  **Editing CLAUDE.md / settings mid-session busts the cache** — everything after it recomputes at
  full price. Batch such edits at session boundaries; keep a session warm to stay in TTL; `/clear`
  on a topic switch (a fresh cache is fine).
- **Locate-then-read + offload verbose work.** Grep/Glob to locate, then `Read` with
  `offset`/`limit` — never load a large file whole to find one thing. Delegate verbose-output work
  (test runs, log parsing, doc fetches) to a **subagent** so the bulky output stays in *its* context
  and only a summary returns (the coding team already does this via `code-writer` / `test-writer`).
  A **preprocessing hook** can filter (`grep ERROR`) before Claude sees the output — same family as
  the `emit-event.js` redaction hook.

## Failure modes seen

- **Inventing a third orchestration profile.** The two profiles govern *orchestration*. A solo
  skill that fits neither is fine — it's the skills layer, not a profile. What's forbidden is a
  third *orchestration* profile: if an orchestrated flow seems to fit neither coding nor research,
  stop and reconsider rather than spinning one up. meta is the entry layer, not a loophole.
- **Inline-simulating a lead or subagent instead of spawning it (forbidden)** — § Real spawns for
  leads + subagents. If a role can't be spawned (its def isn't deployed), fix the deployment —
  don't roleplay it. Observable: work attributed to a role with no matching `subagent.start`
  (`anti-patterns.md` #1).
- **Non-self-contained spawn** — § Shared meta-rules.
- **`Tools: *` for convenience** — § Tool least-privilege.
- **Over-determinism.** Hard-coding a verdict that needs nuance is as wrong as leaving arithmetic
  to the LLM: compute the signal in code, keep the interpretation in the model.
- **A second observability system instead of feeding the one you have.** The pull is to adopt a
  heavy tracing backend; the fit is to hand a file-watching viewer a structured file to watch. Feed
  the viewer you have before adopting infra.
- **Editing a project CLAUDE.md as if it were the source.** That is how drift starts — files grew
  to 1.5–2.5× the then ~200-line norm. The source is here; projects derive from it.
