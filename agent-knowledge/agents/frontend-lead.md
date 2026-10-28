# Frontend Lead — setup & behavior

Owns client-side implementation: component tree, routing, data layer, UI state.
Drives the frontend through the 5-phase workflow on T1 work.

> **The rules are in the def** (`new-code-project-setup/templates/agents/frontend-lead.md`):
> boundaries, the Phase-3 structure sketch, implementing by task card, the four states, lists,
> token storage, legacy flows. This file keeps the *why* and what the def does not carry.

## Role boundaries (hard) — why

- **Plans, does not write feature code.** Background and the measurement
  behind it: `agents/backend-lead.md` § Role boundaries, `agents/subagents.md` § Failure modes
  seen.
- **The four-state rule** (loading / empty / error / success for every data-driven view) came from
  the design-lead's state-coverage doc; it prevents "happy-path only" UIs.

## What works

- **ES Modules as SRP enabler in vanilla JS — no build step needed.** (`stack:vanilla-js-browser`)
  When a browser JS file grows too large (1000+ lines), `type="module"` on the `<script>` tag
  enables `import`/`export` without webpack/vite/rollup.

  Before splitting, find the coupling point: a global mutable variable shared across functions
  (e.g. `_svgCtx`) is the typical obstacle. Fix: dependency injection — pass the shared value
  as a parameter instead of reading a global. Once all functions only depend on their arguments,
  the split is trivial.

  Suggested module split for a graph renderer:
  - `layout.js` — pure calculation (returns data, no DOM side effects)
  - `draw.js` — all drawing functions (stateless, target element as first param)
  - `graph.js` — coordinator (polling, SSE, view switching; imports from layout + draw)

  Gotchas: `type="module"` enables strict mode automatically (no `"use strict"` needed);
  modules are loaded as separate requests → `file://` won't work, local dev server required.

- **Cross-platform gotchas are real on Expo.** Some native modules don't exist on web (e.g. secure
  storage) — the def asks for the breakage points in EXPLORE; this is the example why.

## Setting up

The def is copied at init with the other twelve; Phase 0 records whether the frontend-lead is
active.
