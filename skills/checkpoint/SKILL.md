---
name: checkpoint
description: "Pre-Clear-Snapshot: Working Memory + Auto-Memory + Knowledge Graph aktualisieren, Git-Warnung. Projekttyp-sensitiv. Trigger: /checkpoint"
trigger: /checkpoint
---

# /checkpoint

Erstelle einen vollständigen **Snapshot der Working Memory**, bevor der Context
geleert (`/clear`) oder kompaktiert wird. Ziel: Eine kalt startende Folge-Session
findet in den MDs alles vor, um nahtlos weiterzumachen.

> **Kein Test-/Build-Lauf.** Dieser Skill führt **keine** Tests, Typecheck oder
> Linter aus. Er schreibt den **letzten bekannten Stand** in die MDs. Wenn du
> einen frischen Verifikations-Stand willst, lass **vorher** `/review-all` oder
> die Test-Befehle laufen — danach `/checkpoint`.

> **Keine CLAUDE.md-„Phasen".** Dieser Skill hat nichts mit dem Team-Workflow
> (CLARIFY → … → IMPLEMENT) zu tun und ruft **nicht** den `phase-gate-checker`.
> Er pflegt nur das Working-Memory.

> **Direkt-Schreib-Modus.** Der Skill schreibt die MD-Änderungen **direkt** und
> fasst am Ende zusammen, was geändert wurde. Er fragt **nicht** vor jeder Datei.
> Einzige Ausnahme: bei echter Unklarheit über den Projektstand kurz nachfragen
> statt etwas zu erfinden (siehe „Anti-Fabrikat-Regel").

## Anti-Fabrikat-Regel

**Nur eintragen, was wirklich passiert ist.** Quelle der Wahrheit ist diese
Session + die bestehenden MDs (`JOURNAL.md`, `ACTIVITY.md`, `STATUS.md`).

- Test-/Lint-/Typecheck-Zahlen: den **letzten bekannten Stand** aus `STATUS.md`
  übernehmen. Nur ändern, wenn in **dieser** Session nachweislich Tests liefen.
  Wurde Code geändert, ohne dass Tests liefen → das **explizit** vermerken
  (z. B. „Tests seit Code-Änderung X nicht erneut ausgeführt").
- Niemals Fortschritt, Sign-offs oder „grün"-Status erfinden. Im Zweifel offen
  lassen oder kurz nachfragen.

## Ablauf

### 0. Projekttyp erkennen (Step-0-Detektor)

Der Typ entscheidet, welche „Working Memory" es überhaupt gibt. Reihenfolge (identisch mit `/start-session` / `/end-session`):

1. `CLAUDE.md`-Frontmatter hat ein explizites `type:` → **das gewinnt** (Override).
2. sonst `state/STATUS.md` existiert → **coding**.
3. sonst ein Master-Plan-/Roadmap-Doc existiert (`DISCUSS-TODO.md`, `ROADMAP*.md`, `PLAN*.md`, `PHASE*.md`) → **planning/docs**.
4. sonst `.obsidian/` (Vault) oder `LEARNING-LOG.md` → **learning**.
5. sonst → **generic**.

**Verzweigung für Schritt 1–2** (alles andere gilt für alle Typen):
- **coding** → die `state/`-Schritte 1–2 unten wie beschrieben.
- **planning/docs** → es gibt **kein `state/`**. Die Working Memory ist das **Master-Plan-Doc** + die zugehörigen **ADR/PHASE-Docs** + die **Projekt-Memory**: aktualisiere **deren** Statuszeilen / „nächster Schritt" + die Projekt-Memory. **Überspringe** die reinen `state/`-Teile (2a Compact, `leads/`, `ACTIVITY`/`JOURNAL`/`BACKLOG`/`BLOCKERS`).
- **learning** → das `LEARNING-LOG.md` ist die Working Memory: *was diese Session gelernt wurde* + den nächsten Lern-Schritt anhängen; kein `state/`.
- **generic** → **kein `state/`**. Nur Projekt-Memory + auffällige Top-Level-Docs, best effort.

Schritt 3 (Auto-Memory), 5 (Git-Warnung) und 6 (Reality-Cross-Check gegen git/Dateien) gelten **unverändert für alle Typen** — gerade bei planning/generic ist der Realitäts-Abgleich der eigentliche Wert. Den erkannten Typ im Summary nennen.

### 1. Kontext lesen

- `CLAUDE.md` § *Working memory* + § *Activity logging* (Update-Protokoll, Lifecycle).
- `state/STATUS.md`, `state/BLOCKERS.md`, `state/BACKLOG.md`.
- `state/JOURNAL.md` (letzte ~20 Zeilen — für Idempotenz, s. u.) und
  `state/ACTIVITY.md` (Länge prüfen).
- Die relevante(n) `state/leads/<role>.md` (meist `team-lead`/aktiver Lead).
- Auto-Memory: `MEMORY.md`-Index + die Projekt-Memory-Datei dieses Projekts.

Rekonstruiere daraus + aus dem Verlauf dieser Session: **Was ist passiert, was
ist jetzt der Stand, was ist der nächste konkrete Schritt?**

### 2. state/-MDs aktualisieren (direkt schreiben)

| Datei | Modus | Was |
|---|---|---|
| `STATUS.md` | **neu schreiben** | `Last updated`-Stempel + Session-Nummer hochzählen; aktuelle Phase; **„Nächster Schritt"** als konkrete erste Aktion fürs nächste Cold-Start; „Awaiting" (offene Fragen/Blocker); Test-/Typecheck-/Lint-Zahlen = letzter bekannter Stand **mit Alters-Marker** (`Stand: Session N` bzw. `zuletzt verifiziert vor X Sessions`), damit sichtbar bleibt, wie alt ein „grün" ist. Nur der **aktuelle** Snapshot — Altes nicht anhäufen. |
| `JOURNAL.md` | **anhängen** | Nur *signifikante* Events dieser Session (Entscheidungen, Sign-offs, Feature fertig, Scope-Änderung, Blocker raised/resolved). **Idempotent:** vorher die letzten Zeilen lesen; nichts doppelt eintragen. Session-Marker `-- Session N --` wenn noch nicht vorhanden. |
| `ACTIVITY.md` | **anhängen** + ggf. prunen | Orchestrierungs-Events dieser Session anhängen (`YYYY-MM-DD HH:MM <role> <verb> <object>` — Datum und Uhrzeit in jeder Zeile; ältere Zeilen ohne Datum bleiben, wie sie sind). Mindestens `session-end ... ready for clear`. **Bei > ~100 Zeilen prunen** und den gelöschten Block als **eine** Summary-Zeile ins `JOURNAL.md` konsolidieren (so in CLAUDE.md vorgesehen). |
| `BACKLOG.md` | **anhängen/ändern** | Erledigte Items dieser Session auf `done`; neu entdeckte Arbeit als offene Items ergänzen. |
| `BLOCKERS.md` | **anhängen/ändern** | Neue Blocker mit `Resolve by:` eintragen; gelöste als resolved markieren. |
| `leads/<role>.md` | **neu schreiben** | Den/die in dieser Session aktiven Lead-Dateien auf den aktuellen Stand (Rehydrierungspunkt nach `/clear`). |

### 2a. Compact if needed (Schwellwert-Check)

Prüfe nach dem State-Update die Größe der wachsenden Dateien und compact
automatisch, wenn ein Schwellwert überschritten ist. **Reihenfolge einhalten —
erst ACTIVITY, dann JOURNAL, dann BACKLOG** (ACTIVITY speist JOURNAL, JOURNAL
darf erst danach verkürzt werden).

| Datei | Schwellwert | Aktion |
|---|---|---|
| `state/ACTIVITY.md` | > 80 Zeilen | Älteste 40 Zeilen löschen; stattdessen **eine** Summary-Zeile ans `JOURNAL.md` anhängen: `<datum>: [ACTIVITY compact] <N> Zeilen archiviert — <3-Wort-Zusammenfassung der Periode>` |
| `state/JOURNAL.md` | > 350 Zeilen | Zeilen 1–250 nach `docs/journal-archive-<YYYY>.md` **anhängen** (nicht ersetzen — Datei darf mehrere Compact-Runden enthalten); danach diese 250 Zeilen aus `JOURNAL.md` entfernen; erste Zeile der verbleibenden Datei: `# Journal (ab <Datum des ersten behaltenen Eintrags>)` |
| `state/BACKLOG.md` | > 300 Zeilen | Alle Items mit Status `done` (Zeilen die mit `- [x]` oder `**done**` beginnen) nach `docs/backlog-archive.md` **anhängen**; danach aus `BACKLOG.md` entfernen |

**Was NICHT compact wird:**
- `state/STATUS.md` — wird ohnehin komplett überschrieben
- `state/BLOCKERS.md` — bleibt immer klein
- `docs/adr/*.md` — permanente Entscheidungen, nie kürzen
- `docs/reviews/*.md` — Review-Reports werden archiviert, nie gekürzt

**Vorgehen bei jeder Datei:**
1. Zeilenzahl ermitteln (mit der OS-eigenen Shell — auf Windows PowerShell, nicht Unix).
2. Schwellwert überschritten? → Compact ausführen
3. Im Chat mit `📦 Compact: <datei> <N> Zeilen → <M> Zeilen` melden
4. Nicht überschritten? → `✅ <datei>: <N> Zeilen (ok)` melden und weitermachen

### 3. Auto-Memory aktualisieren

- Die **Projekt-Memory-Datei dieses Projekts**: aktuellen Projektstand + Phasen-
  Übersicht spiegeln, **falls** sich in dieser Session etwas Dauerhaftes geändert
  hat. Diese Datei überlebt sowohl `/clear` **als auch** das Konversationsende.
- Den `MEMORY.md`-Index nur anfassen, wenn ein neuer Memory-Eintrag dazukommt.
- Keine Geheimnisse/Token/PII in die Memory schreiben (CLAUDE.md § Security).

### 4. Knowledge Graph aktualisieren

- Wenn in dieser Session **Code geändert** wurde und `graphify-out/` existiert:
  `/graphify . --update` ausführen (AST-only, keine API-Kosten) — sonst wird
  der Graph stale. Ergebnis (Node-/Edge-Delta) kurz in `STATUS.md` § *Knowledge
  Graph* nachziehen.
- Wurde **kein** Code geändert: überspringen und im Summary vermerken.

### 5. Git-Hygiene — nur warnen

- `git status --short` ausführen. Uncommittete/ungetrackte Änderungen **auflisten**
  und **warnen**, dass sie einen `/clear` zwar überleben (liegen auf der Platte),
  aber unbacked-up und außerhalb der MD-Historie sind.
- **Nicht committen, nicht stashen, nichts an Git verändern.** Der Commit bleibt
  deine Entscheidung. (Auth/Secrets/PII bräuchten ohnehin explizites Sign-off.)

### 6. Konsistenz-Check + Zusammenfassung

**Stale-Reference-Scan (immer zuerst):** Alle state-Dateien nach veralteten
Task- und Phasen-Referenzen absuchen — generisches Muster: Phasen-/Task-IDs
(`P\d+`, `T\d+`, `P\d+\.T\d+`) und Status-Tags wie `in progress`, `awaiting`,
`activate`, `done` — und, weil State-Dateien in der Sprache der Session stehen, `steht aus`,
`ausstehend`, `läuft`, `wartet auf`, `erledigt`. Jeden Treffer gegenchecken.

**Cross-Check gegen die Realität (nicht nur gegen andere MDs):** Der reine
Abgleich state-gegen-state ist zirkulär — ist das `BACKLOG.md` selbst veraltet,
geht der Check fälschlich durch. Darum jeden „done"/„erledigt"/„Nächster
Schritt"-Claim **auch gegen die Realität** prüfen, mit Daten, die der Skill schon
geholt hat:
- **git log** (aus Schritt 5 bzw. `git log --oneline -20`): Behauptet ein Eintrag
  „Feature/Commit X done", taucht aber kein passender Commit auf → flaggen und
  klären (Code geändert aber nicht committet? Oder Claim falsch?).
- **Datei-Existenz:** Verweist ein „done"-Item oder der „Nächste Schritt" auf eine
  konkrete Datei/einen Pfad, der nicht existiert → veraltet, korrigieren.
- Bei Widerspruch zwischen MD-Claim und git/Code gilt **git/Code als Wahrheit**;
  die MD wird angepasst (nicht umgekehrt).

Veraltete Referenzen **direkt korrigieren**, nicht nur flaggen. Korrigierte
Einträge in der abschließenden Zusammenfassung auflisten.

- Schneller Selbstcheck: Widerspricht `STATUS.md` irgendwo dem `JOURNAL.md` oder
  der Realität (z. B. „Phase X done" aber Backlog-Items offen)? Korrigieren.
- Im Chat **kompakt zusammenfassen**, was geschrieben wurde:
  - geänderte MDs (STATUS / JOURNAL / ACTIVITY / BACKLOG / BLOCKERS / leads / Memory),
  - Graph-Status (aktualisiert / übersprungen),
  - **Git-Warnung** (Liste uncommitteter Dateien, falls vorhanden),
  - der **„Nächste Schritt"**, der jetzt in STATUS steht.
- Mit einer klaren Aussage abschließen: **„✅ Bereit für `/clear`"** bzw. welche
  Punkte vorher noch zu klären sind.
