#!/usr/bin/env node
"use strict";
/**
 * test-hooks.js — checks for the hook scripts in this directory.
 *
 *   node ~/.claude/hooks/test-hooks.js        (Bash tool)
 *   node "$env:USERPROFILE\.claude\hooks\test-hooks.js"   (PowerShell tool)
 *
 * Runs reanchor.js, write-reminder.js, emit-event.js and log-event.js as child
 * processes against a throwaway project in the temp dir, with hook inputs built by
 * JSON.stringify — so Windows paths with backslashes arrive the way Claude Code
 * sends them. Exit 0 = all checks passed.
 *
 * What this proves: guards, roles, file classes, once-per-prompt, fail-open, what
 * reaches the log. What it cannot prove: that a hint reaches the model in a real
 * session — that needs a session (see workflow/observability.md § Trigger hooks).
 *
 * Run it after every change to a hook script. It touches nothing outside the temp dir.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const HOOKS = __dirname;
const W = fs.mkdtempSync(path.join(os.tmpdir(), "claude-hook-test-"));
const proj = path.join(W, "proj"); // state/ + code-writer def → an agent-team project
const noteam = path.join(W, "noteam"); // state/ only
const plain = path.join(W, "plain"); // neither
const log = path.join(proj, "state", "events.jsonl");
const REMINDER_DIR = path.join(os.tmpdir(), "claude-write-reminder");
const sess = "hook-test-" + process.pid;

function setup() {
  for (const d of [path.join(proj, "state", "leads"), path.join(proj, ".claude", "agents"), path.join(proj, "src"), path.join(noteam, "state"), plain]) {
    fs.mkdirSync(d, { recursive: true });
  }
  fs.writeFileSync(
    path.join(proj, "state", "STATUS.md"),
    [
      "# STATUS — Demo",
      "",
      "> One-page snapshot: where the team is RIGHT NOW.",
      "> History goes to JOURNAL.",
      "",
      "**Last updated:** 2026-10-13 (Session 4)",
      "**Phase:** 5 — IMPLEMENT (tags)",
      "**Tier of current work:** T1",
      "",
      "## Next step",
      "",
      "Wire the tag filter into the list screen.",
      "",
    ].join("\n")
  );
  fs.writeFileSync(path.join(proj, "state", "BLOCKERS.md"), "# BLOCKERS\n");
  fs.writeFileSync(path.join(proj, "state", "leads", "team-lead.md"), "# team-lead\n");
  fs.writeFileSync(path.join(proj, ".claude", "agents", "code-writer.md"), "---\nname: code-writer\n---\n");
  fs.writeFileSync(path.join(noteam, "state", "STATUS.md"), "# STATUS\n\nOnly a status file here.\n");
}

function cleanup() {
  try {
    fs.rmSync(W, { recursive: true, force: true });
  } catch {
    // leave it to the OS
  }
  for (const f of [sess, sess + "-np", sess + "-sh"]) {
    try {
      fs.unlinkSync(path.join(REMINDER_DIR, f + ".json"));
    } catch {
      // not written
    }
  }
}

let failed = 0;
let total = 0;
function run(script, input, opts = {}) {
  const r = spawnSync("node", [path.join(HOOKS, script), ...(opts.args || [])], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
  });
  return { out: r.stdout || "", err: r.stderr || "", code: r.status };
}
function check(name, cond, detail) {
  total++;
  if (!cond) failed++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${detail ? "  — " + detail : ""}`);
}
function lines() {
  try {
    return fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}
const last = () => lines().slice(-1)[0] || {};
const hint = (r) => {
  try {
    return JSON.parse(r.out).hookSpecificOutput.additionalContext;
  } catch {
    return null;
  }
};
const silent = (r) => r.out === "" && r.code === 0;

function testReanchor() {
  console.log("== reanchor.js (SessionStart, source compact) ==");
  const start = (over) => ({ hook_event_name: "SessionStart", source: "compact", session_id: sess, cwd: proj, ...over });

  let r = run("reanchor.js", start({}));
  check("compaction in a framework project → text", r.code === 0 && r.out.startsWith("[re-anchor after compaction]"));
  check("names the state files that exist", r.out.includes("state/STATUS.md, state/BLOCKERS.md, state/leads/team-lead.md"));
  check("says when STATUS.md was last written", /state\/STATUS\.md was last written .+ ago \(\d{4}-\d{2}-\d{2} \d{2}:\d{2}\)/.test(r.out));
  check("carries the STATUS head", r.out.includes("**Phase:** 5 — IMPLEMENT (tags)") && r.out.includes("Wire the tag filter"));
  check("drops the template's boilerplate quote", !r.out.includes("One-page snapshot"));
  check("no double blank lines in the head", !/\n\n\n/.test(r.out.split("--- state/STATUS.md")[1] || ""));

  r = run("reanchor.js", start({ cwd: noteam }));
  check("only STATUS.md present → names only that file", r.out.includes("from disk: state/STATUS.md. Do not"));
  check("source startup → silent", silent(run("reanchor.js", start({ source: "startup" }))));
  check("source resume → silent", silent(run("reanchor.js", start({ source: "resume" }))));
  check("inside a subagent → silent", silent(run("reanchor.js", start({ agent_id: "a1" }))));
  check("no state/ → silent", silent(run("reanchor.js", start({ cwd: plain }))));
  check("broken input → silent, exit 0", silent(run("reanchor.js", "not json")));
  check("empty input → silent, exit 0", silent(run("reanchor.js", "")));

  const long = Array.from({ length: 80 }, (_, i) => `line ${i + 1}`).join("\n");
  fs.writeFileSync(path.join(noteam, "state", "STATUS.md"), long);
  r = run("reanchor.js", start({ cwd: noteam }));
  check("long STATUS.md → cut after 30 lines and marked", r.out.includes("line 30") && !r.out.includes("line 31") && r.out.includes("head (file continues)"));
}

function testWriteReminder() {
  console.log("== write-reminder.js (PreToolUse) ==");
  try {
    fs.unlinkSync(log);
  } catch {
    // no log yet
  }
  const pre = (over) => ({
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    session_id: sess,
    prompt_id: "p1",
    cwd: proj,
    tool_input: { file_path: path.join(proj, "src", "app.ts"), content: "SECRET-CONTENT" },
    ...over,
  });
  const file = (...p) => ({ file_path: path.join(...p) });

  let r = run("write-reminder.js", pre({}));
  check("main session writes code → team-lead hint", r.code === 0 && /team-lead writes no production code/.test(hint(r) || ""));
  check(
    "team-lead hint names the T3 route and the recap line (since 2026-10-24)",
    /after a task was accepted/.test(hint(r) || "") &&
      /T3: `code-writer` with a task card, then `code-reviewer`/.test(hint(r) || "") &&
      /writer and review were skipped/.test(hint(r) || "")
  );
  check(
    "valid PreToolUse output without a permission decision",
    (() => {
      try {
        const o = JSON.parse(r.out).hookSpecificOutput;
        return o.hookEventName === "PreToolUse" && !("permissionDecision" in o);
      } catch {
        return false;
      }
    })()
  );
  check("same prompt again → silent", silent(run("write-reminder.js", pre({}))));
  check("same prompt, other file → silent", silent(run("write-reminder.js", pre({ tool_name: "Edit", tool_input: file(proj, "src", "other.ts") }))));
  check("next prompt → hint again", !!hint(run("write-reminder.js", pre({ prompt_id: "p2" }))));

  check("state/ file → silent", silent(run("write-reminder.js", pre({ prompt_id: "p3", tool_input: file(proj, "state", "STATUS.md") }))));
  check("docs/ file → silent", silent(run("write-reminder.js", pre({ prompt_id: "p3", tool_input: file(proj, "docs", "adr", "0001.md") }))));
  check("*.md → silent", silent(run("write-reminder.js", pre({ prompt_id: "p3", tool_input: file(proj, "README.md") }))));
  check(".claude/ file → silent", silent(run("write-reminder.js", pre({ prompt_id: "p3", tool_input: file(proj, ".claude", "settings.json") }))));
  check("graphify-out/ helper script → silent", silent(run("write-reminder.js", pre({ prompt_id: "p3", tool_input: file(proj, "graphify-out", "build_graph.py") }))));
  check("file outside the project → silent", silent(run("write-reminder.js", pre({ prompt_id: "p3", tool_input: file(os.homedir(), ".claude", "hooks", "x.js") }))));
  check("silent calls do not use up the prompt's reminder", !!hint(run("write-reminder.js", pre({ prompt_id: "p3", tool_input: file(proj, "src", "app.test.ts") }))));
  check("relative path → hint", !!hint(run("write-reminder.js", pre({ prompt_id: "p4", tool_input: { file_path: "src/rel.ts" } }))));
  check("Read tool → silent", silent(run("write-reminder.js", pre({ prompt_id: "p5", tool_name: "Read" }))));
  check("NotebookEdit → hint", !!hint(run("write-reminder.js", pre({ prompt_id: "p5", tool_name: "NotebookEdit", tool_input: { notebook_path: path.join(proj, "nb", "a.ipynb") } }))));

  const lead = (id, type) => pre({ prompt_id: "p6", agent_id: id, agent_type: type });
  check("backend-lead → lead hint", /lead plans, the writer implements/.test(hint(run("write-reminder.js", lead("ag-b", "backend-lead"))) || ""));
  check("same lead, same prompt → silent", silent(run("write-reminder.js", lead("ag-b", "backend-lead"))));
  check("second lead, same prompt → own hint", !!hint(run("write-reminder.js", lead("ag-f", "frontend-lead"))));
  check("main session in that prompt → own hint", /team-lead/.test(hint(run("write-reminder.js", pre({ prompt_id: "p6" }))) || ""));
  check("code-writer → silent", silent(run("write-reminder.js", pre({ prompt_id: "p7", agent_id: "ag-c", agent_type: "code-writer" }))));
  check("architect-lead → silent", silent(run("write-reminder.js", pre({ prompt_id: "p7", agent_id: "ag-a", agent_type: "architect-lead" }))));

  check("state/ but no agent team → silent", silent(run("write-reminder.js", pre({ prompt_id: "p8", cwd: noteam, tool_input: file(noteam, "a.py") }))));
  check("no state/ → silent", silent(run("write-reminder.js", pre({ prompt_id: "p8", cwd: plain, tool_input: file(plain, "a.py") }))));
  check("broken input → silent, exit 0", silent(run("write-reminder.js", "not json")));
  const noPrompt = pre({ prompt_id: undefined, session_id: sess + "-np" });
  check("no prompt id → once per session", !!hint(run("write-reminder.js", noPrompt)) && silent(run("write-reminder.js", noPrompt)));

  const rem = lines().filter((l) => l.ev === "reminder.write");
  const text = fs.readFileSync(log, "utf8");
  check("each reminder logged exactly once", rem.length === 9, `${rem.length} reminder.write lines`);
  check("log lines carry role + kind only", rem.every((l) => JSON.stringify(Object.keys(l.attr).sort()) === '["kind","role"]'));
  check("no path and no content in the log", !text.includes("SECRET-CONTENT") && !text.includes("app.ts"));
  check("lead reminder carries the agent", rem.some((l) => l.agent && l.agent.type === "backend-lead" && l.attr.role === "lead"));
  check("main-session reminder carries no agent", rem.some((l) => !l.agent && l.attr.role === "team-lead"));
  check("test file classed as test", rem.some((l) => l.attr.kind === "test"));
  check("session and prompt ids on the log line", rem.every((l) => l.session && l.v === 2) && rem.some((l) => l.prompt === "p1"));
}

function testShellReminder() {
  console.log("== write-reminder.js — writes through the shell, scripts under .claude/ ==");
  try {
    fs.unlinkSync(log);
  } catch {
    // no log yet
  }
  let n = 0; // a fresh prompt per check, so once-per-prompt never hides a result
  const sh = (command, over = {}) =>
    run("write-reminder.js", { hook_event_name: "PreToolUse", tool_name: "Bash", session_id: sess + "-sh", prompt_id: "s" + ++n, cwd: proj, tool_input: { command }, ...over });
  const ps = (command, over = {}) => sh(command, { tool_name: "PowerShell", ...over });
  const P = proj.replace(/\\/g, "/");
  const msysP = P.replace(/^([A-Za-z]):\//, (_, d) => "/" + d.toLowerCase() + "/");

  let r = sh(`cd "${P}" && sed -i 's/a/b/' src/app.ts`);
  check("sed -i on a code file → hint, with the shell note", /team-lead writes no production code/.test(hint(r) || "") && /through the shell/.test(hint(r) || ""));
  const same = { prompt_id: "s" + n };
  check("Edit in the same prompt → silent (one reminder per prompt)", silent(run("write-reminder.js", { hook_event_name: "PreToolUse", tool_name: "Edit", session_id: sess + "-sh", cwd: proj, tool_input: { file_path: path.join(proj, "src", "x.ts") }, ...same })));
  check("echo >> state/ACTIVITY.md → silent", silent(sh(`cd "${P}" && echo "$(date '+%Y-%m-%d %H:%M') team-lead commit abc" >> state/ACTIVITY.md`)));
  check("> /dev/null 2>&1 → silent", silent(sh("npm test > /dev/null 2>&1; echo $?")));
  check("'>' inside quotes → silent", silent(sh('grep -n "a > b" src/app.ts')));
  check("cat > code file with heredoc → hint", !!hint(sh("cat > src/b.ts <<'EOF'\nconst x = a > b ? 1 : 2;\nEOF")));
  check("heredoc body is content, not a command → silent", silent(sh("cat > notes.md <<'EOF'\nfs.writeFileSync('src/x.ts', '')\necho x > src/y.ts\nEOF")));
  check("python heredoc writing a test → lead hint", /lead plans/.test(hint(sh(`cd "${P}/src" && python - <<'EOF'\np='__tests__/a.test.ts'\ns=open(p).read()\nopen(p,'w',encoding='utf-8').write(s)\nEOF`, { agent_id: "ag-sh", agent_type: "backend-lead" })) || ""));
  check("python -c write_text → hint", !!hint(sh(`python -c "from pathlib import Path; Path('src/f.py').write_text('x')"`)));
  check("Git Bash path (/c/…) → hint", !!hint(sh(`cd ${msysP} && echo x > src/m.ts`)));
  check("PowerShell Set-Content → hint", !!hint(ps(`Set-Content -Path "${proj}\\src\\c.ts" -Value 'x'`)));
  check("PowerShell > $null → silent", silent(ps("npm run lint > $null")));
  check("target in a variable → silent (not shown)", silent(sh('echo x > "$OUT"')));
  check("variable set in the same command → resolved → hint", !!hint(sh('D=src; echo x > "$D/v.ts"')));
  check("temp targets → silent", silent(sh('git show HEAD:src/a.ts > "$TMPDIR/a.ts"; git diff | tee /tmp/d.patch')));
  check("unbalanced quotes → silent, exit 0", silent(sh("echo 'unbalanced > src/q.ts")));
  check("code-writer through the shell → silent", silent(sh("echo x > src/w.ts", { agent_id: "ag-w", agent_type: "code-writer" })));
  check("Read-only Bash → silent", silent(sh("git status --short && ls src")));
  const scr = (file, over = {}) =>
    run("write-reminder.js", { hook_event_name: "PreToolUse", tool_name: "Write", session_id: sess + "-sh", prompt_id: "s" + ++n, cwd: proj, tool_input: { file_path: file }, ...over });
  check("script under .claude/skills → hint (code since 2026-10-14)", !!hint(scr(path.join(proj, ".claude", "skills", "x", "scripts", "start.ps1"))));
  check("SKILL.md under .claude/skills → silent", silent(scr(path.join(proj, ".claude", "skills", "x", "SKILL.md"))));
  check("hook script under .claude/hooks → hint", !!hint(scr(path.join(proj, ".claude", "hooks", "guard.js"))));
  check("agent definition under .claude/agents → silent", silent(scr(path.join(proj, ".claude", "agents", "code-writer.md"))));

  const rem = lines().filter((l) => l.ev === "reminder.write");
  const text = fs.readFileSync(log, "utf8");
  check("shell reminders logged with via:shell", rem.filter((l) => l.attr.via === "shell").length === 7, `${rem.filter((l) => l.attr.via === "shell").length} with via:shell`);
  check("Write reminders carry no via", rem.filter((l) => !l.attr.via).length === 2);
  check("no command text in the log", !text.includes("sed -i") && !text.includes("Set-Content") && !text.includes("app.ts"));
}

function testClosedMarker() {
  console.log("== emit-event.js + log-event.js (session.closed marker) ==");
  try {
    fs.unlinkSync(log);
  } catch {
    // no log yet
  }
  const end = (session) => run("emit-event.js", { hook_event_name: "SessionEnd", reason: "other", session_id: session, cwd: proj });

  end("s-open");
  check("no marker → closed:false", last().ev === "session.end" && last().attr.closed === false);

  let r = run("log-event.js", "", { cwd: proj, args: ["session.closed"], env: { CLAUDE_CODE_SESSION_ID: "s-clean", CLAUDE_SESSION_ID: "" } });
  check("log-event writes the marker with the session id", r.code === 0 && last().ev === "session.closed" && last().session === "s-clean");
  end("s-clean");
  check("marker of this session → closed:true", last().attr.closed === true && last().attr.reason === "other");
  end("s-other");
  check("another session's marker does not count", last().attr.closed === false);

  r = run("log-event.js", "", { cwd: plain, args: ["session.closed"], env: { CLAUDE_CODE_SESSION_ID: "s-x" } });
  check("log-event without state/ → no-op, exit 0", r.code === 0 && !fs.existsSync(path.join(plain, "state")));
  r = run("log-event.js", "", { cwd: proj, args: ["gate.result", '{"result":"PASS"}'], env: { CLAUDE_CODE_SESSION_ID: "s1" } });
  check("log-event still carries attrs", last().ev === "gate.result" && last().attr.result === "PASS" && last().src === "lead");

  run("emit-event.js", { hook_event_name: "PostToolUse", tool_name: "Edit", session_id: "s1", prompt_id: "p1", cwd: proj, tool_input: { file_path: path.join(proj, "src", "a.ts"), new_string: "SECRET-CONTENT" } });
  check("tool.use unchanged (basename only, no closed flag)", last().ev === "tool.use" && last().attr.path === "a.ts" && !("closed" in last().attr));
  run("emit-event.js", { hook_event_name: "SessionStart", source: "compact", session_id: "s1", cwd: proj });
  check("session.start unchanged", last().ev === "session.start" && last().attr.source === "compact");
  run("emit-event.js", { hook_event_name: "UserPromptSubmit", prompt: "SECRET-CONTENT here", session_id: "s1", cwd: proj });
  check("prompt.submit logs the length, not the text", last().ev === "prompt.submit" && last().attr.len === 19 && !fs.readFileSync(log, "utf8").includes("SECRET-CONTENT"));

  // A marker far behind the tail, and the time budget on a large log.
  const filler = JSON.stringify({ v: 2, ts: new Date().toISOString(), ev: "tool.use", src: "hook", session: "s-big", prompt: "p", project: "proj", attr: { tool: "Read", path: "x.ts" } }) + "\n";
  const marker = JSON.stringify({ v: 2, ev: "session.closed", src: "lead", session: "s-big", attr: {} }) + "\n";
  fs.appendFileSync(log, marker);
  fs.appendFileSync(log, filler.repeat(60000)); // roughly 8 MB after the marker
  const t0 = Date.now();
  end("s-big");
  const ms = Date.now() - t0;
  check("marker far behind the tail → closed:false", last().attr.closed === false, `log ${(fs.statSync(log).size / 1048576).toFixed(1)} MB`);
  check("session.end on a large log stays far below the 1.5 s budget", ms < 1000, `${ms} ms incl. node start`);
  fs.appendFileSync(log, marker);
  end("s-big");
  check("recent marker on the large log → closed:true", last().attr.closed === true);
}

try {
  setup();
  testReanchor();
  testWriteReminder();
  testShellReminder();
  testClosedMarker();
} finally {
  cleanup();
}

console.log(failed ? `\n${failed} of ${total} checks FAILED` : `\nall ${total} checks passed`);
process.exit(failed ? 1 : 0);
