# Claude Code + Codex CLI: quirks that change how a team is wired

**Scope:** universal

> ⏳ Verify after: 2026-12-01 — both CLIs ship weekly. Most of this comes from web research in
> 2026-09/10, **not from running it locally**; the installed versions then were Claude Code 2.1.173
> and Codex 0.149.0, both behind.

## Quota traps

- The built-in `Explore` subagent runs on the `opus` alias under a subscription login. A project
  `Explore` agent with `model: haiku` replaces it and stops exploration from eating the plan limit.
- A session or weekly limit applies to every model, so switching models does not help. Only a
  model-specific message ("You've hit your Opus limit") is cured by switching family.
- In `claude -p`, a set `ANTHROPIC_API_KEY` always wins over the subscription login and bills the
  API silently. Strip API-key variables from the environment of scripted calls.
- `claude -p --bare` skips hooks, skills, plugins and CLAUDE.md and needs an API key. It is
  announced as the future default for `-p`, so scripts should set the mode explicitly.

## Headless runs from the desktop app

Run locally (2026-10), unlike the rest of this file.

- The desktop app's login does not cover the terminal CLI. `claude -p` reads
  `~/.claude/.credentials.json`; with an expired token it fails with `401 OAuth access token has
  expired`, at no cost. The interactive CLI still greets with "Welcome back … <plan>" — that
  banner comes from cached account data and proves nothing. Only `/login` inside the CLI fixes it,
  and that is the human's step.
- The desktop app runs its own runtime (`$CLAUDE_CODE_EXECPATH`), which can be far ahead of the
  `claude` on PATH (2.1.295 against 2.1.173 at the time). Test hooks against the runtime the
  sessions really use, and strip the inherited `CLAUDE*`/`ANTHROPIC*` variables so the child is a
  session of its own. ⏳ Verify after: 2026-12-01.
- How to use such a run to prove a hook, and what it costs: `workflow/observability.md` § Trigger
  hooks. Git Bash traps when passing a slash command: `tooling/settings-json.md`.

## Enforcement gaps

- Plugin-shipped agents ignore `hooks`, `mcpServers` and `permissionMode` in their frontmatter.
  Agents that carry governance must be project agents (`.claude/agents/`).
- A specifier such as `Bash(git push *)` in a subagent's `disallowedTools` removes the whole Bash
  tool. Command-level limits belong in a `PreToolUse` hook, which receives `agent_type`.
- Agent Teams (experimental): the lead approves teammates' plans automatically, teammates share one
  working tree, and teams run only interactively. The in-tool plan approval is not a review gate.

## Calling Codex from Claude Code

- `codex mcp-server` was removed in Codex 0.154.0 (2026-09-09, PR #42993); MCP wrappers built on it
  are broken. The documented contract is `codex exec --json --output-schema <file> -o <file>`,
  read-only by default and usable with a ChatGPT login.
- The official plugin `openai/codex-plugin-cc` has had no commit since 2026-07-08 and is fragile on
  native Windows (silent cancel failures, a hanging stop hook, orphaned brokers locking worktrees).
- Run Codex calls one at a time per login: parallel processes sharing one `auth.json` can lock each
  other out when the refresh token rotates.
- Shared instructions: keep `AGENTS.md` canonical and import it from `CLAUDE.md` with `@AGENTS.md`.
  Claude Code reads `AGENTS.md` natively only when no `CLAUDE.md` exists, and symlinks need admin
  rights on Windows. Claude Code does not read `.agents/skills` — copy skills into both trees.

## Related

- `anti-patterns.md` #37 — why a wide fan-out on the strongest model fails as a unit.
- `workflow/tiers.md` § Model per tier — plan-limit headroom as the efficiency knob.
