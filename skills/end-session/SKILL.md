---
name: end-session
description: "Session-Abschluss als Abschlussphase: alle /checkpoint-Schritte + Learnings + Closure-Log + Marker, keine neue Arbeit bis /clear. Projekttyp-sensitiv. Pflicht vor /clear. Trigger: /end-session"
trigger: /end-session
---

# /end-session

Schließe die aktuelle Session vollständig ab.

> **Pflichtschritt vor /clear.** Keine Session gilt als abgeschlossen ohne /end-session.

> **Abschlussphase.** Mit `/end-session` beginnt die Abschlussphase; sie endet mit der Schlussmeldung
> (Schritt 10), danach tippt der Nutzer `/clear`. Erste Zeile im Chat: *„Abschlussphase: ab jetzt nur
> Stand sichern, Learnings, Commit. Neue Arbeit kommt in die nächste Session.“* Zur Phase gehören die
> Schritte 1–10 und alles Hin und Her dazu — auch die Diskussion über Learnings und
> `/capture-learning`, so lange sie dauert. **Neue Arbeit gehört nicht dazu:** Bringt der Nutzer ein
> neues Thema, nicht anfangen, sondern fragen: *„Für die nächste Session notieren, oder Abschluss
> abbrechen?“* Notieren → als nächsten Schritt in die Working Memory, weiter in der Phase. Abbrechen →
> die Phase endet ohne Marker, später ein neues `/end-session`. Den nächsten Arbeitsschritt nie als
> „Soll ich …?“ anbieten — er wird notiert, nicht begonnen (in der Praxis gesehen: nach den
> Learnings kam „Soll ich mit dem Kurzplan anfangen?“ statt des Abschlusses).

> **Verhältnis zu /checkpoint:** /end-session enthält alle Schritte von /checkpoint (1–6) und fügt danach Session-Closure-Schritte 7–10 hinzu. Du musst **nicht** vorher /checkpoint laufen lassen — /end-session ersetzt es.

> **Kein Test-/Build-Lauf.** Wie /checkpoint: keine Tests, kein Typecheck, kein Linter. Nur letzten bekannten Stand sichern.

> **Anti-Fabrikat-Regel (identisch mit /checkpoint):** Nur eintragen, was wirklich passiert ist. Keine erfundenen Fortschritte, Sign-offs oder Test-Zahlen. Im Zweifel offen lassen.

---

## Ablauf

### 0. Projekttyp erkennen (Step-0-Detektor)

Der Typ entscheidet, welche „Working Memory" es überhaupt gibt. Reihenfolge (identisch mit `/start-session` / `/checkpoint`):

1. `CLAUDE.md`-Frontmatter hat ein explizites `type:` → **das gewinnt** (Override).
2. sonst `state/STATUS.md` existiert → **coding**.
3. sonst ein Master-Plan-/Roadmap-Doc existiert (`DISCUSS-TODO.md`, `ROADMAP*.md`, `PLAN*.md`, `PHASE*.md`) → **planning/docs**.
4. sonst `.obsidian/` (Vault) oder `LEARNING-LOG.md` → **learning**.
5. sonst → **generic**.

**Verzweigung für Schritt 1–2 + 8** (alles andere gilt für alle Typen):
- **coding** → die `state/`-Schritte wie beschrieben.
- **planning/docs** → **kein `state/`**: Working Memory = **Master-Plan-Doc** + **ADR/PHASE-Docs** + **Projekt-Memory**; aktualisiere deren Statuszeilen / „nächster Schritt" + die Projekt-Memory. **Überspringe** 2a Compact, `leads/`, `ACTIVITY`/`JOURNAL`/`BACKLOG`/`BLOCKERS`.
- **learning** → `LEARNING-LOG.md` ist die Working Memory: Session-Learnings + nächster Lern-Schritt anhängen; kein `state/`.
- **generic** → **kein `state/`**: nur Projekt-Memory + auffällige Top-Level-Docs, best effort.

Schritte 3 (Auto-Memory), 5 (Git-Warnung), 6 (Reality-Cross-Check), 7 (Learnings und Fragen), 9 (Marker) und 10 (Schlussmeldung) gelten **für alle Typen**. Den erkannten Typ im Abschluss-Summary nennen.

### 1. Kontext lesen

- `CLAUDE.md` § *Working memory* + § *Activity logging*
- `state/STATUS.md`, `state/BLOCKERS.md`, `state/BACKLOG.md`
- `state/JOURNAL.md` (letzte ~20 Zeilen) und `state/ACTIVITY.md` (Länge prüfen)
- Die relevante(n) `state/leads/<role>.md`
- `MEMORY.md`-Index + die Projekt-Memory-Datei dieses Projekts

Rekonstruiere: Was ist passiert? Was ist der aktuelle Stand? Was ist der nächste konkrete Schritt?

### 2. state/-MDs aktualisieren (direkt schreiben)

| Datei | Modus | Was |
|---|---|---|
| `STATUS.md` | **neu schreiben** | `Last updated`-Stempel + Session-Nummer hochzählen; aktuelle Phase; **„Nächster Schritt"** als konkrete erste Aktion fürs nächste Cold-Start; „Awaiting" (offene Fragen/Blocker); Test-/Typecheck-/Lint-Zahlen = letzter bekannter Stand. |
| `JOURNAL.md` | **anhängen** | Nur signifikante Events dieser Session. Idempotent: vorher letzte Zeilen lesen, nichts doppelt eintragen. |
| `ACTIVITY.md` | **anhängen** + ggf. prunen | Orchestrierungs-Events anhängen. Bei > ~100 Zeilen prunen und gelöschten Block als eine Summary-Zeile ins JOURNAL konsolidieren. |
| `BACKLOG.md` | **anhängen/ändern** | Erledigte Items auf `done`; neu entdeckte Arbeit ergänzen. |
| `BLOCKERS.md` | **anhängen/ändern** | Neue Blocker eintragen; gelöste als resolved markieren. |
| `leads/<role>.md` | **neu schreiben** | Aktive Lead-Dateien auf aktuellen Stand. |

### 2a. Compact if needed

Prüfe Dateigrößen. Reihenfolge: erst ACTIVITY, dann JOURNAL, dann BACKLOG.

| Datei | Schwellwert | Aktion |
|---|---|---|
| `state/ACTIVITY.md` | > 80 Zeilen | Älteste 40 Zeilen löschen; eine Summary-Zeile ans JOURNAL anhängen |
| `state/JOURNAL.md` | > 350 Zeilen | Zeilen 1–250 nach `docs/journal-archive-<YYYY>.md` anhängen; aus JOURNAL entfernen |
| `state/BACKLOG.md` | > 300 Zeilen | Alle `done`-Items nach `docs/backlog-archive.md` anhängen; aus BACKLOG entfernen |

### 3. Auto-Memory aktualisieren

- Die Projekt-Memory-Datei dieses Projekts: aktuellen Projektstand spiegeln, falls sich dauerhaftes geändert hat.
- `MEMORY.md`-Index: nur anfassen wenn neuer Memory-Eintrag dazukommt.
- Keine Geheimnisse/Token/PII.

### 4. Knowledge Graph aktualisieren

- Code geändert + `graphify-out/` existiert → `/graphify . --update` ausführen (AST-only, keine API-Kosten).
- Kein Code geändert → überspringen und im Summary vermerken.

### 5. Git-Hygiene — nur warnen

`git status --short` ausführen. Uncommittete Änderungen auflisten und warnen. **Nicht committen, nicht stashen.** Der Commit bleibt deine Entscheidung. Eine Frage dazu (z. B. „State-Reste committen?“) gehört in Schritt 7 — nach dem Marker kommt keine Frage mehr.

### 6. Konsistenz-Check + Stale-Reference-Scan

**Stale-Reference-Scan (immer zuerst):** Alle state-Dateien nach veralteten Task- und Phasen-Referenzen absuchen (z. B. `P8`, `P13.T1`, Status-Tags wie `in progress`, `awaiting`, `activate` — und, weil State-Dateien in der Sprache der Session stehen, `steht aus`, `ausstehend`, `läuft`, `wartet auf`, `erledigt`). Jeden Treffer gegen `BACKLOG.md` und JOURNAL gegenchecken. Veraltete Referenzen **direkt korrigieren**. Korrigierte Einträge in der Zusammenfassung auflisten.

Widerspricht `STATUS.md` irgendwo dem `JOURNAL.md`? Korrigieren.

---

### 7. Learnings prüfen und offene Fragen klären ← *nur bei /end-session, nicht bei /checkpoint*

**Alle Fragen dieses Skills stehen hier** — die zu den Learnings und, falls nötig, eine zum Commit aus
Schritt 5 — und sind beantwortet, bevor Schritt 8 beginnt. Der Marker (Schritt 9) zählt eine Session
als sauber beendet; ein Prompt danach zählt sie als unsauber (in einer Erprobung 2 von 4 Sessions, weil
die Frage erst nach dem Marker kam). **Jede Frage braucht ihre eigene Antwort:** mehrere Fragen in **einem**
Abfrage-Aufruf mit je eigener Frage (`AskUserQuestion` trägt bis zu vier; ein Widget, das nur eine Frage trägt, nicht für
zwei nutzen), sonst nummeriert im Text. Deckt eine Antwort nicht jede Frage eindeutig ab, die offene noch einmal stellen —
vor dem Marker —, nicht mit auslegen (Welle 1, 2026-10-25: eine freie Antwort auf die Learnings-Frage galt auch für den
State-Commit, der dann unterblieb). Die Diskussion über die Punkte gehört hierher, so lange sie dauert. Hat
sie am Stand etwas geändert (Entscheidungen, nächster Schritt), die Dateien aus Schritt 2–3 nachziehen,
bevor Schritt 8 beginnt.

Frage dich: **Hat diese Session etwas Wiederverwendbares über das Agenten-Team
gelehrt** — eine Rollen-Einstellung, ein Workflow-/Tier-/Phasen-Insight, ein
Tooling-Quirk, ein Anti-Pattern, das in zukünftigen Projekten nützt?

- **Ja** → im Chat kurz vorschlagen: *„Diese Session hatte Learnings (<1-Satz-
  Beispiel>). Soll ich `/capture-learning` ausführen, um sie in die Knowledge
  Base zu übernehmen?"* — und auf die Entscheidung des Nutzers warten. (Dieser
  Skill ruft `/capture-learning` **nicht** automatisch auf.) Sagt der Nutzer ja, läuft
  `/capture-learning` jetzt, samt der Diskussion über die Punkte; sein Schluss „Weiterarbeiten oder
  `/end-session`?“ entfällt, weil es in der Abschlussphase läuft. Danach weiter mit Schritt 8.
- **Später** (der Nutzer will die Learnings in der nächsten Session) → als nächsten Schritt in die
  Working Memory; im Summary vermerken.
- **Nein** → überspringen und im Summary vermerken („keine neuen Learnings").

### 8. Session-Closure-Log

**coding** — die zwei Log-Zeilen unten. **planning/generic** — keine `ACTIVITY`/`JOURNAL`: Session-Closure als **eine Zeile in der Projekt-Memory** (Session-Ende · was erledigt · nächster Schritt), optional im Master-Plan-Doc. **learning** — als Zeile ans **`LEARNING-LOG.md`** (was gelernt · nächster Lern-Schritt).

**ACTIVITY.md** — eine Zeile anhängen:
```
YYYY-MM-DD HH:MM team-lead session-end — session closed, ready for /clear
```

**JOURNAL.md** — einen Session-Abschluss-Eintrag anhängen:
```
YYYY-MM-DD: Session N end — <1-2 Sätze: was wurde erledigt, was ist der nächste Schritt>
```

Die Zusammenfassung muss konkret sein:
- ✅ Gut: *"Analyse-Report reviewt, Prettier-Hook + 3 CLAUDE.md-Ergänzungen gebaut. Next: /review-quick und /end-session Skills schreiben."*
- ❌ Schlecht: *"Arbeit wurde erledigt."*

### 9. Marker `session.closed` — alle Projekttypen

Erst wenn Schritt 7 ganz beantwortet und Schritt 8 geschrieben ist, einmal ausführen, im
Projektverzeichnis. Danach nur noch die Schlussmeldung:

```
# Bash-Tool (Git Bash — `~` wird aufgelöst):
node ~/.claude/hooks/log-event.js session.closed

# PowerShell-Tool (dort löst `~` für node NICHT auf → „Cannot find module“):
node "$env:USERPROFILE\.claude\hooks\log-event.js" session.closed
```

Der Befehl schreibt eine Zeile `session.closed` mit der Session-ID nach `state/events.jsonl`. Daran
wird gezählt, wie viele Sessions sauber mit `/end-session` enden; der SessionEnd-Hook trägt es
zusätzlich als `closed: true/false` am `session.end` ein. In Projekten ohne `state/` tut der Befehl
nichts und endet ohne Fehler — weiter mit Schritt 10. Kommt „Cannot find module“, war es die falsche
Schreibweise für die Shell; mit der anderen wiederholen. Nur bei `/end-session`, nicht bei
`/checkpoint`.

### 10. Schlussmeldung — letzte Nachricht der Phase

Direkt nach dem Marker im Chat ausgeben — **ohne Frage**, ohne „Soll ich …?“, ohne neue Arbeit. Alle
Fragen sind in Schritt 7 beantwortet; die letzte Zeile steht allein:

```
✅ Session abgeschlossen.

   AKTUALISIERT:     [Liste der geänderten MDs]
   GRAPH:            aktualisiert / übersprungen (kein Code geändert)
   GIT:              [uncommitted files oder "clean"]
   LEARNINGS:        [/capture-learning gelaufen / abgelehnt / später / keine]
   NÄCHSTER SCHRITT: [aus STATUS.md bzw. dem Plan-Doc] — für die nächste Session

Jetzt `/clear` tippen.
```

### Nach dem Marker

Schreibt der Nutzer doch noch etwas: kurz antworten und nichts Neues anfangen — ein neues Thema wie
oben (notieren oder Abschluss abbrechen). Ändert sich dabei am Stand etwas, die betroffenen Dateien
nachziehen. Jede solche Antwort endet wie die Phase: Marker erneut setzen (Schritt 9), dann mindestens
die Zeile „Jetzt `/clear` tippen.“ Gezählt wird gegen den letzten Marker — eine
so nachgezogene Session zählt als sauber beendet. Bricht der Nutzer den Abschluss ab, keinen Marker
setzen.
