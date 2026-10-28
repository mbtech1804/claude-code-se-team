#!/usr/bin/env node
"use strict";
/**
 * log-event.js — semantic event producer for the team lead (Block D, Layer 1).
 *
 * The mechanical hook (emit-event.js) auto-covers session/tool/subagent events.
 * This CLI lets the team lead deliberately record the workflow-vocabulary events
 * Claude Code can't see — tier/phase/gate/review/brief/blocker/decision — as one
 * line in <cwd>/state/events.jsonl with src:"lead".
 *
 * Usage (from the project dir, via the Bash tool):
 *   node ~/.claude/hooks/log-event.js <ev> [attrs-json]
 * Examples:
 *   node ~/.claude/hooks/log-event.js tier.select   '{"tier":"T2"}'
 *   node ~/.claude/hooks/log-event.js gate.result    '{"result":"FAIL","gaps":["JOURNAL missing"]}'
 *   node ~/.claude/hooks/log-event.js review.result  '{"must_fix":3,"should_fix":1}'
 *   node ~/.claude/hooks/log-event.js decision.record '{"adr":"ADR-0007","title":"events.jsonl"}'
 *
 * Contract mirrors emit-event.js: guard on <cwd>/state/, fail open, no secrets.
 * session comes from CLAUDE_CODE_SESSION_ID — the name the harness really sets;
 * CLAUDE_SESSION_ID, which this file read until 2026-10-13, never existed here, so
 * every lead event before that carries `session: null`. prompt comes from
 * CLAUDE_PROMPT_ID when the harness exposes it, else null.
 *
 * Also used by /end-session for the `session.closed` marker, which emit-event.js
 * matches by session id at SessionEnd — so the session id here must be right.
 * Schema SSoT: ~/.claude/agent-knowledge/workflow/observability.md.
 */
const fs = require("fs");
const path = require("path");

// Schema version stamped on every line — keep in sync with emit-event.js.
const SCHEMA_VERSION = 2;

function main() {
  const ev = process.argv[2];
  if (!ev || typeof ev !== "string") return; // nothing to log → fail open

  let attr = {};
  const attrsRaw = process.argv[3];
  if (attrsRaw) {
    try {
      const parsed = JSON.parse(attrsRaw);
      // only a plain object is a valid attr bag; anything else → keep {} not drop
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) attr = parsed;
    } catch {
      // malformed attrs → still log the event, with empty attr
    }
  }

  const cwd = process.cwd();
  const stateDir = path.join(cwd, "state");
  // Guard: only framework projects (with a state/ dir) get an event log.
  try {
    if (!fs.statSync(stateDir).isDirectory()) return;
  } catch {
    return;
  }

  const rec = {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    ev,
    src: "lead",
    session: process.env.CLAUDE_CODE_SESSION_ID || process.env.CLAUDE_SESSION_ID || null,
    prompt: process.env.CLAUDE_PROMPT_ID || null,
    project: path.basename(cwd),
    agent: { type: "team-lead" },
    attr,
  };

  try {
    fs.appendFileSync(path.join(stateDir, "events.jsonl"), JSON.stringify(rec) + "\n");
  } catch {
    // fail open
  }
}

main();
