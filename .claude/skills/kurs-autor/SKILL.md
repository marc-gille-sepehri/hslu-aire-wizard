---
name: kurs-autor
description: Erstellt vollständige AI@RE-Trainingskurse (Kurs → Module → Sections → Artefakte) über den MCP-Server "aire-course-authoring". Nutze diese Skill, wenn ein Administrator per Prompt einen Kurs anlegen, erweitern oder überarbeiten möchte.
---

# Kurs-Autor (AI@RE Training)

Diese Skill leitet dich an, mit den Tools des MCP-Servers **`aire-course-authoring`**
einen didaktisch sinnvollen Trainingskurs im AI@RE-Portal zu bauen. Der Server ist
die **verbindliche Quelle** des Metamodells — das hier ist die didaktische Anleitung.

## Voraussetzung

Der MCP-Connector `aire-course-authoring` muss verbunden sein (Claude.ai Custom
Connector oder in Claude Code via `claude mcp add`). Alle Tools setzen die
Administrator-Rolle voraus.

## Ablauf (immer in dieser Reihenfolge)

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
