#!/usr/bin/env node
"use strict";
/**
 * write-reminder.js — PreToolUse(Edit|Write|NotebookEdit|Bash|PowerShell) hook:
 * remind the team-lead and the implementation leads who writes the code.
 *
 * Measured before this existed: in everyday projects the main session wrote 329 code
 * files itself although its role says "writes no production code". The rule was in
 * every CLAUDE.md; nothing delivered it at the moment of the write.
 *
 * A reminder, not a lock. It never blocks: it always exits 0, returns no permission
 * decision, and only adds `additionalContext`, which Claude sees next to the tool
 * result. If the human asked for the edit, the session simply carries on.
 *
 * Fires when all of these hold:
 *  - the project runs the agent team: <cwd>/state/ and
 *    <cwd>/.claude/agents/code-writer.md exist (otherwise there is nobody to hand to),
 *  - the target is a code or test file inside the project — same classes as
 *    the trial measuring script: not under state/, docs/, .claude/, not *.md, not temp
 *    (graphify-out/ counts as temp since 2026-10-24);
 *    a script under .claude/ (.ps1, .sh, .py, .js, …) is code (since 2026-10-14),
 *  - for Bash/PowerShell: the command writes such a file — a redirect `>`/`>>`, `tee`,
 *    `sed -i`, Set-Content/Add-Content/Out-File, Python `open(…, 'w')`/`write_text`,
 *    `writeFileSync`/`WriteAllText` (since 2026-10-14; same patterns as the measuring script).
 *    A target the command does not show (a variable, a composed path) does not remind,
 *  - the actor is the main session (the team-lead) or a backend-/frontend-lead,
 *  - that actor has not been reminded in this prompt yet.
 *
 * Each reminder also appends one `reminder.write` line to state/events.jsonl —
 * role, file class and, for the shell, `via` only; never a path, command or content —
 * so its effect can be measured.
 *
 * Contract (same as emit-event.js): guard, fail open, whitelist.
 * See ~/.claude/agent-knowledge/workflow/observability.md.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const SCHEMA_VERSION = 2; // keep in sync with emit-event.js

const WRITE_TOOLS = new Set(["Edit", "Write", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const LEADS = new Set(["backend-lead", "frontend-lead"]);
const ALLOWED_DIRS = new Set(["state", "docs", ".claude"]);
const TEST_DIRS = new Set(["__tests__", "tests", "test", "e2e"]);
// Scripts under .claude/ (skills, hooks) are code, not configuration.
const SCRIPT_EXT = /\.(ps1|psm1|sh|bash|zsh|py|js|mjs|cjs|ts|mts|cts|bat|cmd)$/;

// Writing through the shell. The command is parsed, never run; a heredoc body is file
// content unless it feeds an interpreter, whose own file writes are then looked for.
const PUNCT = ";&|<>()\n";
const NULL_TARGETS = new Set(["/dev/null", "$null", "nul", "/dev/stdout", "/dev/stderr"]);
const HEREDOC_RE = /(<<-?[ \t]*(['"]?)([A-Za-z_]\w*)\2[^\n]*)\n[\s\S]*?\n[ \t]*\3[ \t]*(?=\n|$)/g;
const HERESTRING_RE = /@(['"])\r?\n[\s\S]*?\r?\n\1@/g;
const COMMENT_LINE_RE = /^[ \t]*#.*$/gm;
const INTERP_RE = /(?:^|[\s;&|(])(?:python3?|py|node)(?:\.exe)?(?=\s|$)/m;
const PYTHON_WORD_RE = /^(?:python3?|py)(?:\.exe)?$/;
const PY_ASSIGN_RE = /\b(\w+)\s*=\s*(?:(?:pathlib\.)?Path\(\s*)?r?(['"])([^'"\n]+)\2/g;
const PY_OPEN_RE = /\bopen\(\s*((?:[^(),]|\([^()]*\))+?)\s*,\s*(?:mode\s*=\s*)?r?['"]([rwxabt+]+)['"]/g;
const PY_WRITE_TEXT_RE = /((?:pathlib\.)?Path\((?:[^()]|\([^()]*\))*\)|[\w.]+)\.write_(?:text|bytes)\(/g;
const LITERAL_WRITE_RE =
  /\b(?:writeFileSync|appendFileSync|WriteAllText|WriteAllLines|WriteAllBytes|AppendAllText)\(\s*r?(['"])([^'"\n]+)\1/g;
const PS_WRITE_CMDLETS = new Set(["set-content", "add-content", "out-file", "sc", "ac"]);
const PS_PATH_PARAMS = new Set(["-path", "-filepath", "-literalpath"]);
const UNCLEAR = "?";

const TEXT = {
  "team-lead":
    "Reminder (agent team): the team-lead writes no production code, and this is a code file — also " +
    "for a fix after a task was accepted. Name the tier first; a small fix is T3: `code-writer` with a " +
    "task card, then `code-reviewer`; tests go to `test-writer`; everything else to the responsible lead. " +
    "If the human explicitly asked you to make this edit yourself, carry on, and say in the recap that " +
    "writer and review were skipped. This note does not block anything.",
  lead:
    "Reminder (agent team): the lead plans, the writer implements. Hand substantial changes to " +
    "`code-writer` as a scoped task (goal · files · interface · acceptance) and tests to `test-writer`; " +
    "small corrections you may make yourself. This note does not block anything.",
};
const SHELL_NOTE = " This command writes a code file through the shell, which counts the same as an edit.";

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function exists(p, kind) {
  try {
    const s = fs.statSync(p);
    return kind === "dir" ? s.isDirectory() : s.isFile();
  } catch {
    return false;
  }
}

// code / test / allowed / temp / outside — mirrors classify() in the trial measuring script,
// plus "outside" for files that are not part of this project.
function classify(filePath, cwd) {
  const rel = path.relative(cwd, path.resolve(cwd, String(filePath)));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    const abs = String(filePath).replace(/\\/g, "/").toLowerCase();
    return abs.includes("/temp/claude/") || abs.includes("/scratchpad/") ? "temp" : "outside";
  }
  const parts = rel.replace(/\\/g, "/").toLowerCase().split("/");
  const name = parts[parts.length - 1];
  const dirs = parts.slice(0, -1);
  if (dirs.includes("graphify-out")) return "temp"; // /graphify's helper scripts and output (since 2026-10-24)
  const script = dirs.includes(".claude") && SCRIPT_EXT.test(name);
  if ((dirs.some((d) => ALLOWED_DIRS.has(d)) && !script) || name.endsWith(".md")) return "allowed";
  if (
    /\.(test|spec)\.[a-z0-9]+$/.test(name) ||
    name.startsWith("test_") ||
    name.endsWith("_test.py") ||
    dirs.some((d) => TEST_DIRS.has(d))
  ) {
    return "test";
  }
  return "code";
}

// ---------------------------------------------------------------- shell writes

const isOp = (t) => t.op;

// Words and operator runs, quote-aware: '…' is literal; in "…" the escape character only
// escapes a quote or itself (Windows paths keep their backslashes); outside quotes it
// escapes the next character. PowerShell escapes with a backtick. null = unbalanced quotes.
function tokenize(s, powershell) {
  const esc = powershell ? "`" : "\\";
  const toks = [];
  let cur = "";
  let word = false;
  const flush = () => {
    if (word) toks.push({ t: cur, op: false });
    cur = "";
    word = false;
  };
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    if (ch === "'") {
      const j = s.indexOf("'", i + 1);
      if (j < 0) return null;
      cur += s.slice(i + 1, j);
      word = true;
      i = j + 1;
    } else if (ch === '"') {
      let j = i + 1;
      while (j < s.length && s[j] !== '"') {
        if (s[j] === esc && (s[j + 1] === '"' || s[j + 1] === esc)) {
          cur += s[j + 1];
          j += 2;
        } else {
          cur += s[j];
          j += 1;
        }
      }
      if (j >= s.length) return null;
      word = true;
      i = j + 1;
    } else if (ch === esc && i + 1 < s.length) {
      cur += s[i + 1];
      word = true;
      i += 2;
    } else if (ch === " " || ch === "\t" || ch === "\r") {
      flush();
      i += 1;
    } else if (PUNCT.includes(ch)) {
      flush();
      let j = i;
      while (j < s.length && PUNCT.includes(s[j])) j += 1;
      toks.push({ t: s.slice(i, j), op: true });
      i = j;
    } else {
      cur += ch;
      word = true;
      i += 1;
    }
  }
  flush();
  return toks;
}

// Git Bash writes /e/dir for E:\dir.
const msys = (p) => p.replace(/\\/g, "/").replace(/^\/([a-zA-Z])\//, (_, d) => d.toUpperCase() + ":/");

function join(base, p) {
  const q = msys(p);
  if (!base || /^(?:[A-Za-z]:\/|\/|~|\$|%)/.test(q)) return q;
  return path.posix.normalize(msys(base).replace(/\/+$/, "") + "/" + q);
}

function pyTarget(arg, assigns, pos) {
  arg = arg.trim();
  const m = arg.match(/^r?(['"])(.+)\1$/) || arg.match(/^(?:pathlib\.)?Path\(\s*r?(['"])([^'"]+)\1\s*\)$/);
  if (m) return m[2];
  if (/^\w+$/.test(arg)) {
    const found = assigns.filter((a) => a.name === arg && a.at < pos);
    if (found.length) return found[found.length - 1].path;
  }
  return null;
}

// Files a Bash/PowerShell command writes, as far as the command shows them; UNCLEAR for a
// write whose file it does not show. Same patterns as shell_writes() in the measuring script.
function shellWrites(cmd, powershell) {
  const skel = cmd.replace(HEREDOC_RE, "$1").replace(HERESTRING_RE, "''").replace(COMMENT_LINE_RE, "");
  const programs = [];
  for (const m of cmd.matchAll(HEREDOC_RE)) {
    const line = cmd.slice(cmd.lastIndexOf("\n", m.index) + 1, m.index + m[1].length);
    if (INTERP_RE.test(line)) programs.push(m[0]);
  }
  if (INTERP_RE.test(skel)) programs.push(skel);
  const toks = tokenize(skel, powershell);
  const out = [];
  const env = {};
  let base = null;
  let pyBase = null;
  const resolve = (t) => {
    for (const [name, value] of Object.entries(env)) t = t.replace(new RegExp("\\$\\{?" + name + "\\b\\}?", "g"), () => value);
    return join(base, t);
  };

  const segs = [];
  let cur = [];
  for (const tok of toks || []) {
    if (tok.op && !tok.t.includes(">") && !tok.t.includes("<")) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push(tok);
  }
  if (cur.length) segs.push(cur);

  for (const seg of segs) {
    const words = seg.filter((x) => !isOp(x)).map((x) => x.t);
    if (!words.length) continue;
    const lead = words[0] === "export" ? words.slice(1) : words;
    if (lead.length && lead.every((w) => /^[A-Za-z_]\w*=/.test(w)) && !seg.some(isOp)) {
      for (const w of lead) env[w.slice(0, w.indexOf("="))] = w.slice(w.indexOf("=") + 1);
      continue;
    }
    const head = words[0].toLowerCase();
    if (["cd", "set-location", "sl", "pushd", "chdir"].includes(head)) {
      const dir = words.slice(1).find((a) => !a.startsWith("-") && a.toLowerCase() !== "/d");
      if (dir) base = base ? join(base, dir) : msys(dir);
      continue;
    }
    if (pyBase === null && words.slice(0, 2).some((w) => PYTHON_WORD_RE.test(w))) pyBase = base || "";
    seg.forEach((tok, i) => {
      if (tok.op && tok.t.includes(">") && !tok.t.endsWith("&")) {
        const next = seg[i + 1];
        if (next && !next.op && !NULL_TARGETS.has(next.t.toLowerCase())) out.push(resolve(next.t));
      }
    });
    const args = words.slice(1);
    if (head === "tee") {
      for (const a of args) if (!a.startsWith("-")) out.push(resolve(a));
    } else if (head === "sed" && args.some((a) => a === "--in-place" || (a.startsWith("-") && !a.startsWith("--") && a.slice(1).includes("i")))) {
      out.push(resolve(words[words.length - 1]));
    } else if (PS_WRITE_CMDLETS.has(head)) {
      const named = args.filter((a, j) => j > 0 && PS_PATH_PARAMS.has(args[j - 1].toLowerCase()));
      const positional = args.filter((a, j) => !a.startsWith("-") && (j === 0 || !args[j - 1].startsWith("-")));
      const target = named[0] || positional[0];
      out.push(target ? resolve(target) : UNCLEAR);
    }
  }

  const here = pyBase !== null ? pyBase : base;
  for (const code of programs) {
    const assigns = [...code.matchAll(PY_ASSIGN_RE)].map((m) => ({ name: m[1], path: m[3], at: m.index }));
    for (const m of code.matchAll(PY_OPEN_RE)) {
      if (!/[wax+]/.test(m[2])) continue;
      const p = pyTarget(m[1], assigns, m.index);
      out.push(p ? join(here, p) : UNCLEAR);
    }
    for (const m of code.matchAll(PY_WRITE_TEXT_RE)) {
      const p = pyTarget(m[1], assigns, m.index);
      out.push(p ? join(here, p) : UNCLEAR);
    }
    for (const m of code.matchAll(LITERAL_WRITE_RE)) out.push(join(here, m[2]));
  }
  return [...new Set(out)];
}

// classify() for a shell target: a temp variable or /tmp/ is temp, any other variable unclear.
function shellClass(target, cwd) {
  if (target === UNCLEAR) return "unclear";
  const p = target.toLowerCase();
  if (/\$\{?(?:env:)?(?:temp|tmp|tmpdir)\b|%te?mp%|(?:^|\/)tmp\//.test(p)) return "temp";
  if (p.includes("$") || p.includes("%")) return "unclear";
  return classify(target, cwd);
}

// ---------------------------------------------------------------- once per prompt

// Once per prompt and actor: a small per-session file in the temp dir remembers the
// prompt in which each actor was last reminded. No prompt id → once per session.
function alreadyReminded(sessionId, actorKey, promptId) {
  const dir = path.join(os.tmpdir(), "claude-write-reminder");
  const file = path.join(dir, String(sessionId || "no-session").replace(/[^a-zA-Z0-9_-]/g, "_") + ".json");
  let seen = {};
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) seen = parsed;
  } catch {
    // first reminder of this session
  }
  const prompt = String(promptId || "no-prompt");
  if (seen[actorKey] === prompt) return true;
  seen[actorKey] = prompt;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(seen));
  } catch {
    // can't remember → remind again next time rather than stay silent
  }
  return false;
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

  const viaShell = SHELL_TOOLS.has(h.tool_name);
  if (h.hook_event_name !== "PreToolUse" || !(WRITE_TOOLS.has(h.tool_name) || viaShell)) return;

  const cwd = h.cwd || process.cwd();
  const stateDir = path.join(cwd, "state");
  if (!exists(stateDir, "dir")) return;
  if (!exists(path.join(cwd, ".claude", "agents", "code-writer.md"), "file")) return;

  // Who is writing? No agent_id = the main session, i.e. the team-lead.
  let role;
  if (!h.agent_id) role = "team-lead";
  else if (LEADS.has(h.agent_type)) role = "lead";
  else return; // writers, reviewers, other leads: not addressed

  const input = h.tool_input || {};
  let kind;
  if (viaShell) {
    const kinds = shellWrites(String(input.command || ""), h.tool_name === "PowerShell").map((t) => shellClass(t, cwd));
    kind = kinds.includes("code") ? "code" : kinds.includes("test") ? "test" : null;
  } else {
    const filePath = input.file_path || input.notebook_path;
    if (!filePath) return;
    kind = classify(filePath, cwd);
  }
  if (kind !== "code" && kind !== "test") return;

  if (alreadyReminded(h.session_id, h.agent_id || "main", h.prompt_id)) return;

  try {
    const rec = {
      v: SCHEMA_VERSION,
      ts: new Date().toISOString(),
      ev: "reminder.write",
      src: "hook",
      session: h.session_id || null,
      prompt: h.prompt_id || null,
      project: path.basename(cwd),
      ...(h.agent_id ? { agent: { id: h.agent_id, ...(h.agent_type ? { type: h.agent_type } : {}) } } : {}),
      attr: { role, kind, ...(viaShell ? { via: "shell" } : {}) },
    };
    fs.appendFileSync(path.join(stateDir, "events.jsonl"), JSON.stringify(rec) + "\n");
  } catch {
    // fail open — the reminder matters more than its log line
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: TEXT[role] + (viaShell ? SHELL_NOTE : "") },
    }) + "\n"
  );
}

if (require.main === module) {
  try {
    main();
  } catch {
    // fail open
  }
}

module.exports = { shellWrites, shellClass, classify };
