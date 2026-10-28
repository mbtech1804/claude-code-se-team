## Code rules

Enforced by the `code-reviewer` subagent; followed by every agent that writes code.
Stack-agnostic. Language-specific refinements go in the project-specific section below.

### 1. Naming

- Names describe intent, not implementation. `userExists` not `checkUser`.
- Functions are verbs or verb phrases: `loadProfile`, `sendInvoice`.
- Booleans start with `is`, `has`, `should`, `can`.
- Constants are `SCREAMING_SNAKE_CASE`.
- Single-letter variables only as loop indices or in lambdas <5 lines.
- No abbreviations unless universally known (`url`, `id`, `db` ok; `usr`, `mgr`, `cfg` not).
- No Hungarian / type prefixes (`strName`, `iCount`). Types are the type system's job.
- File names match what they export (one main thing per file).

### 2. Functions

- **Do one thing.** If the docstring needs an "and", split it.
- Short by default. A function that doesn't fit on screen needs justification.
- ≤3 parameters. More → group into an object with named fields.
- **No flag parameters.** `render(isPreview: true)` → `renderPreview()` + `render()`.
- Side effects signalled by the name. `getX` is pure; `fetchX`, `saveX`, `applyX` are not.
- Return early. Flatten with guard clauses. Max nesting depth: **3 levels** → else extract.

### 3. Comments and docs

- Comments explain **why**, not what.
- Public functions, exported types, modules get a docstring: purpose (1 sentence) + 1
  example if non-obvious.
- `TODO`/`FIXME`/`HACK` include initials + reason: `// TODO(initial): short reason`.
- **No commented-out code committed.** Use version control.
- Outdated comments are bugs — delete them on sight.

### 4. Error handling

- Errors propagate by default. Catching is a deliberate choice with a reason.
- **Never swallow errors silently.** Handle (log + fallback) or re-throw with context.
- Don't use exceptions for control flow.
- Prefer `Result`/`Either` or explicit error returns where supported; else typed exceptions.
- Return empty collections, not `null`, when absence means "zero results".
- Use `null`/`undefined`/`None` deliberately for "not applicable", not "I forgot".
- Validate at the boundary (handlers, deserializers). Trust the inside.

### 5. Structure

- **Single Responsibility:** a module/class/function changes for one reason.
- **Dependency direction:** depend on abstractions, not concrete I/O. Testable without
  mocks-everywhere.
- Pure functions where possible; side effects pushed to the edges.
- No global mutable state. Configuration is injected, not imported.
- **Rule of Three:** don't extract a shared helper before the third duplication.
- **YAGNI.** No "might need it later" params, configs, hooks. Add when needed.
- **Boy Scout Rule:** leave touched files cleaner than you found them (in-scope only).

### 6. Tests

- AAA structure: Arrange, Act, Assert.
- One logical concept per test. Multiple assertions OK if they check the same concept.
- Test names read like specs: `returnsEmptyListWhenUserHasNoOrders`, not `test_orders_1`.
- Mocks only at boundaries (network, FS, time, randomness). Mocking internal modules is a
  smell.
- No `sleep`-based timing. Use async / fake-time primitives.
- A new feature without tests is not done.

### 7. Dependencies

- Adding a dependency requires a one-line justification in the PR/commit.
- Prefer the standard library / built-ins when reasonable.
- No abandoned packages (>1 year stale, unresolved advisories).
- Pin versions for apps; range versions for libraries.

### 8. Security baseline

- Secrets via env vars or a secret manager. **Never in code, never in logs.**
- All external input is untrusted. Validate, sanitize, parameterize.
- Parameterized queries / prepared statements. String-concat SQL is a bug.
- Auth checks at every protected boundary. Don't trust client-side checks.
- Logs never contain secrets, full tokens, full card numbers, or full personal data.

### 9. Performance

- Correctness first, then measure, then optimize.
- No premature optimization, but no obviously wasteful patterns (N+1, O(n²) on
  user-controlled n, sync I/O on hot paths).
- Big-O of public functions obvious from structure or commented if not.

### 10. Formatting

- Formatting is the formatter's job (Prettier/Black/gofmt/equivalent), running on save.
  Formatting discussions are out of scope for review.
- Line length: whatever the formatter says, default 100 cols if unset.

---

## Project-specific code rules

> Filled during Phase 0 once the stack is chosen. Examples of what goes here: language
> strictness settings, framework export conventions (named vs default), scoped exceptions
> (e.g. seed-script credential allowances with mandatory `// why:` comments), and the
> project-language convention (which natural language for code/comments/commits/docs).
>
> _TODO (Phase 0): add project-specific rules here._
