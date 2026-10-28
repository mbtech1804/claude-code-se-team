# graphify — knowledge graph tooling

Builds a knowledge graph of the codebase at `graphify-out/` (god nodes, communities,
cross-file relationships). Used to answer codebase questions with a scoped subgraph instead
of blind grepping.

## How to invoke (Windows-critical)

- **On Windows, the bare `graphify` CLI command is unreliable / not on PATH** (checked again
  2026-10-26: not on PATH, `python -m graphify query|path|explain` works). Use the module form:
  `python -m graphify ...`.
- **Install the git hook:** `python -m graphify hook install` — runs as part of
  `/new-code-project-setup`. The hook keeps the graph fresh on commits.
- **Inside agent skills, prefer the skill invocation** `/graphify . --update` over a raw
  CLI call. The `--update` path is AST-only → **no API cost**, safe to run often.

## Query patterns (use before grepping)

| Command | When |
|---|---|
| `python -m graphify query "<question>"` | Focused codebase question. Returns a scoped subgraph, usually far smaller than GRAPH_REPORT.md. |
| `python -m graphify path "<A>" "<B>"` | Relationship between two concepts/files. |
| `python -m graphify explain "<concept>"` | Focused concept expansion. |
| `graphify-out/wiki/index.md` | Broad navigation instead of raw source browsing. |
| `graphify-out/GRAPH_REPORT.md` | Only for broad architecture review when query/path/explain don't surface enough. |

## What works

- **Query first, grep second.** The scoped subgraph is cheaper and more accurate than a
  raw grep dump for "how does X relate to Y" questions.
- **`--update` after every code change.** AST-only, no API cost — keeps the graph from
  going stale. Wired into `/checkpoint` and `/end-session` (only when code changed).

## Failure modes seen

- **`graphify update .` as a raw CLI command failed on Windows.** Fixed by switching skills
  to the `/graphify . --update` skill invocation. Carry this: on Windows, prefer the skill
  or `python -m graphify`, never assume the bare binary works.
- **Stale graph after code changes.** If you change code and don't update, query results
  silently lie. The checkpoint/end-session skills guard this.
- **Git-hook auto-rebuild and the manual `/graphify . --update` skill can desync.** The
  installed git hook (`python -m graphify hook install`) rebuilds the graph in the
  background on every commit; the skill's own incremental path tracks its own
  `manifest.json`. If the hook's background rebuild is interrupted or hits its own guard (a
  `WARNING: new graph has fewer nodes than existing... Refusing to overwrite` in
  `graphify-rebuild.log`), the manifest can drift from the real file tree —
  `detect_incremental` then reports files that demonstrably still exist as "deleted".
  **Never blindly run the merge/prune step in that state**; it would delete valid graph
  nodes for real files. Before trusting `detect_incremental`'s output, spot-check a few
  "deleted" entries against the actual filesystem (`test -f`/`ls`); if they exist, stop and
  investigate the hook log instead of forcing an update.

## Setup checklist for a new project

- [ ] `python -m graphify hook install` run during setup.
- [ ] `graphify-out/` added to `.gitignore` (generated artifact).
- [ ] CLAUDE.md § graphify block present so future sessions know to query-first.
