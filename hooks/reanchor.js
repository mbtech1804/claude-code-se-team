#!/usr/bin/env node
"use strict";
/**
 * reanchor.js — SessionStart(compact) hook: put the working state back in front of
 * the model after a compaction.
 *
 * Measured before this existed: after two of three compactions the session went on
 * without re-reading any state file — it worked from the summary alone. A rule in
 * CLAUDE.md did not change that; an event has to deliver it.
 *
 * Registered globally in ~/.claude/settings.json under SessionStart with the matcher
 * "compact". Prints plain text to stdout, which Claude Code adds to the context:
 *  - the instruction to re-read the state files that exist,
 *  - how long ago state/STATUS.md was last written (the nearest thing to "last
 *    checkpoint" a hook can know — /checkpoint and /end-session both rewrite it),
 *  - the head of state/STATUS.md.
 *
 * Contract (same as emit-event.js):
 *  - Guard: no-op unless <cwd>/state/STATUS.md exists.
 *  - Main session only: a subagent's SessionStart is skipped.
 *  - Fails open: any parse/IO error → exit 0, no output.
 *  - Writes nothing to disk and nothing to the event log — the STATUS text goes to
 *    the model's context only.
 *
 * See ~/.claude/agent-knowledge/workflow/observability.md.
 */
const fs = require("fs");
const path = require("path");

const HEAD_MAX_LINES = 30;
const HEAD_MAX_CHARS = 2400;

// State files worth re-reading, in reading order. Only those that exist are named.
const STATE_FILES = ["state/STATUS.md", "state/BLOCKERS.md", "state/leads/team-lead.md"];

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function ago(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 1) return "less than a minute";
  if (min < 90) return `${min} minute${min === 1 ? "" : "s"}`;
  const h = Math.round(min / 60);
  if (h < 36) return `${h} hours`;
  return `${Math.round(h / 24)} days`;
}

function localStamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// The head of STATUS.md: its first lines, minus the template's boilerplate quote.
// Section names differ per project ("Next step", "Kaltstart: …"), so this cuts by
// position, not by heading — the convention is that the next step comes first.
function statusHead(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const kept = [];
  let chars = 0;
  let i = 0;
  for (; i < lines.length && kept.length < HEAD_MAX_LINES; i++) {
    const line = lines[i];
    if (i < 6 && line.startsWith(">")) continue; // "> One-page snapshot …" boilerplate
    const blank = line.trim() === "";
    if (blank && (kept.length === 0 || kept[kept.length - 1].trim() === "")) continue; // no leading/double blanks
    if (chars + line.length > HEAD_MAX_CHARS) break;
    kept.push(line);
    chars += line.length + 1;
  }
  while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
  return { head: kept.join("\n"), truncated: lines.slice(i).some((l) => l.trim() !== "") };
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

  // The matcher already limits this to compactions; checked again so a wrong
  // registration can't make every session start print the state.
  if (h.hook_event_name !== "SessionStart" || h.source !== "compact") return;
  if (h.agent_id) return; // main session only

  const cwd = h.cwd || process.cwd();
  const statusPath = path.join(cwd, "state", "STATUS.md");
  let text, mtime;
  try {
    mtime = fs.statSync(statusPath).mtime;
    text = fs.readFileSync(statusPath, "utf8");
  } catch {
    return; // not a framework project
  }

  const files = STATE_FILES.filter((f) => {
    try {
      return fs.statSync(path.join(cwd, f)).isFile();
    } catch {
      return false;
    }
  });

  const { head, truncated } = statusHead(text);
  const out = [
    "[re-anchor after compaction]",
    "The conversation was just compacted; the summary above is lossy. Before you continue, " +
      `re-read the working state from disk: ${files.join(", ")}. Do not act on the summary alone.`,
    "",
    `state/STATUS.md was last written ${ago(Date.now() - mtime.getTime())} ago (${localStamp(mtime)}). ` +
      "If work from this session is not in the state files yet, bring them up to date (/checkpoint) before going on.",
    "",
    `--- state/STATUS.md, head${truncated ? " (file continues)" : ""} ---`,
    head,
    "--- end ---",
  ].join("\n");

  process.stdout.write(out + "\n");
}

try {
  main();
} catch {
  // fail open
}
