---
name: kurs-autor
description: Erstellt und ändert AI@RE-Trainingskurse (Kurs → Module → Sections → Artefakte) über den MCP-Server "aire-course-authoring". Nutze diese Skill, wenn ein Administrator einen Kurs anlegen, ein Modul oder einen Abschnitt hinzufügen, bestehende Inhalte überarbeiten, Abschnitte umsortieren oder entfernen, oder einen Kurs veröffentlichen möchte.
---

# Kurs-Autor (AI@RE Training)

Diese Skill leitet dich an, mit den Tools des MCP-Servers **`aire-course-authoring`**
einen didaktisch sinnvollen Trainingskurs im AI@RE-Portal zu bauen. Der Server ist
die **verbindliche Quelle** des Metamodells — das hier ist die didaktische Anleitung.

## Voraussetzung

Der MCP-Connector `aire-course-authoring` muss verbunden sein (Claude.ai Custom
Connector oder in Claude Code via `claude mcp add`). Alle Tools setzen die
Administrator-Rolle voraus.

## Ablauf beim Neubau eines Kurses

1. **`describe_course_schema` zuerst aufrufen.** Es liefert alle Artefakttypen,
   Felder, Regeln und ID-Konventionen. Verlasse dich darauf statt zu raten.
2. **Gliederung entwerfen** (dem Nutzer kurz vorschlagen, bevor du baust): 2–5
   Module, je 2–4 Sections. Kläre offene Punkte (Zielgruppe, Sprache, Umfang, ob
   veröffentlicht werden soll).
3. **`create_course`** → leerer, unveröffentlichter Draft. Merke dir die `courseId`.
4. Pro Modul **`create_module`** mit vollständigen `sections` + `artifacts`. Bei
   Validierungsfehlern liefert das Tool die genauen Stellen — korrigiere und wiederhole.
5. **`set_course_modules`** für die Reihenfolge (falls nicht in Anlege-Reihenfolge).
6. **`get_course`** zum Gegenlesen.
7. Nur auf ausdrückliche Bitte **`publish_course`** (+ `set_active_version`).
   Standard: Draft lassen, damit der Administrator im Portal prüft.

## Bestehende Kurse ändern

Beim Ändern gilt eine Regel vor allen anderen: **Fasse nur an, was du änderst.**

`update_module` mit `sections` ersetzt den gesamten Modulinhalt — alles, was du
nicht mitschickst, ist weg. Für gezielte Änderungen gibt es Tools, die genau eine
Ebene anfassen.

Rufe deshalb vor jeder Änderung `describe_course_schema` auf und folge dem
Abschnitt `editingExistingContent`. Dort steht, welches Tool wofür zuständig ist.
Diese Liste wird im Server gepflegt und ist maßgeblich — hier steht sie bewusst
nicht noch einmal.

Vorgehen:

1. `get_module` aufrufen und den Ist-Zustand lesen.
2. Dem Nutzer in ein bis zwei Sätzen sagen, was du ändern wirst und was
   unangetastet bleibt.
3. Das kleinstmögliche Tool wählen und schreiben. `rev` aus `get_module` als
   `expectedRev` mitgeben, und `note` als einen Satz, **was** du geändert hast
   und **warum** — die Notiz ist Pflicht, und du kannst fachlich präziser sagen
   als jeder Platzhalter, worum es ging.
4. Kommt `REV_CONFLICT` zurück, hat jemand parallel im Portal gearbeitet: neu
   laden, den Nutzer informieren, nicht blind überschreiben.

Wenn du beim Lesen Artefakttypen siehst, die du nicht erwartet hast: unverändert
durchreichen. Niemals weglassen oder „korrigieren".

## Didaktischer Modul-Bogen

Baue jedes Modul entlang: **Lernziele → Wissen → Interaktion → Reflexion.**

- **Lernziele**: `section.objectives` (kurze, überprüfbare Ziele).
- **Wissen**: `prose` (Markdown: Überschriften, Fett, Listen, Links), `bullets`,
  `callout` (`note`/`warning`/`insight`/`example`), `media` (Bild/Video per `url`).
- **Interaktion** (mind. eine pro Modul, zählt zum Fortschritt): `mcq`
  (Wissenscheck), `lab_select` (Szenario „wähle die beste Option"), `llm_prompt`
  (LLM-Playground), `bpmn` (Prozess modellieren), `mcp_inspector` (MCP-Tools testen).
- **Reflexion**: `reflect` (offene Frage, nicht bewertet).

## Qualitätsregeln

- Lernenden-Texte in der Kurssprache (Default **Deutsch**), konkret und beispielreich.
- Jede Section braucht ≥1 Artefakt; jedes Modul ≥1 Section.
- `mcq`/`lab_select`: ≥2 Optionen; genau die korrekten markieren; Feedback geben.
- Section-/Artefakt-IDs kannst du weglassen — der Server vergibt sie.
- Keine erfundenen Medien-URLs; nur echte/leere lassen.
- Bei Änderungen an bestehenden Kursen das kleinstmögliche Tool wählen. Nie ein
  ganzes Modul ersetzen, um einen Abschnitt anzufügen.
- Veröffentlichte und aktive Kurse sind für Lernende sofort sichtbar. Weise den
  Nutzer darauf hin, bevor du sie änderst.

## Minimalbeispiel (ein Modul, zwei Sections)

```
create_course(title="Einführung in KI im Immobilienwesen",
              description="Grundlagen und erste Anwendungen.")
# → courseId

create_module(courseId, title="Grundlagen", description="Was ist KI und wozu?",
  sections=[
    { title: "Begriffe", objectives: ["KI von ML unterscheiden"],
      artifacts: [
        { type: "prose", body: "# Was ist KI?\n**Künstliche Intelligenz** …" },
        { type: "bullets", title: "Kernbegriffe", items: ["ML", "LLM", "Agent"] },
        { type: "callout", variant: "insight", body: "Merke: Daten schlagen Modelle." }
      ] },
    { title: "Selbstcheck",
      artifacts: [
        { type: "mcq", stem: "Was ist ein LLM?",
          options: [
            { text: "Ein Sprachmodell", correct: true, feedback: "Genau." },
            { text: "Eine Datenbank", correct: false, feedback: "Nein." }
          ], explanation: "LLM = Large Language Model." },
        { type: "reflect", prompt: "Wo könntest du KI in deinem Alltag einsetzen?" }
      ] }
  ])

get_course(courseId)   # gegenlesen; Draft belassen
```
