# settings.json & shell-context discipline

The project's `.claude/settings.json` holds hooks (reminders, formatters) and project
config. The recurring hazard here is using the **wrong shell syntax for the execution
context** — and there are two different contexts that are easy to conflate.

## The shell context for hooks (don't conflate it with interactive)

The general rule — match shell syntax to the execution context, *not* "PowerShell
everywhere" — is `anti-patterns.md` #3. Read it for the full rule. The point specific to
this file:

**Command hooks in `settings.json` run through Claude Code's command-hook mechanism — a
bash-compatible shell (Git Bash on Windows).** So hook command strings use **bash** syntax:
`"$PY" -c ...`, `case … esac`, `[ -f … ]`, `2>/dev/null`, `|| true` — never PowerShell.
(Commands run during a session use the syntax of the tool that runs them: the Bash tool takes
bash, the PowerShell tool PowerShell 5.1.) The graphify reminder hook in
`templates/settings/base.settings.json` is exactly this bash form.

## What works

- **Reuse the proven conditional graphify hook verbatim.** It fires only on grep/find-style
  Bash commands AND only when `graphify-out/graph.json` exists, and it emits the correct
  `{"hookSpecificOutput":{"additionalContext":…}}` JSON. A naive `echo '…'` hook is wrong
  twice: it fires on every Bash call and its plain stdout isn't injected as context.
- **Keep settings minimal at init.** Only the stack-agnostic graphify hook. Stack-specific
  hooks (formatter, test runners) come in Phase 0 once the stack is known.
- **Formatter as a marked placeholder.** JSON has no comments — use a top-level `_comment` /
  `_phase0_todo` string key (Claude Code ignores unknown keys), not a junk key inside
  `hooks`.
- **A global emitter hook must guard, fail open, and redact.** A hook registered in
  `~/.claude/settings.json` (not a project's) fires in *every* project. Make it a no-op unless a
  project marker exists (e.g. `<cwd>/state/`) so it never litters unrelated dirs; **fail open**
  (any parse/IO error → exit 0) so a logger can never break a session; and **whitelist** fields —
  a tool *name*, a file *basename*, sizes/counts, never raw `tool_input`/`tool_output` or prompt
  text (mirror OTEL redact-by-default). Proven form: `~/.claude/hooks/emit-event.js`;
  the semantic producer `log-event.js` follows the same contract. See `workflow/observability.md`.
- **A hook that hands the model a rule must not be able to stop it.** The two trigger hooks
  (`reanchor.js` on `SessionStart`/`compact`, `write-reminder.js` on `PreToolUse`, both global)
  only add context: plain stdout or `hookSpecificOutput.additionalContext`,
  always exit 0, never a `permissionDecision`. On `PreToolUse`, exit 2 blocks the tool call — a
  reminder script that can crash into a non-zero exit is a lock by accident, so wrap `main()` and
  fail open. Narrow the guard to where the advice can be followed (a reminder to "hand it to
  `code-writer`" needs a `code-writer` def, not just a `state/` dir), and remind once per prompt,
  not on every call — a hint on every write is noise that gets ignored.

## Failure modes seen

- **Plain `echo` "reminder" hook.** Fires on every Bash call and outputs raw text instead of
  the `hookSpecificOutput` JSON, so it never actually injects context. Use the conditional
  JSON-emitting pattern.
- **Over-stuffing settings at init.** Stack-specific hooks before the stack exists are dead
  config. YAGNI.
- **A hook that assumes `python3`** (`platform:windows`). On Windows `python3` is often the
  Microsoft Store stub: it prints "Python was not found", exits non-zero, and with
  `2>/dev/null || true` the hook stays silent — the graphify reminder never fired in a freshly
  scaffolded project. The first repair there, `command -v python3 || command -v python`, did not
  help either: the stub *exists*, so the existence check picks it. It takes a function test.
  Try `python`, `python3`, `py` in turn on the real input and use the first that succeeds (the
  template hook does this). Prove a hint hook by running its command once by
  hand in Git Bash and seeing the JSON come out. **Not only the template's hook:** a project's own
  Phase 0 formatter hook used the same `python3` call and had never formatted a file —
  when refreshing, run *every* hook in the project's settings once.
- **`npx` in a hook resolves from the hook's working directory** (`stack:node`) — the project root, not
  the edited file's package. With Prettier installed only in `backend/`, the hook picked a cached
  newer Prettier instead of the project's. Run the formatter from the file's package:
  `cd "${FILE%%backend*}backend" && npx --no -- prettier --write "$FILE"` — `--no` never downloads;
  without `--`, a `--version` after it prints npm's own version.
- **PowerShell doesn't deliver piped stdin to a native exe** (`platform:windows`). `'…json…' |
  node hook.js` gives the script *empty* stdin under Windows PowerShell 5.1, so a stdin-driven
  hook silently reads nothing and no-ops — not a script bug; it runs fine in its real runtime.
  Test stdin-driven `settings.json` hooks in **Git Bash** (the actual hook shell), not by piping
  in PowerShell. Related: Node `fs` rejects Git-Bash `/c/Users/…` paths — pass Windows
  `C:/Users/…` (forward slashes ok) to `node`; keep `/c/…` only for bash built-ins (`cat`, `rm`).

- **`MSYS_NO_PATHCONV=1` breaks every `node ~/.claude/hooks/…` hook** (`platform:windows`). The hook
  commands rely on Git Bash turning `/c/Users/…` into a Windows path for `node`. With path
  conversion switched off in the environment the session inherits, each hook fails with
  `Cannot find module 'C:\c\Users\…'` — and since the hooks fail open, the only trace is a hook
  error line on stderr. Seen while passing `/compact` to a headless `claude -p` from Git
  Bash: without the switch the argument itself was converted (`/compact` arrived as
  `C:/Program Files/Git/compact`), with it the hooks died. Pass such a prompt on stdin instead
  (`printf '/compact' | claude -p …`) and leave the environment alone.
- **A fail-open hook turns a broken test input into a false "silent".** Hand-written JSON on a
  bash command line lost its doubled backslashes, the Windows path made the JSON invalid, and the
  hook exited 0 without output — exactly what a correct guard does. Build hook inputs with
  `JSON.stringify` in a small driver, and for every input shape include one case that must produce
  output (`~/.claude/hooks/test-hooks.js`).

## Setup checklist for a new project

- [ ] `.claude/settings.json` created from `templates/settings/base.settings.json`.
- [ ] Conditional graphify reminder hook present (bash, JSON output).
- [ ] Formatter hook left as a top-level placeholder until the Phase 0 stack decision.
- [ ] Hook command strings use bash (`anti-patterns.md` #3).
