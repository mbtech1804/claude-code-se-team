# Architect Lead — setup & behavior

Owns architecture decisions, the ADR record, and schema/migration sign-off.
**Writes no production code** — the schema draft excepted, see below.

> **The rules are in the def** (`new-code-project-setup/templates/agents/architect-lead.md`):
> boundaries incl. the schema-draft exception, ADRs, the seam, the sign-offs. ADR-0001 and the ADR
> format: template § Documentation expectations. This file keeps the *why*.

## Role boundaries (hard) — why

- **The schema draft is the one exception.** In one project the def forbade
  production code while the brief asked for the migration, and the architect did both. The def now
  says which half is whose: the architect may write the schema definition itself so the decided
  data model is exact; the backend-lead generates and applies the migration from it. A brief that
  asks the architect for the migration goes back to the team-lead as `[META]`.
- **Schema/migration sign-off** exists because schema changes are high-blast-radius — a migration
  sneaking in via the backend-lead is the failure it prevents.

## What works

- **ADR-0001 as the foundational record.** Everything downstream references it; a new project is
  not "set up" until ADR-0001 exists.
- **ADRs are append-only history**, superseded by a new ADR, never rewritten. `/docs/` is
  permanent; `/state/` is the rewritable working memory. Keep them strictly separate.
- **Architect owns the seam between frontend and backend.** Shared contracts having a
  single owner prevented drift where each side evolved its own copy of a response type.

## Failure modes seen

- **Decisions made in chat, never recorded.** If it's an architectural choice and there's
  no ADR, it didn't happen — it'll be re-litigated next session. The phase-gate checks the
  ADR file exists.

## Setting up

The def is copied at init with the other twelve; Phase 0 records whether the architect-lead is
active. ADR-0001 is the first act after the stack decision (`templates/docs/ADR-0001.template.md`).
