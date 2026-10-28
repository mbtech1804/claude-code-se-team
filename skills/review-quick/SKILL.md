---
name: review-quick
description: "Schnelles Review der geänderten Dateien (git diff HEAD) via code-reviewer gegen CLAUDE.md-Regeln; MUST-/SHOULD-FIX. Für T2/T3. Trigger: /review-quick"
trigger: /review-quick
---

# /review-quick

Schnelles, fokussiertes Code-Review für Tier-2/T3-Änderungen. Kein Phase-Gate, keine Architektur-Analyse — nur: "Folgt der geänderte Code unseren Regeln?"

> **Kein Ersatz für /review-all.** Dieser Skill prüft Code Rules, keine Architektur, keine API-Contracts, keine Test-Coverage. Für Tier-1-Features bleibt /review-all Pflicht.

## Usage

```
/review-quick              # alle Dateien seit letztem Commit (git diff HEAD)
/review-quick <path>       # nur diese Datei oder dieses Verzeichnis
```

## Ablauf

### 1. Geänderte Dateien ermitteln

Kein Pfad angegeben → ausführen:

```powershell
git diff HEAD --name-only
```

Pfad angegeben → diesen direkt verwenden (Datei oder Verzeichnis).

Keine Änderungen gefunden → `✅ Keine geänderten Dateien (git diff HEAD ist leer).` ausgeben und stoppen.

### 2. Dateien filtern

**Behalten:**
- TypeScript / JavaScript: `.ts`, `.tsx`, `.js`, `.jsx`
- Dateien unter: `src/`, `app/`, `components/`, `hooks/`, `utils/`, `backend/src/`

**Überspringen:**
- `state/` — Working Memory, kein Produktionscode
- `docs/` — Dokumentation
- `*.md` — Markdown-Dateien
- `prisma/migrations/` — generierte Migrationen
- `prisma/schema.prisma` — deklaratives Schema, kein imperativer Code
- `*.json`, `*.yaml`, `*.yml` — Config-Dateien
- `node_modules/` — niemals

Nach dem Filtern nichts übrig → `✅ Geänderte Dateien sind alles Nicht-Code (Docs, Config, Migrations). Nichts zu reviewen.` ausgeben und stoppen.

### 3. code-reviewer spawnen

Spawne den `code-reviewer`-Subagenten mit folgendem Brief (Dateipfade einsetzen):

> Review the following changed files for compliance with CLAUDE.md § Code rules.
>
> Check for violations in these categories:
> - **Naming** (intent-describing names, verb functions, is/has/should booleans, no abbreviations, no Hungarian notation)
> - **Functions** (single responsibility, ≤3 params, no flag params, guard clauses, max nesting depth 3)
> - **Error handling** (no swallowed errors, no exceptions for control flow, validate at boundary)
> - **Structure** (SRP, no global mutable state, YAGNI, Rule of Three)
> - **Security** (no secrets in code, parameterized queries, auth at every boundary)
> - **Comments/docs** (exported functions have docstrings, no commented-out code, TODO/FIXME have initials)
>
> Focus on **changed lines** (git diff context). Do not flag pre-existing issues in unchanged lines unless they are within the same function as a change.
>
> Files to review:
> [LIST OF FILTERED FILES]
>
> Report as:
> - **MUST-FIX** — hard rule violation (naming, swallowed errors, flag params, global mutable state, secrets in code, SQL injection, missing auth check)
> - **SHOULD-FIX** — style, minor structure issue, missing docstring on exported function, premature abstraction
> - **✅ Clean** — if no issues in a file

### 4. Findings ausgeben

Findings des code-reviewers direkt ausgeben.

- MUST-FIX vorhanden → Hinweis: `⛔ Diese Punkte blockieren den Merge.`
- Nur SHOULD-FIX → Hinweis: `⚠️ Empfohlen, aber nicht blockierend.`
- Keine Findings → `✅ Alles sauber.`

Letzte Zeile immer: `Review: N MUST-FIX · M SHOULD-FIX` (oder `✅ Alles sauber`)

### 5. Review-Event schreiben

Nach der Ausgabe das Review-Ergebnis in den Event-Log schreiben (damit ein Viewer des Event-Logs auch T2/T3-Reviews sieht). `<N>`/`<M>` = dieselben Zahlen wie die Abschluss-Zeile:

Dieses Kommando **über das Bash-Tool** ausführen (aus dem Projektverzeichnis):

```bash
node ~/.claude/hooks/log-event.js review.result '{"must_fix":<N>,"should_fix":<M>}'
```

Guard-on-`state/`, fail-open, no-secrets — ohne `state/`-Dir ein No-op (kein Fehler). **Warum Bash-Tool, nicht PowerShell:** PowerShell 5.1 verschluckt die eingebetteten JSON-Double-Quotes an native `.exe` → `attr` käme leer an (Zahlen verloren); bash erhält das single-gequotete JSON korrekt und expandiert `~` (gleiche Form wie `observability.md` · `agents/team-lead.md`).

> **Kein `debugger`/`security-auditor` hier** (bewusst): `/review-quick` führt keine Tests aus (kein `debugger`-Anlass) und ist der schnelle Regel-Check — Security steckt bereits im code-reviewer-Brief. Für die tiefere Prüfung mit Advisory-Subagents ist `/review-all` da.
