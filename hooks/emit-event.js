#!/usr/bin/env node
"use strict";
/**
 * emit-event.js — Claude Code hook → structured event log (Block D).
 *
 * Reads one hook-event JSON on stdin and appends a single line to
 * <cwd>/state/events.jsonl. Registered globally in ~/.claude/settings.json for
 * SessionStart/SessionEnd/UserPromptSubmit/PostToolUse/SubagentStart/
 * SubagentStop/TaskCompleted/PreCompact.
 *
 * Contract:
 *  - Guard: no-op unless <cwd>/state/ exists (never writes into non-framework dirs).
 *  - Fails open: any parse/IO error → exit 0. A logger must never break a session.
 *  - Security: whitelists fields. Never logs raw tool_input/tool_output or prompt
 *    text — only tool NAME, file basename, sizes, counts. (CLAUDE.md § Security;
 *    mirrors OTEL redact-by-default.)
 *  - Schema v2 (2026-09-11): every line carries `v`, and every event fired inside a
 *    subagent carries that subagent as `agent` — no `agent` means the main session.
 *
 * See ~/.claude/agent-knowledge/workflow/observability.md.
 */
const fs = require("fs");
const path = require("path");

// Schema version stamped on every line — keep in sync with log-event.js. Lines
// without `v` are legacy (v1); observability.md § Schema lists what changed when.
const SCHEMA_VERSION = 2;

// hook_event_name → our dotted event name. PostToolUse is refined to skill.invoke below.
const EV = {
  SessionStart: "session.start",
  SessionEnd: "session.end",
  UserPromptSubmit: "prompt.submit",
  PostToolUse: "tool.use",
  SubagentStart: "subagent.start",
  SubagentStop: "subagent.stop",
  TaskCompleted: "task.done",
  PreCompact: "compact",
};

// Tools whose file_path is safe to record (paths, not content/commands).
const PATH_TOOLS = new Set(["Edit", "Write", "Read", "NotebookEdit"]);

// Tools that spawn a subagent; their tool_input.subagent_type names the agent.
const SPAWN_TOOLS = new Set(["Agent", "Task"]);

// SessionEnd hooks get 1.5 s in total, so the closed-marker lookup reads only the end
// of the log. A marker further back than this means the session went on for a long
// time after /end-session — reporting that as "not closed" is the honest answer.
const TAIL_BYTES = 256 * 1024;

// Did /end-session leave its `session.closed` marker for this session? The skill
// writes it through log-event.js; only a line carrying the same session id counts.
function sessionClosed(logPath, sessionId) {
  if (!sessionId) return false;
  let fd;
  try {
    fd = fs.openSync(logPath, "r");
    const size = fs.fstatSync(fd).size;
    const len = Math.min(size, TAIL_BYTES);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    for (const line of buf.toString("utf8").split("\n")) {
      if (!line.includes('"session.closed"')) continue;
      try {
        const r = JSON.parse(line);
        if (r.ev === "session.closed" && r.session === sessionId) return true;
      } catch {
        // partial first line of the tail, or a foreign line → skip
      }
    }
  } catch {
    // no log yet → not closed
  } finally {
    if (fd !== undefined) {
      try {
        fs.closeSync(fd);
      } catch {
        // nothing to do
      }
    }
  }
  return false;
}

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function main() {
  const raw = readStdin();
  if (!raw) return;

  let h;
  try {
    h = JSON.parse(raw);
  } catch {
    return; // malformed → fail open
  }

  const cwd = h.cwd || process.cwd();
  const stateDir = path.join(cwd, "state");
  // Guard: only framework projects (with a state/ dir) get an event log.
  try {
    if (!fs.statSync(stateDir).isDirectory()) return;
  } catch {
    return;
  }

  const hookName = h.hook_event_name;
  let ev = EV[hookName];
  if (!ev) return; // event we don't track

  const attr = {};
  let agent;

  switch (hookName) {
    case "SessionStart":
      // Skip subagent SessionStarts: parseEvents slices the graph from the last
      // session.start, so a subagent's would truncate the main-session graph.
      // Subagent lifecycle is already covered by SubagentStart/Stop. agent_id is
      // present only when the hook fires inside a subagent.
      if (h.agent_id) return;
      if (h.source) attr.source = h.source;
      if (h.model) attr.model = h.model;
      break;
    case "SessionEnd":
      if (h.reason) attr.reason = h.reason;
      // Was the session closed with /end-session? Many sessions never produce a
      // SessionEnd at all (the desktop app often just goes away), so count clean
      // endings by the `session.closed` marker itself; this flag is the supplement.
      attr.closed = sessionClosed(path.join(stateDir, "events.jsonl"), h.session_id);
      break;
    case "UserPromptSubmit":
      // length only — NEVER the prompt text
      // field is `prompt` (hook input); `user_prompt` kept as fallback for older builds
      {
        const text = typeof h.prompt === "string" ? h.prompt : h.user_prompt;
        attr.len = typeof text === "string" ? text.length : 0;
      }
      break;
    case "PostToolUse": {
      const tool = h.tool_name || "unknown";
      if (tool === "Skill") {
        ev = "skill.invoke";
        const skill = h.tool_input && (h.tool_input.skill || h.tool_input.name);
        if (skill) attr.skill = String(skill);
      } else {
        attr.tool = tool;
        // file basename is safe; commands/content are NOT (may carry secrets)
        const fp = h.tool_input && h.tool_input.file_path;
        if (fp && PATH_TOOLS.has(tool)) attr.path = path.basename(String(fp));
        // Spawn tools carry the subagent type — a type NAME, as safe as a tool name.
        // This is the most reliable spawn signal we have: Agent tool-calls matched
        // SubagentStart exactly, per project, over 7 weeks (see PHASE6-TRACK-C § C2a).
        if (SPAWN_TOOLS.has(tool)) {
          const st = h.tool_input && h.tool_input.subagent_type;
          if (st) attr.subagent_type = String(st);
        }
      }
      break;
    }
    case "SubagentStart":
      agent = {};
      if (h.agent_id) agent.id = h.agent_id;
      if (h.agent_type) agent.type = h.agent_type;
      break;
    case "SubagentStop":
      // The hook registered as SubagentStop also fires at MAIN-SESSION turn end in
      // this Claude Code version: projects with zero spawns still produced stops
      // (one project: 70 stops vs 71 prompt.submit, 0 Agent calls). Those turn-end
      // events carry no agent_type, real subagent stops do (68 typed stops ↔ 71
      // starts). Discriminate on that so the subagent count stays honest, and keep
      // the turn boundary under its own name rather than dropping it.
      agent = {};
      if (h.agent_id) agent.id = h.agent_id;
      if (h.agent_type) {
        agent.type = h.agent_type;
      } else {
        ev = "turn.end";
      }
      break;
    case "TaskCompleted":
      if (h.task_title) attr.title = String(h.task_title);
      break;
    case "PreCompact":
      if (h.trigger) attr.trigger = h.trigger;
      break;
  }

  // v2: an event fired inside a subagent belongs to that subagent. Claude Code puts
  // agent_id/agent_type on the hook input only there (PostToolUse does fire inside
  // subagents — checked against real session transcripts). Subagent
  // lifecycle events keep the `agent` set above: the subagent they concern.
  if (!agent && h.agent_id) {
    agent = { id: h.agent_id };
    if (h.agent_type) agent.type = h.agent_type;
  }

  const rec = {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    ev,
    src: "hook",
    session: h.session_id || null,
    prompt: h.prompt_id || null,
    project: path.basename(cwd),
    ...(agent ? { agent } : {}),
    attr,
  };

  try {
    fs.appendFileSync(path.join(stateDir, "events.jsonl"), JSON.stringify(rec) + "\n");
  } catch {
    // fail open
  }
}

main();
