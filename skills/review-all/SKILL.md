---
name: review-all
description: "Universeller 6-Schritt-Code-Review (R1-R6); liest Stack + Befehle aus CLAUDE.md, persistenter Bericht, Feedback je Schritt. Trigger: /review-all"
trigger: /review-all
---

# /review-all

Führe einen vollständigen 6-Schritt-Review des Projekts durch. Der Review ist
**stack-agnostisch**: Er liest den Tech-Stack, die Projektstruktur und die Test-/
Lint-/Build-Befehle aus `CLAUDE.md` und passt jeden Schritt an das tatsächliche
Projekt an.

> **Schritte heißen `R1`–`R6`, NICHT „Phase 1–6".** Die Begriffe „Phase 1–5"
> sind in `CLAUDE.md` für den Team-Workflow (CLARIFY → EXPLORE → PROPOSE →
> CONVERGE → IMPLEMENT) reserviert. Verwechsle die beiden nicht — und rufe
> für diesen Review **nicht** den `phase-gate-checker` auf (der prüft die
> CLAUDE.md-Phasen, nicht diese Review-Schritte).

> **Solo-/Direkt-Modus.** Dieser Skill arbeitet quer über alle Schichten des
> Projekts (Frontend, Backend, Daten, Infra) und umgeht damit bewusst die
> Rollen-Grenzen aus `CLAUDE.md` (Backend-Lead/Frontend-Lead etc.). Das ist für
> den Review beabsichtigt. Wird die volle Team-Struktur gewünscht, ist dieser
> Skill das falsche Werkzeug.
>
> **Ausnahme — read-only Advisory-Subagents.** Zwei Subagents dürfen gebrieft
> werden, weil sie **nur auditieren/diagnostizieren und ein Fix-Brief liefern**
> (kein Editieren, kein Team-Spawn, keine zweite Gate): `security-auditor` in R3
> und `debugger` in R2. Sind ihre Defs nicht deployed (`.claude/agents/*.md`
> fehlt), läuft der jeweilige Schritt solo wie bisher.

## Vor dem Start — Stack ermitteln

1. Lies `CLAUDE.md` (Projektregeln, **§ Tech stack**, **§ Folder layout**,
   **§ Code rules**) sowie `state/STATUS.md` und `state/BLOCKERS.md`.
2. **Leite aus § Tech stack ab, welche Schichten es gibt** (z. B. Frontend /
   Backend / DB / CLI / Library) und **welche Befehle pro Paket gelten**
   (Typecheck, Lint, Unit-/Integration-/e2e-Tests, Build). Trage diese Befehle
   unten unter „Gates dieses Projekts" zusammen, bevor du R1 startest.
   - Gibt es mehrere Pakete (Monorepo), bestimme den Pfad jedes Pakets aus
     § Folder layout.
   - Externe Abhängigkeiten (Docker-DB, externe APIs, Secrets): notieren, welche
     für welchen Schritt laufen müssen. Fehlt eine Voraussetzung (z. B. Docker
     nicht gestartet) → den betroffenen Teilschritt **überspringen und im Bericht
     vermerken**, statt fehlzuschlagen.
3. Falls `graphify-out/graph.json` existiert: nutze `python -m graphify query "..."`
   für Architektur-/Beziehungsfragen in R1 statt blind zu greppen.
4. Lege den persistenten Review-Bericht an:
   `docs/reviews/<YYYY-MM-DD>-review.md` mit einer Findings-Tabelle:

   | ID | Schritt | Schwere | Datei/Ort | Beschreibung | Status |
   |----|---------|---------|-----------|--------------|--------|

   Schwere = `kritisch` / `hoch` / `mittel` / `niedrig`.
   Status = `offen` / `behoben` / `verschoben (Begründung)`.

   **Dieser Bericht ist die einzige Quelle der Wahrheit.** Findings aus R1
   sind die Eingabe für R3–R5. Trage alles dort ein und aktualisiere den
   Status laufend — so überlebt der Review eine `/clear` oder Compaction und
   ist jederzeit fortsetzbar.

## Gates dieses Projekts (aus CLAUDE.md ableiten)

> Vor R1 ausfüllen. Beispiel-Slots — konkrete Befehle aus § Tech stack übernehmen.
> Alle Befehle in der OS-eigenen Shell ausführen (Windows: PowerShell, kein Unix).

- **Typecheck:** `<pro Paket>` (z. B. `tsc --noEmit`, `mypy`, `go vet`)
- **Lint:** `<pro Paket>` (z. B. `eslint`, `ruff`, `golangci-lint`)
- **Unit-/Integrationstests:** `<pro Paket>`
- **e2e / externe Tests:** `<falls vorhanden>` — Voraussetzungen notieren
  (laufende DB/Services). Ohne Voraussetzung überspringen + vermerken.
- **Build:** `<falls relevant>`

---

## R1 – Bestandsaufnahme & Architektur (nur Analyse)

Analysiere das gesamte Projekt, ohne Code zu ändern. Falls noch nicht deployed —
Deployment-/Prod-Themen ausklammern und das im Bericht vermerken.

Für **jede Schicht aus § Tech stack** prüfen (nur die zutreffenden):

- **Struktur & Organisation:** Modul-/Ordner-/Komponenten-Aufbau, Separation of
  Concerns, Dependency-Richtung (Abhängigkeit auf Abstraktionen, nicht auf I/O).
- **Verwendete Patterns / Anti-Patterns** gemessen an § Code rules.
- **Datenfluss & Grenzen:** wo kommt externer Input rein, wo wird validiert.
- **Auth / Sessions / Tokens** (falls vorhanden): wo gespeichert, wie aufgefrischt,
  Cross-Platform-Fallstricke.
- **Daten / Persistenz** (falls vorhanden): Schema, Relationen, Indizes,
  Migrationsstand.
- **Hintergrundjobs / Cron / externe Integrationen** (falls vorhanden):
  Verantwortlichkeiten, Fehler-/Timeout-Verhalten.
- **Abhängigkeiten:** veraltet, ungenutzt, Versionskonflikte, Security-Advisories
  (Audit-Befehl des Stacks).

Trage alle Findings in den Bericht ein (Schwere, Datei/Ort, Begründung).
**Kein Code-Fix in diesem Schritt.**

---

## R2 – Test-Sicherheitsnetz aufbauen

Baue ein Test-Sicherheitsnetz auf, bevor refaktoriert wird. Produktivlogik nicht
verändern.

- **Typecheck** in jedem Paket ausführen; alle Typfehler in den Bericht aufnehmen.
- Für jede Schicht das **passende Test-Framework des Stacks** nutzen (aus § Tech
  stack / vorhandener Test-Konfiguration ableiten):
  - Unit-Tests für Kern-/Business-Logik und reine Funktionen.
  - Integrations-/e2e-Tests für Endpunkte / Navigation / kritische Flows.
  - Mocks **nur an den Grenzen** (Netzwerk, FS, Zeit, Zufall) — interne Module
    nicht mocken (§ Code rules #6).
- Gezielte Tests für riskante Logik (Hintergrundjobs, externe API-Fehlerfälle/
  Timeouts, Punkte-/Berechnungslogik o. ä.).
- Alle Tests ausführen; aktuelle Coverage + ergänzte Tests berichten.
- **Rote Tests → `debugger`.** Schlägt ein Test fehl und die Ursache ist nicht
  offensichtlich, briefe den **`debugger`**-Subagent (read-only: findet die
  *Grund*-Ursache, nicht das Symptom, und liefert ein Fix-Brief — er editiert
  nicht). Den Fix dann selbst bzw. via `code-writer` anwenden, Test erneut grün
  fahren, Ergebnis in den Bericht. Kein `debugger`-Def deployed → solo diagnostizieren.

---

## R3 – Sicherheit & Fehlerbehandlung

Prüfe und behebe Sicherheits- und Robustheitsthemen entlang § Code rules #4 & #8.

> **Bevorzugt an `security-auditor` delegieren.** Briefe den **`security-auditor`**-Subagent
> auf die geänderten/riskanten Bereiche (Auth, Eingabe-Grenzen, Secrets, Deps). Er auditiert
> **read-only** und liefert priorisierte Findings + Fix-Brief — er editiert nicht und ist
> **keine zweite Gate**, sondern eine Empfehlung. Übernimm seine Findings in den Bericht und
> wende Fixes selbst / via `code-writer` an. Ist der Def nicht deployed, gehe die Checkliste
> unten **solo** durch. Sie bleibt hier als Referenz *und* Solo-Fallback — der `security-auditor`
> prüft dieselben Punkte:

- **Secrets:** keine hartcodierten Secrets in `src`/App-Code; Env-Vars; `.env`
  nicht im Repo; `.env.example` vorhanden. Keine Secrets/Token/PII in Logs.
- **Auth** (falls vorhanden): Passwort-Hashing korrekt; Token-/Session-Handling
  sauber getrennt und invalidierbar; geschützte Routen/Aktionen mit Guards;
  Client-seitige Checks nicht vertrauen.
- **Eingabevalidierung an allen Grenzen:** externe Daten validieren/sanitisieren/
  parametrisieren; parameterisierte Queries (kein String-Concat-SQL).
- **Externe Integrationen:** Timeouts + Fehlerbehandlung; Jobs crashen nicht bei
  API-Ausfall; ungültige Zustände sauber bereinigen.
- **Fehlerbehandlung:** keine still verschluckten Errors (loggen + Fallback oder
  mit Kontext re-throwen); konsistentes Error-Handling; Logger ohne sensible Daten.

Behebe offene Findings bzw. schlage Fixes mit kurzer Begründung vor; Tests bleiben
grün. Status im Bericht aktualisieren.

---

## R4 – APIs, Daten & Verträge verifizieren

Verifiziere Schnittstellen, Daten und Verträge (nur die zutreffenden Punkte).

- **API-Doku** (falls vorhanden, z. B. OpenAPI/Swagger): alle Endpunkte und
  Schemas dokumentiert und aktuell?
- **Endpunkte/Funktionen testen:** Statuscodes, Validierung, Fehlerfälle,
  geschützte Routen.
- **Datenbank/Migrationen** (falls vorhanden): auf frischer DB reproduzierbar
  ausführbar; Schema entspricht den Modellen; Generator/Client aktuell.
- **Query-Effizienz:** N+1 vermeiden, fehlende Indizes ergänzen (§ Code rules #9).
- **Hintergrundjobs** (falls vorhanden): idempotent (kein Doppel-Import/-Versand),
  korrektes Mapping, korrektes Scheduling.
- **Vertragsabgleich:** erwartete Datenformen im Client passen zu den
  Server-Responses / dem dokumentierten Vertrag.

Behebe Probleme bzw. schlage Fixes vor; Tests bleiben grün. Status aktualisieren.

---

## R5 – Cleanup & Optimierung

Räume auf und optimiere. Tests müssen nach jeder Änderung grün bleiben.

- **Toten/ungenutzten Code entfernen:** ungenutzte Exports/Komponenten/Importe/
  Variablen (Tool des Stacks nutzen, z. B. `ts-prune`); insbesondere Altlasten
  früherer Versionen, falls nicht mehr benötigt.
- **Komplexität zerlegen:** lange Funktionen/Komponenten/Services aufteilen
  (§ Code rules #2); Duplikate beseitigen (DRY, aber Rule of Three beachten).
- **Performance:** Frontend (effizientes Listen-Rendering, Memoization,
  Asset-Handling) und Backend (Query-Effizienz, Job-Effizienz) — korrektheit
  zuerst, dann messen, dann optimieren.
- **Geteilte Typen/Verträge** dort zentralisieren, wo sinnvoll (neutraler
  Shared-Bereich; Änderungen brauchen Architect-Sign-off, § Boundaries).

Begründe jede Änderung kurz und kennzeichne funktionsverändernde Umbauten.

---

## R6 – Code Style, Clean Code & Dokumentation

Abschluss: einheitlicher Stil und vollständige Dokumentation über das ganze Projekt.

- **Formatter + Linter** des Stacks in jedem Paket ausführen und alle Verstöße
  beheben (Prettier/Black/gofmt + ESLint/ruff/golangci-lint o. ä.).
- **Typ-Strictness** erhöhen wo sinnvoll; schwache Typen (`any`/`interface{}`/…)
  ersetzen.
- **`code-reviewer`-Subagent** über die geänderten Dateien laufen lassen — er
  setzt die **§ Code rules** aus `CLAUDE.md` durch (Naming, Funktionslänge,
  Error-Handling, Struktur). MUST-FIX-Findings beheben, SHOULD-FIX beheben
  oder bewusst verschieben (Backlog-Eintrag).
- **Dokumentation:**
  - README mit lokalem Setup (alle Schritte, um das Projekt lokal zu starten —
    Services hochfahren, Migrationen, Dev-Server pro Paket).
  - API-Doku (falls vorhanden) aktuell.
  - `.env.example` für jedes Paket vollständig.

Erstelle im Bericht eine **Abschluss-Zusammenfassung** aller Änderungen über die
Schritte und der offen gebliebenen Punkte.

**Review-Event schreiben.** Nach dem `code-reviewer`-Lauf das Review-Ergebnis in den Event-Log
schreiben, damit ein Viewer des Event-Logs den Verdikt sieht (`workflow/observability.md`).
Dieses **eine** Kommando **über das Bash-Tool** aus dem Projektverzeichnis ausführen (Emitter ist
guard-on-`state/`, fail-open, no-secrets):

```bash
node ~/.claude/hooks/log-event.js review.result '{"must_fix":<N>,"should_fix":<M>}'
```

`<N>`/`<M>` = Anzahl offener MUST-/SHOULD-FIX-Findings aus dem Bericht. **Warum Bash-Tool** (nicht
PowerShell wie die Test-/Lint-Befehle): PowerShell 5.1 verschluckt die eingebetteten JSON-Double-
Quotes an native `.exe` → `attr` käme **leer** an (Zahlen verloren); bash erhält das single-gequotete
JSON korrekt und expandiert `~`. Gleiche Form wie in `observability.md`.
Ohne `state/`-Dir ist es ein No-op (kein Fehler).

---

## Ablauf-Protokoll — nach JEDEM Schritt auf Feedback warten

Dieser Ablauf ist verbindlich. Pro Lauf wird **genau ein Schritt** bearbeitet,
dann wird gestoppt.

1. **Setup einmalig:** `CLAUDE.md`, `state/STATUS.md`, `state/BLOCKERS.md`
   lesen; Stack + Gates ableiten (s. o.); Review-Bericht
   `docs/reviews/<datum>-review.md` anlegen (falls noch nicht vorhanden) oder
   fortsetzen.
2. **Schritt ausführen:** Den aktuellen Schritt (R1 … R6) durchführen.
   Findings/Änderungen in den Bericht eintragen bzw. Status aktualisieren.
3. **Tests/Gates:** Ab R2 die relevanten Test-/Lint-/Typ-Befehle des Projekts
   ausführen und das Ergebnis berichten. Bei R3–R6: Tests müssen grün sein,
   bevor der Schritt als fertig gilt.
4. **STOPP & Feedback:** Eine kurze Zusammenfassung des Schritts im Chat geben
   (Verweis auf den Bericht) und **explizit auf das OK des Nutzers warten.**
   - Den nächsten Schritt **niemals** automatisch starten — auch R1 → R2 nicht.
   - Erst nach klarem „OK / weiter / mach R<n>" mit dem nächsten Schritt
     fortfahren. Bei „stopp / Änderung X zuerst" das Feedback umsetzen und
     erneut auf OK warten.
5. **State pflegen:** Nach jedem Schritt `state/STATUS.md` aktualisieren
   (welcher Review-Schritt ist erledigt, was ist offen) und bei
   bedeutenden Funden einen Eintrag in `state/JOURNAL.md`. Bei **R6** zusätzlich
   das `review.result`-Event schreiben (s. R6).
