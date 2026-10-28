# Claude Preview — the desktop app's browser pane

`preview_start` launches a dev server from `.claude/launch.json` and opens it in the desktop
app's browser pane, where Claude can look at and drive the page. Key quirks to know.

> **Tool names as of 2026-10-26:** `preview_start` / `preview_stop` / `preview_list` /
> `preview_logs` for the server; in the pane `navigate`, `computer` (action `screenshot`),
> `read_page` (accessibility tree), `get_page_text`, `javascript_tool` (run JS in the page).
> The older names `preview_screenshot`, `preview_eval` and `preview_snapshot` are gone.

## preview_start requires explicit restart for backend code changes

**Scope:** `universal`

`preview_start` reuses a server that is already running, and a running process is NOT
reloaded when backend source files are edited. To pick up changes in server.js, api.js, or
any backend module:

1. `preview_stop` — kills the running process
2. `preview_start` — starts a fresh process from the updated source

Applies to any server without hot-reload (Express, plain Node.js, etc.).
Servers with HMR/live-reload (Vite, Next.js dev) may not need this — but
when in doubt after a backend edit, stop and restart.

**Do NOT** reload the page (`navigate`, or `location.reload()` via `javascript_tool`) to pick
up Node.js changes — that only reloads the browser, not the server process.

**Before trusting a live-verification result, check the server's start time
(`preview_list`) against the edited file's mtime** — a stale server doesn't just give a wrong
answer, it can execute old logic against real data (e.g. an unfixed write
path accepting input it should now reject). See `anti-patterns.md` #21.

## Setup checklist

- [ ] `launch.json` created in `.claude/` with server name, command (`runtimeExecutable` /
      `runtimeArgs`) and port.
- [ ] After any backend source edit: `preview_stop` → `preview_start`.
- [ ] After frontend-only edits with HMR active: nothing, or reload the page.
- [ ] Read text and structure with `read_page` / `get_page_text`; take a screenshot only when
      the look itself matters — text is faster and cheaper.
