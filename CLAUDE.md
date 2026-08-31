# hslu-aire-wizard

Frontend der AI@RE-Plattform: öffentliche Seite, Readiness-Check, Award-Abstimmung und der
Lernbereich unter `/training`. React + Vite, veröffentlicht über GitHub Pages auf
<https://ai-in-real-estate.ch>. Die API liegt im Repo `hslu-aire-server` unter
<https://api.ai-in-real-estate.ch>.

## Veröffentlichung

Der Workflow `.github/workflows/deploy.yml` („Deploy to GitHub Pages") läuft bei **jedem Push auf
`main`** und zusätzlich auf manuellen Anstoss (`workflow_dispatch`). Es gibt keinen
Freigabeschritt dazwischen: ein Push ist eine Veröffentlichung. Laufzeit rund eine Minute.

Manuell anstossen und mitverfolgen:

```
gh workflow run deploy.yml
gh run watch
```

Lokale Vorschau gegen die Live-API:

```
VITE_CONFIG_MODE=production npm run dev
```

Ohne `VITE_CONFIG_MODE` zeigt der Dev-Server auf `http://localhost:9011` — dann funktionieren
Anmeldung und Lernbereich nur, wenn `hslu-aire-server` daneben läuft.

## Arbeiten mit externem Collaborator

Auf diesem Repo arbeitet ausser Marc eine Person ohne Entwicklungshintergrund, ausschliesslich über
die Claude Code Desktop-App. Ihre Anleitung ist `ONBOARDING.md`. Wenn du in einer Session mit ihr
arbeitest, gilt Folgendes.

**Beide arbeiten direkt auf `main`.** Es gibt keine Branches und keine Pull Requests. Deshalb ist
`git pull` der erste Schritt jeder Sitzung, nicht der zweite. Wenn du merkst, dass seit dem letzten
Pull etwas hereingekommen ist, sag es und hole nach.

**Änderbar sind ausschliesslich diese Pfade:**

| Pfad | Inhalt |
|---|---|
| `src/pages/` | Öffentliche Seiten samt zugehöriger CSS |
| `src/components/` | Bausteine dieser Seiten |
| `src/data/questions.js` | Fragen des Readiness-Checks |
| `src/data/awardVoteCandidates.js` | Kandidaten der Award-Abstimmung |
| `src/training/labels.ts` | Beschriftungen des Lernbereichs |
| `public/` | Bilder und PDFs — **ausser `public/CNAME`** |

**Gesperrt, mit Absicht** (`.claude/settings.json` verweigert Schreibzugriff):
`.github/**`, `package.json`, `package-lock.json`, `vite.config.js`, `tsconfig.json`,
`tailwind.config.js`, `postcss.config.js`, `public/CNAME`, `src/config/configuration.js`,
`.claude/settings.json`.

Wenn eine Aufgabe eine dieser Dateien braucht: **nicht umgehen und nicht vorschlagen, die Regel zu
lockern.** Sag, dass Marc das übernehmen muss, und beschreib knapp, was nötig wäre.

**Änderungen am Lernbereich (`src/training/`) ausserhalb von `labels.ts`** sind technisch erlaubt,
aber selten das, was gemeint ist. Frag nach, bevor du dort etwas anfasst.

**Nach jedem Push ist die Seite live.** Sag das dazu, wenn du pushst — nicht als Warnung, sondern
damit klar ist, dass jetzt keine Freigabe mehr kommt.

**Bei einer fehlgeschlagenen Veröffentlichung** schlägst du `git revert HEAD` vor und führst es auf
Zuruf aus. Die alte Fassung bleibt währenddessen online; es besteht kein Zeitdruck, aber auch kein
Grund zu warten.

## Blocktypen im Lernbereich

Artefakttypen sind an fünf Stellen registriert: `src/training/schema/types.ts`,
`src/training/schema/validate.ts`, `src/training/components/artifacts/index.ts`,
`src/training/editor/blockDefaults.ts` und `src/training/editor/BlockEditorDialog.tsx`.

Ein neuer Blocktyp muss zusätzlich im Server registriert werden — in der Artefakt-Registry des
Authoring-MCP **und** in `normalizeInteraction`, sonst weist `/training/progress` seine
Interaktionen mit 400 ab und der Block schreibt lautlos keinen Fortschritt.

## Tailwind

Preflight ist abgeschaltet. Rahmen brauchen deshalb immer beides: `border-width` **und**
`border-style`. Eine Klasse wie `border` allein zeichnet nichts.

`src/index.css` blendet `svg rect[width][height]` global aus. Icons müssen mit `<path>` gezeichnet
werden, sonst sind sie unsichtbar.
