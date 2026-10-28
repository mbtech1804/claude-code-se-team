# Git & hooks

## Multi-line git commit messages on Windows — use PowerShell here-strings

**Scope:** `platform:windows`

When running `git commit -m "..."` with a multi-line body via the PowerShell
tool, bash heredoc syntax (`$(cat <<'EOF'...'EOF')`) fails with a parser error.
Use a PowerShell single-quoted here-string instead:

```powershell
git commit -m @'
Commit subject line

- bullet 1
- bullet 2

Co-Authored-By: ...
'@
```

The closing `'@` must be at column 0 (no indentation). This is the reliable
form for multi-line commit messages from the PowerShell tool on Windows.
Applies whenever a commit body (bullets, trailers, long description) is needed.
In the **Bash tool** a quoted heredoc works instead (`git commit -F - <<'EOF' … EOF`) — the
syntax follows the tool that runs the command (`anti-patterns.md` #3).

---

## Git conventions

- **Commit/push only when the human asks.** Skills like `/checkpoint` and `/end-session`
  *warn* about uncommitted changes but never commit, stash, or alter git state. The commit
  is always the human's decision.
- **Branching and `state/` depend on whether the repo has a remote** (decided after counting the
  practice):
  - **With a remote (GitHub):** branch before committing — never straight to the default
    branch — and keep `state/`, graph output and local artifacts out of the remote.
  - **Local only:** commit on `main`, and version `state/` — its history is a measuring source
    (`workflow/observability.md` § Analysing reads `git log -p state/ACTIVITY.md`). The
    template's `base.gitignore` does not ignore `state/`.
  - Push only when the human asks, either way.
- Commit messages and PR bodies end with the standard Claude co-author / generated-by
  trailers.

## Hooks in use

- **graphify hook:** `python -m graphify hook install` — keeps the knowledge graph current
  on commits. Installed during `/new-code-project-setup`. See `graphify.md`.
- **Formatter on save:** Prettier/Black/gofmt/equivalent runs on save, not as a review
  concern. Formatting discussions are out of scope for `code-reviewer` (CLAUDE.md § Code
  rules #10). Beware the formatter-race hazard it creates — see `anti-patterns.md` #9.

## What works

- **Skills warn, humans commit.** Keeping git mutations out of automated skills prevented
  surprise commits and kept auth/secret/PII changes behind explicit human sign-off.
- **`.gitignore` from the start.** `.env`, `node_modules/` (and language equivalents), and
  `graphify-out/` are ignored at init so secrets and generated artifacts never get staged.

## `git rm --cached` on Windows — use Bash tool, not PowerShell tool

When staging file deletions with `git rm --cached <path>` on Windows, use the Claude
Code **Bash tool** (Git Bash), not the PowerShell tool. The PowerShell tool can
misinterpret drive-rooted Windows paths (`E:\Project\...`) in ways that silently leave
files unstaged.

```bash
# Bash tool — works reliably on Windows
git rm --cached "relative/path/to/file"
```

This is about which Claude Code *tool* to invoke, not about shell command syntax (see
`anti-patterns.md` #3 for the general shell-context rule). The Bash tool calls Git
Bash, which handles Windows paths correctly for git operations.

---

## Failure modes seen

- **Formatter race after Write/Edit.** Canonical entry: `anti-patterns.md` #9 (a PostToolUse
  formatter rewrites the file after the tool call; a follow-up Edit with a stale `old_string`
  then misses → re-Read before the dependent edit).
- **Assuming uncommitted = safe.** Uncommitted changes survive `/clear` (they're on disk)
  but are unbacked-up and outside the MD history. The skills surface this as a warning.

## Setup checklist for a new project

- [ ] `git init` run during setup (if the human wants a repo).
- [ ] `.gitignore` written with `.env`, deps dir, `graphify-out/`.
- [ ] graphify hook installed.
- [ ] No commit performed automatically — only on explicit ask.
