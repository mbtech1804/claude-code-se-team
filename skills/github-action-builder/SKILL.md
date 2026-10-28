---
name: github-action-builder
description: "Erkennt den Tech-Stack und erstellt/verbessert GitHub-Actions-Workflows (push + PR auf main). Trigger: /github-action-builder"
trigger: /github-action-builder
category: coding
tags: [github-actions, ci-cd, yaml, tech-stack, automation]
architecture: solo
---
# /github-action-builder

<!-- TEMPLATE: Config Synthesizer Agent | Generated: 2026-06-10 -->
<!-- Tools used: WebSearch/WebFetch, Read/Glob/Grep, Write/Edit, Bash -->

Analysiert ein Projekt, erkennt den Tech-Stack und erstellt oder verbessert GitHub
Actions Workflows in .github/workflows/ die nach jedem push und bei PRs auf main laufen.

## When to use

Wenn du GitHub Actions CI/CD hinzufügen willst, oder bestehende Workflows analysieren,
aktualisieren und verbessern willst. Funktioniert mit und ohne vorhandene Workflows.

## Steps

### Step 1 — Scan project structure

Scanne das Projekt-Root ohne noch Fragen zu stellen:

**Stack-Indikatoren:**
- `package.json` → Node.js / JavaScript / TypeScript
  - Lese `scripts`-Block für Lint/Test/Build-Commands
  - Prüfe auf `jest`, `vitest`, `eslint`, `tsc` in devDependencies
- `requirements.txt` / `pyproject.toml` / `setup.py` → Python
  - Prüfe auf `pytest`, `ruff`, `mypy`, `poetry`
- `Cargo.toml` → Rust (`cargo test`, `cargo clippy`)
- `go.mod` → Go (`go test`, `go vet`)
- `pom.xml` / `build.gradle` → Java/Kotlin
- `Gemfile` → Ruby
- `composer.json` → PHP
- `Dockerfile` → Docker-Build-Step nötig
- `.env.example` → Secrets/Env-Vars möglicherweise nötig

**Bestehende Workflows:**
Falls `.github/workflows/` existiert: alle `.yml`/`.yaml`-Dateien lesen.
Für jeden Workflow notieren:
- Trigger (on: push/pull_request/etc.)
- Jobs und ihre Steps
- Action-Versionen (z.B. `actions/checkout@v3` → veraltet?)
- Fehlende Jobs für den erkannten Stack
- Hardcodierte Werte oder fehlende Secrets-Nutzung

Melde das Gefundene in einer Message:
"Ich habe [Stack] erkannt.
[Falls Workflows vorhanden]: Bestehende Workflows: [Liste mit kurzem Status].
[Falls keine]: Noch keine Workflows vorhanden.
Klingt das richtig? Fehlt etwas?"

Warte auf Bestätigung.

### Step 2 — Clarify mode and requirements

**Falls bestehende Workflows vorhanden:**
Frage zuerst nach dem gewünschten Modus:

"Ich habe bestehende Workflows gefunden. Was soll ich tun?
  A — Bestehende analysieren und verbessern (Trigger, Jobs, Action-Versionen updaten)
  B — Zusätzlichen neuen Workflow anlegen
  C — Bestehende komplett ersetzen (nur wenn sie grundlegend falsch strukturiert sind)"

Warte auf Antwort, dann stelle nur die noch offenen Fragen:

1. **Branches für push-Trigger:** Alle Branches (Standard: `**`) oder nur bestimmte?
2. **PR-Trigger:** PRs die auf `main` zielen (Standard) oder anderen Branch?
3. **Jobs** (alle zutreffenden basierend auf erkanntem Stack):
   - Lint / Format-Check
   - Type-Check (z.B. `tsc --noEmit`, `mypy`)
   - Unit Tests / Integration Tests
   - Build / Compile
   - Docker Build & Push
   - Deploy (wenn ja: Plattform? Production / Staging?)
4. **Runtime-Versionen** — Standard: aktuelle LTS
5. **Secrets / Env-Vars** benötigt? (nur Namen — niemals Werte)
6. **Matrix-Tests** (mehrere Versionen parallel)? Standard: nein

### Step 3 — Generate or improve workflow YAML

**Wissensbasis zuerst:** `~/.claude/agent-knowledge/tooling/github-actions.md` lesen, dazu
`anti-patterns.md` #11 (Code-Gen vor `tsc`) und #14 (Lockfile-Drift bei `npm ci`).

**Action-Versionen:** Nutze WebSearch/WebFetch für aktuelle stabile Releases von
`actions/checkout`, `actions/setup-node`, `actions/setup-python`, etc.

**Modus A — Analyse & Verbesserung:**

Zeige zuerst eine Analyse des bestehenden Workflows:
```
ANALYSE: [dateiname.yml]
────────────────────────
✅ Korrekt:        [was gut ist]
⚠️  Veraltet:      [veraltete Action-Versionen]
❌ Fehlt:          [Jobs die der Stack braucht aber fehlen]
🔧 Verbesserungen: [Trigger-Fixes, fehlende fail-fast, etc.]
```

Dann das vollständig verbesserte YAML generieren und zeigen.
Fragen: "Dies ersetzt `[dateiname]`. Bestätigen (yes) oder Anpassungen?"

**Modus B — Neuer Workflow:**

Neuen Workflow in separater Datei generieren (z.B. `ci-extended.yml` wenn `ci.yml`
bereits existiert). Standard-Trigger:
```yaml
on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main]
```

**Modus C — Ersetzen:**

Wie Modus A, aber ohne Rücksicht auf bestehende Struktur — kompletter Neuaufbau.

**In allen Modi:** Vollständiges YAML zeigen, auf "yes" warten bevor geschrieben wird.
Secrets nur als `${{ secrets.SECRET_NAME }}` — niemals hardcodierte Werte.

### Step 4 — Write workflow file

**a.** `.github/workflows/` prüfen. Falls nicht vorhanden:
   Print: "▶ Erstelle `.github/workflows/`"
   Bash: `mkdir -p .github/workflows`

**b.** Prüfen ob Zieldatei bereits existiert.
   - Modus A/C: "⚠️ `[datei]` wird überschrieben. Bestätigt (du hast yes gesagt)."
   - Modus B: neue Datei, kein Conflict-Check nötig.

**c.** Datei mit Write tool schreiben.

**d.** Geschriebene Datei zurücklesen und prüfen.
   Print: "✅ Geschrieben: `.github/workflows/[dateiname]`"

### Step 5 — Summary

```
✅ GitHub Actions Workflow [erstellt / verbessert]
──────────────────────────────────────
Datei:     .github/workflows/[dateiname]
Trigger:   push (alle Branches) + PRs → main
Stack:     [erkannter Stack]
Jobs:      [Liste der konfigurierten Jobs]
Secrets:   [benötigte Secrets, oder "keine"]
──────────────────────────────────────
NÄCHSTE SCHRITTE:
→ Secrets in GitHub hinterlegen: Settings → Secrets and variables → Actions
→ Commit pushen um den Workflow zu triggern
→ Actions-Tab prüfen: github.com/<owner>/<repo>/actions
```

## Guardrails

- **Nie schreiben vor Bestätigung.** Vollständiges YAML in Step 3 zeigen, auf "yes" warten.
- **Bestehende Workflows nie stillschweigend überschreiben** — immer Analyse zeigen zuerst.
- **Keine Secrets im generierten YAML.** Nur `${{ secrets.SECRET_NAME }}`.
- **YAML-Syntax vor dem Schreiben prüfen.** Einrückungsfehler brechen GitHub Actions stillschweigend.
- **Keinen Stack raten.** Wenn kein klarer Stack erkennbar, vor der Generierung fragen.
- **Stop-on-failure.** Schlägt Write fehl, stoppen und melden.

<!-- TEMPLATE-CUSTOMIZATION-NOTES:
  Gebaut aus Template 07 (Config Synthesizer) für GitHub Actions.
  Mögliche Erweiterungen:
  - Matrix-Testing (mehrere Runtime-Versionen gleichzeitig)
  - Reusable Workflows (workflow_call trigger)
  - Dependabot-Config generieren (.github/dependabot.yml)
  - Environment-spezifische Deployments (staging vs. production)
-->
