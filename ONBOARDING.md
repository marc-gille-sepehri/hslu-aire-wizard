# Onboarding

Diese Anleitung reicht aus, um Texte und Bilder auf **ai-in-real-estate.ch** zu ändern und
zu veröffentlichen. Du brauchst dafür nichts zu programmieren — du beschreibst Claude Code,
was geändert werden soll, und folgst danach dem Ablauf unten.

---

## 1. Einrichtung (einmalig)

**Git for Windows installieren.** Herunterladen von <https://git-scm.com/download/win>, Installer
starten, alle Vorgaben übernehmen, bis „Finish".

**Terminal öffnen.** Windows-Taste drücken, `Git Bash` tippen, Enter. Alle folgenden Blöcke tippst
du dort ein (bzw. kopierst sie hinein und drückst Enter).

**Bei GitHub anmelden.**

```
gh auth login
```

Wähle nacheinander: `GitHub.com` → `HTTPS` → `Y` (Anmeldedaten für Git verwenden) →
`Login with a web browser`. Es erscheint ein achtstelliger Code. Kopiere ihn, drücke Enter, melde
dich im Browser an und füge den Code ein.

**Projekt herunterladen.**

```
cd ~
gh repo clone marc-gille-sepehri/hslu-aire-wizard
```

**In der Claude Code Desktop-App öffnen.** App starten, „Open Folder", den Ordner
`hslu-aire-wizard` in deinem Benutzerverzeichnis auswählen.

Fertig. Die Einrichtung machst du nie wieder.

---

## 2. Was du ändern darfst

Diese Bereiche gehören dir:

| Wo | Was drinsteht |
|---|---|
| `src/pages/` | Die öffentlichen Seiten: Startseite, Award-Seiten, Ergebnisseite |
| `src/components/` | Bausteine dieser Seiten (Formulare, Fragenanzeige, Auswertung) |
| `src/data/questions.js` | Die Fragen des Readiness-Checks |
| `src/data/awardVoteCandidates.js` | Die Kandidaten der Award-Abstimmung |
| `src/training/labels.ts` | Sämtliche Beschriftungen im Lernbereich |
| `public/` | Bilder und PDFs (Ausnahme: die Datei `CNAME`, siehe unten) |

**Hier bitte nichts ändern** — sag Marc Bescheid, wenn du an einer dieser Stellen etwas brauchst,
er macht es dann:

- `.github/` — steuert die Veröffentlichung
- `package.json`, `package-lock.json` — die verwendeten Programmbibliotheken
- `vite.config.js`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js` — Bauanweisungen
- `public/CNAME` — legt die Internetadresse fest; eine Änderung nimmt die Seite vom Netz
- `src/config/configuration.js` — verbindet die Seite mit dem Server

Claude Code lässt diese Dateien gar nicht erst zu. Wenn es sagt, etwas sei nicht erlaubt, ist das
kein Fehler von dir.

---

## 3. Der Ablauf für jede Änderung

Immer diese fünf Schritte, immer in dieser Reihenfolge.

**Schritt 1 — Neuesten Stand holen.** Sag Claude Code:

> Hol den neuesten Stand.

Damit wird `git pull` ausgeführt. Das ist nicht optional: Marc arbeitet am selben Projekt. Ohne
diesen Schritt entstehen Konflikte, deren Auflösung dich Zeit kostet.

**Schritt 2 — Änderung beschreiben.** Sag in einem Satz, was anders sein soll. Zum Beispiel:

> Auf der Startseite im Abschnitt „Über uns" den zweiten Absatz durch diesen Text ersetzen: …

**Schritt 3 — Anschauen.** Sag:

> Zeig mir das lokal.

Claude Code startet die Seite auf deinem Rechner (`VITE_CONFIG_MODE=production npm run dev`) und
nennt dir die Adresse — normalerweise <http://localhost:5173>. Öffne sie im Browser und sieh nach,
ob es stimmt. Danach: „Beende den lokalen Server."

**Schritt 4 — Speichern und hochladen.** Sag:

> Committe und pushe das.

**Schritt 5 — Warten.** Der Upload startet die Veröffentlichung von selbst. Nach etwa einer Minute
ist die Änderung unter <https://ai-in-real-estate.ch> zu sehen. Drücke im Browser `Strg+F5`, damit
er die neue Fassung lädt und nicht die gespeicherte alte.

---

## 4. Veröffentlichen

**Ein Upload ist sofort eine Veröffentlichung.** Es gibt keinen zusätzlichen Freigabeschritt.
Sobald Schritt 4 durch ist, läuft die Seite neu und geht kurz darauf live.

Der Vorgang heisst **Deploy to GitHub Pages** und dauert etwa eine Minute.

Mitverfolgen kannst du ihn so:

```
gh run watch
```

Das Kommando zeigt den Fortschritt und meldet am Ende `✓` (fertig) oder `X` (fehlgeschlagen).

Wenn du ohne Änderung neu veröffentlichen willst, tippe `/deploy` in Claude Code.

---

## 5. Rückgängig machen

Wenn nach einer Änderung etwas kaputt aussieht: mach es selbst rückgängig, sofort, ohne zu fragen.
Der folgende Weg ist **immer sicher**. Er löscht nichts und nimmt nichts weg — er fügt eine neue
Änderung hinzu, welche die letzte wieder aufhebt.

Sag Claude Code:

> Mach die letzte Änderung rückgängig und veröffentliche.

Oder tippe die drei Zeilen selbst:

```
git revert HEAD --no-edit
git push
gh run watch
```

Nach etwa einer Minute ist der vorherige Zustand wieder live.

Willst du zwei Änderungen zurücknehmen, führe den Ablauf zweimal aus. Sag es Marc hinterher — aber
erst dann. Die Seite soll nicht kaputt bleiben, während du auf eine Antwort wartest.

---

## 6. Wenn etwas nicht klappt

**Veröffentlichung prüfen:**

```
gh run list --limit 3
```

In der Spalte ganz links steht das Ergebnis. `completed success` ist gut. `completed failure` heisst:
die Veröffentlichung ist gescheitert — **die alte Fassung der Seite bleibt dabei online**, es ist
also nichts kaputt.

Wenn dort `failure` steht:

1. Mach die Änderung rückgängig (Kapitel 5).
2. Schreib Marc, was du geändert hattest und wann.

**Claude Code sagt, etwas sei nicht erlaubt:** Du bist an eine Schutzregel gestossen (Kapitel 2).
Nicht umgehen, sondern Marc fragen.

**`gh: command not found`:** Du bist im falschen Fenster. Öffne `Git Bash` (Kapitel 1).

---

## Das Wichtigste in vier Zeilen

1. Immer zuerst den neuesten Stand holen.
2. Änderung beschreiben, lokal anschauen.
3. Committen und pushen — das veröffentlicht sofort.
4. Sieht es falsch aus: rückgängig machen, dann Bescheid geben.
