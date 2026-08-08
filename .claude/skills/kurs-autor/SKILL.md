---
name: kurs-autor
description: Erstellt und ändert AI@RE-Trainingskurse (Kurs → Module → Sections → Artefakte) über den MCP-Server "aire-course-authoring". Nutze diese Skill, wenn ein Administrator einen Kurs anlegen, ein Modul oder einen Abschnitt hinzufügen, bestehende Inhalte überarbeiten, Abschnitte umsortieren oder entfernen, oder einen Kurs veröffentlichen möchte.
---

# Kurs-Autor (AI@RE Training)

Diese Skill sagt dir, **woher** du die Anleitung bekommst — nicht, was darin steht.
Der MCP-Server `aire-course-authoring` liefert sie selbst und ist die verbindliche
Quelle. Alles, was sich mit neuen Tools ändert, steht dort und nur dort: diese
Datei wird von Hand verteilt und würde sonst veralten, während der Server
weiterläuft.

## Voraussetzung

Der MCP-Connector `aire-course-authoring` muss verbunden sein (Claude.ai Custom
Connector oder in Claude Code via `claude mcp add`). Alle Tools setzen die
Administrator-Rolle voraus.

## Vorgehen

1. **`describe_course_schema` aufrufen — immer als Erstes.** Liefert alle
   Artefakttypen mit ihren Feldern, die ID-Konventionen, den empfohlenen Ablauf
   und unter `editingExistingContent` die Regel, welches Tool wofür zuständig
   ist. Verlasse dich darauf statt auf Vorwissen.
2. **Den Prompt `author_course` des Connectors lesen.** Er enthält den
   didaktischen Modul-Bogen (Lernziele → Wissen → Interaktion → Reflexion), die
   Qualitätsregeln und ein Beispielmodul.
3. Danach bauen bzw. ändern.

## Die zwei Regeln, die du nicht vergessen darfst

**Beim Ändern: fasse nur an, was du änderst.** `update_module` mit `sections`
ersetzt den gesamten Modulinhalt — alles, was du nicht mitschickst, ist weg. Lies
`describe_course_schema` → `editingExistingContent` und nimm das kleinstmögliche
Tool. Vorher `get_module`, dessen `rev` als `expectedRev` mitgeben; bei
`REV_CONFLICT` neu laden statt überschreiben.

**Jede Änderung braucht eine `note`:** ein Satz, *was* du geändert hast und
*warum*. Sie steht im Versionsverlauf, und du kannst das fachlich präziser sagen
als jeder Platzhalter des Servers.

## Was du dem Nutzer sagst

- Vor der Änderung in ein bis zwei Sätzen: was du ändern wirst und was
  unangetastet bleibt.
- Veröffentlichte und aktive Kurse sind für Lernende sofort sichtbar. Weise
  darauf hin, bevor du sie änderst.
- Neue Kurse bleiben unveröffentlichter Draft, ausser der Nutzer bittet
  ausdrücklich um `publish_course`.
