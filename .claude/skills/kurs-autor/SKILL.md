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

`update_module` ersetzt den gesamten Modulinhalt. Jede Section und jedes Artefakt,
das du dabei nicht mitschickst, ist verloren — ohne Rückfrage. Für gezielte
Änderungen gibt es deshalb Tools, die genau eine Ebene anfassen:

| Was du willst | Tool |
|---|---|
| Ein Modul ansehen | `get_module` |
| Abschnitt hinten anhängen | `add_sections` |
| Abschnitt vorne oder mittendrin einfügen | `add_sections` mit `beforeSectionId` |
| Einen Abschnitt überarbeiten | `update_section` |
| Abschnitte umsortieren oder entfernen | `set_module_sections` |
| Modultitel oder -beschreibung ändern | `update_module` ohne `sections` |

`update_module` **mit** `sections` ist damit nur noch in einem Fall richtig: Du
willst ein Modul bewusst komplett neu schreiben. In jedem anderen Fall ist es
das falsche Werkzeug.

Jeder Schreibzugriff nimmt ausserdem eine **`note`**: ein Satz, *was* du geändert
hast (3–200 Zeichen). Er steht im Versionsverlauf und ist das, woran der Nutzer
deine Änderung später wiederfindet. „Modul aktualisiert" hilft niemandem —
„Aufgabenabschnitt am Ende angehängt" schon.

### Vor jeder Änderung

1. `get_module` aufrufen und den Ist-Zustand lesen.
2. Dem Nutzer in ein bis zwei Sätzen sagen, was du ändern wirst und was
   unangetastet bleibt.
3. Ändern — mit `note`, und mit `expectedRev` aus Schritt 1.
4. Nur bei `update_module` mit `sections`: mit `get_module` gegenlesen und
   prüfen, dass die Artefaktzahl stimmt. Die anderen Tools geben den neuen
   Zustand direkt zurück.

### Wenn du fremde Artefakttypen siehst

Das Portal kennt mehr Artefakttypen, als du vielleicht erwartest — etwa
`doc_convert`, `ontology`, `data_query`, `object_graph`. Maßgeblich ist immer
`describe_course_schema`, nicht dein Vorwissen. Unbekannte Typen nicht
weglassen oder „korrigieren": unverändert durchreichen.

### Konflikte

Lies `rev` aus `get_module` und gib es beim Schreiben als `expectedRev` mit.
Kommt `REV_CONFLICT` zurück, hat jemand parallel im Portal gearbeitet: neu
laden, dem Nutzer sagen was passiert ist, nicht blind überschreiben.

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
- Bei Änderungen an bestehenden Kursen: das kleinstmögliche Tool wählen
  (siehe „Bestehende Kurse ändern"). Nie ein ganzes Modul ersetzen, um einen
  Abschnitt anzufügen.
- Jeder Schreibzugriff braucht eine `note`, die die Änderung benennt. Kannst du
  nicht in einem Satz sagen, was du änderst, ist die Änderung zu gross.
- Veröffentlichte und aktive Kurse sind für Lernende sofort sichtbar. Bei
  Änderungen daran den Nutzer vorher darauf hinweisen.

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
