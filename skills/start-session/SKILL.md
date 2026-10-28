---
name: start-session
description: "Session-Start: Projekttyp erkennen, Working-Set lesen, gegen git/Dateien verifizieren, Briefing mit nächstem Schritt. Trigger: /start-session"
trigger: /start-session
---

# /start-session

Rehydriere eine **kalt startende Session**: lies zusammen, was das Projekt gerade
ausmacht, prüfe es gegen die Realität und brief den nächsten konkreten Schritt —
damit die Arbeit nahtlos weiterläuft.

> **Symmetrisches Gegenstück zu `/end-session`.** `/end-session` *schreibt* den
> Snapshot; `/start-session` *liest ihn zurück, verifiziert ihn und
> briefinstruiert*. Es erwartet den Stand, den `/end-session` bzw. `/checkpoint`
> hinterlassen haben.

> **Read-first, kaum Writes.** Dieser Skill **orientiert** — er baut nichts, führt
> **keine** Tests/Typecheck/Linter aus und schreibt den State **nicht** neu. Einzige
> Schreib-Ausnahme: *eindeutig* veraltete Referenzen korrigieren (mit Vermerk); jede
> mehrdeutige Drift wird **gemeldet**, nicht still gefixt.

> **Anti-Fabrikat-Regel (identisch mit /checkpoint):** Nur berichten, was wirklich in
> den Dateien **und** der Realität (git/Dateien) steht. Keine erfundenen Fortschritte,
> Sign-offs oder „grün"-Stände. Bei echter Unklarheit offen benennen statt raten.

---

## Ablauf

### 0. Projekttyp erkennen (Step-0-Detektor)

Der Typ entscheidet, *welche* Dateien „wichtig" sind. Reihenfolge:

1. `CLAUDE.md`-Frontmatter hat ein explizites `type:` → **das gewinnt** (Override).
2. sonst `state/STATUS.md` existiert → **coding**.
3. sonst ein Master-Plan-/Roadmap-Doc existiert (`DISCUSS-TODO.md`, `ROADMAP*.md`,
   `PLAN*.md`, `PHASE*.md`) → **planning/docs**.
4. sonst `.obsidian/` (Obsidian-Vault) oder `LEARNING-LOG.md` existiert → **learning**.
5. sonst → **generic**.

Den erkannten Typ im Briefing nennen.

### 1. Arbeitsmenge lesen (typ-abhängig)

| Typ | Lies |
|---|---|
| **coding** | `state/STATUS.md` (voll) · `state/BLOCKERS.md` · die aktive(n) `state/leads/<role>.md` · `state/JOURNAL.md` (letzte ~20 Z.) · `state/ACTIVITY.md` (letzte ~15 Z.) · `state/BACKLOG.md` (offene Items) · `MEMORY.md`-Index + Projekt-Memory |
| **planning/docs** | das Master-Plan-Doc (Statuszeilen + offene Punkte) · das aktuellste/relevante `PHASE*`-Doc · `MEMORY.md` + Projekt-Memory |
| **learning** | `LEARNING-LOG.md` (Currently-learning + neueste Einträge + offene Fragen) · `MEMORY.md` + Projekt-Memory · Vault-Notizen best effort |
| **generic** | `MEMORY.md` + Projekt-Memory + Top-Level-`README`/Docs, best effort |

`CLAUDE.md` ist i. d. R. ohnehin geladen — bei Bedarf § *Working memory* / § *Boundaries*
mitnehmen. **Nicht** lesen: archivierte Journals, erledigte Backlog-Items, alte
Review-Reports — nur die *lebende* Arbeitsmenge.

Rekonstruiere daraus: **Was ist der Stand? Was ist gerade passiert? Was ist der
nächste konkrete Schritt?**

### 2. Verifizieren — der Realität misstrauen (nicht nur lesen)

**Wenn `.claude/agents/memory-keeper.md` existiert:** spawne den **memory-keeper**-
Subagent mit einem *self-contained* Auftrag (Projektpfad + die zu prüfenden Claims).
Er liefert einen **Drift-Report mit Korrektur-Vorschlägen** zurück; **dieser Skill**
entscheidet, was angewendet wird (der Agent schreibt nichts selbst).

**Immer, auch mit memory-keeper — Session-ID statt behaupteter Nummer:** die ID dieser Session
lesen (Bash: `echo "$CLAUDE_CODE_SESSION_ID"`, PowerShell: `$env:CLAUDE_CODE_SESSION_ID`) und gegen
die ID am letzten `session.closed` in `state/events.jsonl` halten: andere ID = neue Session, gleiche
ID = fortgesetzte Session. Ohne `state/`: das Transkript dieser Session
(`~/.claude/projects/<projekt>/<ID>.jsonl`) — beginnt es mit diesem Aufruf, ist es eine neue Session.
Eine Sessionnummer nur nennen, wenn State oder Closure-Log sie belegt und die ID dazu passt; sonst
„Nummer ungeprüft“. Dasselbe für Aussagen wie „erstmals“ oder „jetzt ladbar“: nur, wenn geprüft.

**Sonst (kein Agent — z. B. Nicht-Coding-Projekt): dieselben Checks inline:**

- **Blocker zuerst** — `BLOCKERS.md` bzw. offene Blocker im Plan-Doc. Wenn blockiert,
  ändert das das Briefing („du wartest auf X").
- **Reality-Cross-Check** — jeden „done"/„Nächster Schritt"-Claim gegen die Realität:
  - `git log --oneline -20`: behauptet ein Eintrag „X done", fehlt aber der Commit → flaggen.
  - **Datei-Existenz:** verweist ein Claim oder der „Nächste Schritt" auf eine Datei/
    einen Pfad, der nicht existiert → veraltet.
  - Bei Widerspruch MD ↔ Realität gilt **git/Code als Wahrheit**.
- **Stale-Reference-Scan** — Phasen-/Task-IDs (`P\d+`, `T\d+`, `P\d+\.T\d+`) + Status-Tags
  (`in progress`, `awaiting`, `activate`) gegen Plan/Backlog gegenchecken.
- **Git-Dangling** — `git status --short`: uncommittete Reste von *vor* dem `/clear`
  melden (nicht committen, nicht stashen). Kein git-Repo → überspringen.

Eindeutig veraltete Referenzen **korrigieren + vermerken**; mehrdeutige Drift **melden**,
nicht still ändern.

### 3. Environment-Precheck — nur wenn nötig

**Nur falls der nächste Schritt** einen Server-Start oder eine DB-Migration bedeutet:
Preconditions prüfen (Ports 3000/8081/8082 frei? Docker läuft?). Wo ein
projektspezifischer Start-Skill existiert (`/stocks-start`, `/buli-start`,
`/agent-office-start`), diesen **nennen** statt manuell zu starten. **Nichts starten** —
nur den Blocker früh sichtbar machen.

### 4. Kompaktes Briefing ausgeben (viel lesen, wenig sagen)

Nicht roh dumpen — **kompakt** zusammenfassen:

```
🔄 Session-Start — <Projektname> (<Typ>)

   HIER:             <aktuelle Phase / Stand> · Session <N | „Nummer ungeprüft“> (ID <erste 8 Zeichen>)
   GERADE PASSIERT:  <1–2 Sätze aus JOURNAL / Plan-Doc>
   NÄCHSTER SCHRITT: <konkrete erste Aktion — verifiziert>
   ACHTUNG:          <Blocker / Git-Dangling / Env — oder „keine">
   DRIFT:            <korrigierte/gemeldete Referenzen — oder „keine">
```

Abschließen mit einer klaren Aussage: **kann losgehen** — oder was vorher noch zu
klären ist.
