# Install

The framework lives in your Claude Code config directory (`~/.claude`) and is driven by a Claude Code skill. Installing means copying three directories into `~/.claude` and registering the hooks.

## Requirements

- [Claude Code](https://www.claude.com/product/claude-code)
- Node.js — for the hooks (`hooks/*.js`)
- Python — optional, only for the graphify knowledge-graph hook

## 1. Copy the directories

```bash
git clone https://github.com/mbtech1804/claude-code-se-team
cd claude-code-se-team

cp -r skills/*        ~/.claude/skills/
cp -r hooks/*         ~/.claude/hooks/
cp -r agent-knowledge ~/.claude/agent-knowledge
```

On Windows, `~/.claude` is `C:\Users\<you>\.claude`. Copy the same three directories into it.

> If you already have skills or hooks in `~/.claude`, review for name collisions before copying. The skills shipped here are: `new-code-project-setup`, `review-all`, `review-quick`, `new-agent`, `capture-learning`, `start-session`, `checkpoint`, `end-session`, `graphify`, `github-action-builder`, `html-coding-agent`.

## 2. Register the hooks

Two kinds of hooks, all global, all active only in projects that have a `state/` directory (i.e. projects scaffolded by this framework). They fail open — an error never breaks a session.

- **Event log** (`emit-event.js`, optional) — writes a structured, redacted event log to `<project>/state/events.jsonl`. It never logs prompt text, tool input/output, or secrets. Skipping it does not affect the workflow; you only lose the log.
- **Trigger hooks** (recommended) — deliver a rule at the moment it matters, because a rule that only stands in a `CLAUDE.md` wears off in long sessions:
  - `reanchor.js` — after a compaction, tells the model to re-read the state files and how old `state/STATUS.md` is.
  - `write-reminder.js` — when the team-lead or an implementing lead is about to write a code or test file (also through the shell), reminds it to hand the step to `code-writer`. A reminder, never a block.

Add the following to the `hooks` section of `~/.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] },
      { "matcher": "compact", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/reanchor.js" }] }
    ],
    "PreToolUse": [
      { "matcher": "Edit|Write|NotebookEdit|Bash|PowerShell", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/write-reminder.js" }] }
    ],
    "SessionEnd":        [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "UserPromptSubmit":  [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "SubagentStart":     [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "SubagentStop":      [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "TaskCompleted":     [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "PreCompact":        [{ "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }],
    "PostToolUse":       [{ "matcher": "*", "hooks": [{ "type": "command", "command": "node ~/.claude/hooks/emit-event.js" }] }]
  }
}
```

Check the hook scripts in a throwaway directory (nothing in your projects is touched):

```bash
node ~/.claude/hooks/test-hooks.js
```

Details: the event schema and the trigger hooks in [`agent-knowledge/workflow/observability.md`](agent-knowledge/workflow/observability.md). On Windows, Claude Code runs hook commands in Git Bash, where `~` expands.

## 3. Scaffold a project

In Claude Code, open an empty project directory and run:

```
/new-code-project-setup
```

The skill asks four questions — project name, short description, primary language, and OS — then generates:

- `CLAUDE.md` — project instructions (with the tech-stack sections left as clearly-marked TODOs)
- `state/` — the working-memory files (`STATUS`, `BACKLOG`, `BLOCKERS`, `JOURNAL`, `ACTIVITY`, and the team-lead lead file)
- `.claude/agents/` — all thirteen agent definitions, copied verbatim: the nine worker subagents and the four domain leads
- `docs/adr/0001-project-foundation.md` — the first architecture-decision record, ready to fill
- `.gitignore`, `.claude/settings.json`

**No tech stack is chosen by the scaffolder.** The stack is decided afterwards, with you, in Phase 0 — which also records which domain leads (architect / backend / frontend / design) are active for the project. Close Phase 0 with `/end-session` and start the first task in a new session, so every agent definition is loaded.

See [`skills/new-code-project-setup/SKILL.md`](skills/new-code-project-setup/SKILL.md) for the exact procedure.

## Uninstall

Remove the copied directories from `~/.claude` (`agent-knowledge/`, the listed skills under `skills/`, and `hooks/emit-event.js`, `hooks/log-event.js`, `hooks/reanchor.js`, `hooks/write-reminder.js`, `hooks/test-hooks.js`), and delete the hook entries from `~/.claude/settings.json`.
