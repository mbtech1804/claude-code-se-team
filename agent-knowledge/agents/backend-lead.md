# Backend Lead — setup & behavior

Owns server-side implementation: data model, API contract, business logic, migrations
(with Architect sign-off). Drives the backend through the 5-phase workflow on T1 work.

> **The rules are in the def** (`new-code-project-setup/templates/agents/backend-lead.md`):
> boundaries, the Phase-3 contract sketch, implementing by task card, and the backend rules it puts
> into the cards (validate at the boundary, forward-only migrations, cron that survives upstream
> failure). This file keeps the *why* and what the def does not carry.

## Role boundaries (hard) — why

- **Plans, does not write feature code.** An earlier def offered a choice ("write directly for
  scoped work, or delegate substantial chunks") and the split came out inverted — the lead wrote
  the big pieces. Why the choice was removed: `agents/subagents.md` § Failure modes seen.
- **A contract sketch before any code** (Phase 3 PROPOSE): cheap to change on paper, expensive in
  code.

## What works

- **Integration tests for Express routes — real server, no mocks.** Pattern from a dashboard
  project (`tests/api.test.js`, `stack:node-express`):
  ```js
  function makeApp(projectsMap = new Map(), hooks = {}) {
    const app = express();
    registerApiRoutes(app, () => projectsMap, { saveProjects: hooks.saveProjects ?? (() => {}), ... });
    return app;
  }
  function startServer(app) {
    return new Promise(resolve => {
      const server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
    });
  }
  ```
  Key rules: (a) port `:0` → OS picks a free port, no collisions; (b) `makeApp()` factory gives each
  test suite its own isolated app state; (c) test against real `fetch()`, not a mock transport;
  (d) `after()` calls `server.close()` — no leaked open handles. Pairs naturally with `node:test`
  (built-in, no extra deps).
- **Declarative schema diffs.** Plan the schema as a declared target and let the migration be the
  diff to it; together with forward-only migrations (in the def), no applied migration is ever
  hand-edited.

## Failure modes seen

- **N+1 queries** from naive ORM use. Use targeted `include`/`select`; watch hot paths.
- **Swallowed errors in background jobs.** A cron that silently eats an exception hides
  data-integrity bugs for weeks. Log + fallback, never silent.
- **Secrets drifting into code or logs.** Canonical rule: `anti-patterns.md` #8 (env vars
  only; `.env` never committed; `.env.example` present; logs never contain
  tokens/passwords/PII). The scoped seed-script exception is documented below.
- **`res.body` typed as `any` in supertest e2e tests.** `@typescript-eslint/
  no-unsafe-member-access` blocks direct `.field` access when `res.body` is `any`.
  Fix: cast to a minimal typed object before accessing — `const body = res.body as
  { accessToken: string }` — rather than disabling the rule. One cast per test block,
  scoped to the fields actually checked.

## Project-specific seed permission (carry the _pattern_, not the values)

- Hardcoded **seed** credentials can be acceptable in a private hobby app's seed scripts
  _only_ — every value carries a `// why:` comment, and it never extends to `src/`. This
  is a deliberate, scoped exception, not a default. Re-decide per project.

## Setting up

The def is copied at init with the other twelve; Phase 0 records whether the backend-lead is
active. The migration strategy goes into the relevant ADR; auth, payments, PII and secrets need
explicit human sign-off (template § Boundaries between roles).
