// Block-type metadata for the editor palette + factory for new blocks.
// Keep the defaults valid against schema/types so a freshly dropped block
// renders immediately and passes validation on save/persist later.
import type { Artifact } from '../schema/types'

export type BlockType = Artifact['type']

export interface BlockTypeMeta {
  type: BlockType
  label: string
  icon: string
  hint: string
}

/** Palette order + display metadata (German labels to match the training UI). */
export const BLOCK_TYPES: BlockTypeMeta[] = [
  { type: 'prose', label: 'Text', icon: '📝', hint: 'Fliesstext-Absatz' },
  { type: 'bullets', label: 'Liste', icon: '•', hint: 'Aufzählung' },
  { type: 'callout', label: 'Hinweis', icon: '💡', hint: 'Hervorgehobener Kasten' },
  { type: 'mcq', label: 'Multiple Choice', icon: '❓', hint: 'Frage mit Optionen' },
  { type: 'lab_select', label: 'Szenario', icon: '🧪', hint: 'Szenario mit Auswahl' },
  { type: 'reflect', label: 'Reflexion', icon: '✍️', hint: 'Offene Eingabe' },
  { type: 'media', label: 'Medien', icon: '🖼️', hint: 'Bild / Video / YouTube per URL' },
  { type: 'llm_prompt', label: 'LLM-Prompt', icon: '🤖', hint: 'Prompt an ein Sprachmodell senden' },
  { type: 'bpmn', label: 'BPMN-Modell', icon: '🔀', hint: 'Prozess mit dem bpmn.io-Modeler zeichnen' },
  { type: 'mcp_inspector', label: 'MCP-Inspector', icon: '🧰', hint: 'MCP-Toolset verbinden und Tools testen' },
  { type: 'ontology', label: 'Ontologie', icon: '🕸️', hint: 'Datenraum-Metamodell erkunden' },
  { type: 'data_query', label: 'Datenabfrage', icon: '🗄️', hint: 'SQL gegen den Datenraum ausführen' },
  { type: 'object_graph', label: 'Objekt-Graph', icon: '🕸️', hint: 'Datenraum als Graph erkunden' },
  { type: 'doc_convert', label: 'Dokument → Markdown', icon: '📄', hint: 'PDF/PPT/Excel nach Markdown konvertieren' },
  { type: 'embedding_compare', label: 'Embeddings vergleichen', icon: '📐', hint: 'Textstücke als Punkte mit Distanzen' },
  { type: 'agent_trace', label: 'Agenten-Simulator', icon: '🤖', hint: 'Agent läuft mit; würde-tun statt tun' },
  { type: 'orchestration', label: 'Orchestrierung', icon: '🧩', hint: 'Werkzeuge beschreiben, Ablauf planen lassen' },
  { type: 'agent_loop', label: 'Agent-Schleife', icon: '🔁', hint: 'Ausführung Schritt für Schritt wie im Debugger' },
  { type: 'hyde_compare', label: 'HyDE-Suche', icon: '🕵️', hint: 'Suche mit der Frage vs. mit erfundener Antwort' },
  { type: 'decision_model', label: 'Entscheidungsmodell', icon: '⚖️', hint: 'Typisierte Fragen, Wahrscheinlichkeiten, Schwelle' },
]

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = BLOCK_TYPES.reduce(
  (acc, b) => ((acc[b.type] = b.label), acc),
  {} as Record<BlockType, string>,
)

/** Collision-resistant id for a new block (no server round-trip needed yet). */
function newId(type: BlockType): string {
  const rand = Math.floor(Math.random() * 1e6).toString(36)
  return `${type}-${Date.now().toString(36)}${rand}`
}

/**
 * Build a valid default artifact of the given type. Informational blocks are
 * tracked:false so they don't count toward section completion; interactive
 * blocks stay tracked (default).
 */
export function makeNewArtifact(type: BlockType): Artifact {
  const id = newId(type)
  switch (type) {
    case 'prose':
      return { id, type, tracked: false, body: 'Neuer Textabsatz. Doppelklick oder Bearbeiten zum Ändern.' }
    case 'bullets':
      return { id, type, tracked: false, title: '', items: ['Erster Punkt', 'Zweiter Punkt'] }
    case 'callout':
      return { id, type, tracked: false, variant: 'note', body: 'Hinweistext …' }
    case 'mcq':
      return {
        id,
        type,
        stem: 'Neue Frage …',
        options: [
          { text: 'Richtige Antwort', correct: true },
          { text: 'Falsche Antwort', correct: false },
        ],
        explanation: '',
      }
    case 'lab_select':
      return {
        id,
        type,
        scenario: 'Beschreiben Sie das Szenario …',
        options: [
          { id: `${id}-a`, label: 'Option A', correct: true, feedback: 'Warum A richtig ist.' },
          { id: `${id}-b`, label: 'Option B', correct: false, feedback: 'Warum B falsch ist.' },
        ],
        explanation: '',
      }
    case 'reflect':
      return { id, type, prompt: 'Reflexionsfrage …', guidance: '' }
    case 'media':
      // Starts empty (renders an edit-mode placeholder); admin pastes a URL.
      return { id, type, tracked: false, caption_override: null }
    case 'llm_prompt':
      return {
        id,
        type,
        tracked: false,
        title: 'Prompt ausprobieren',
        instructions:
          'Formuliere einen Prompt und sende ihn an das Modell. Es gibt keinen System-Prompt — du siehst das rohe Verhalten.',
        defaultPrompt: '',
        allowModelChoice: true,
        allowParamEditing: true,
      }
    case 'bpmn':
      return {
        id,
        type,
        title: 'Prozess modellieren',
        instructions: 'Zeichne den Prozess mit dem Modeler und speichere ihn anschliessend.',
      }
    case 'mcp_inspector':
      return {
        id,
        type,
        title: 'MCP-Toolset erkunden',
        instructions: 'Verbinde dich mit einem MCP-Server, sieh dir die Tools an und führe eines aus.',
      }
    case 'ontology':
      return {
        id,
        type,
        title: 'Datenraum-Ontologie erkunden',
        instructions: 'Wähle eine Klasse, um ihre Attribute und Beziehungen zu sehen. Folge den Beziehungen, um das Modell zu erkunden.',
      }
    case 'data_query':
      return {
        id,
        type,
        title: 'Datenraum abfragen (SQL)',
        instructions: 'Schreibe eine SELECT-Abfrage gegen den Datenraum und sieh dir die Ergebnistabelle an.',
        defaultQuery: "SELECT street, city, postalCode FROM Site ORDER BY city LIMIT 20",
      }
    case 'object_graph':
      return {
        id,
        type,
        title: 'Datenraum als Graph',
        instructions: 'Klicke einen Knoten, um seine Nachbarn zu laden, und erkunde so das Beziehungsnetz.',
        startType: 'Site',
      }
    case 'agent_loop':
      return {
        id,
        type,
        // Die Offertenanalyse als Vorgabe: sie braucht keine Vorkenntnis und
        // laesst sich mit einer eigenen Offerte sofort auf die eigene Arbeit
        // beziehen. Das Rollenszenario waehlt man bewusst.
        scenarioId: 'scn_offerten_v1',
        title: 'Die Agent-Schleife',
        instructions:
          'Ein Agent bekommt eine Verkaufsdokumentation und Werkzeuge für Lagedaten — aber nicht das Dokument selbst. Gib die Ausführung Schritt für Schritt frei und sieh zu, was in jedem Durchlauf gedacht, aufgerufen und zurückgegeben wird. Die eigene Offerte lässt sich einsetzen.',
        // Makro- und Mikroebene ausdruecklich zu nennen ist nicht fuehrend,
        // sondern der uebliche Analyserahmen — und ohne ihn greift der Agent
        // zuverlaessig nur zu den Gemeindedaten. Der Befund, den nur die
        // Mikrolage hergibt, bliebe dann liegen.
        defaultTask:
          'Ist der geforderte Kaufpreis plausibel, und welche Risiken auf Makro- und Mikroebene nennt die Dokumentation nicht?',
      }
    case 'orchestration':
      return {
        id,
        type,
        title: 'Agentische Orchestrierung',
        instructions:
          'Beschreibe Werkzeuge — Name, Zweck, Parameter. Stelle dann eine Aufgabe. Das Modell bekommt nur diese Beschreibungen und entwirft daraus einen Ablauf: welche Schritte, in welcher Reihenfolge, woher jedes Argument kommt. Ausgeführt wird nichts; hinter den Werkzeugen liegt nichts als ihre Beschreibung.',
        defaultRequest:
          'Prüfe für die Liegenschaft Sonnenrain 12, ob bei den laufenden Mietverträgen eine Anpassung fällig ist, und bereite die Mitteilung an die Mietenden vor.',
      }
    case 'agent_trace':
      return {
        id,
        type,
        title: 'Agent bei der Arbeit',
        instructions:
          'Der Agent läuft mit echten Werkzeugen. Alles, was er anschaut, führt er wirklich aus. Alles, was nach aussen wirken würde — eine Mail, eine Datei, ein Termin —, wird nur festgehalten und dir als Entwurf vorgelegt. Schau dir die Schritte an und entscheide, was du freigibst.',
        showTechnical: false,
      }
    case 'embedding_compare':
      return {
        id,
        type,
        title: 'Embeddings vergleichen',
        instructions:
          'Füge Textstücke ein und lass sie in Vektoren umrechnen. Die Punkte unten zeigen, wie nah sich die Texte inhaltlich sind — die Zahlen an den Linien sind die echten Distanzen.',
        samples: [
          'Die Notbeleuchtung im Treppenhaus ist ohne Funktion.',
          'Im Treppenhaus funktioniert die Sicherheitsbeleuchtung nicht.',
          'Der Mietvertrag läuft bis zum 31. Dezember 2027.',
        ],
      }
    case 'hyde_compare':
      return {
        id,
        type,
        // Zeichnet nichts auf; würde sonst den Abschnitt nie abschliessen lassen.
        tracked: false,
        title: 'Suchen mit einem Phantombild',
        instructions:
          'Stell eine kurze Frage. Links wird mit der Frage selbst gesucht, rechts mit einer Antwort, die ein Sprachmodell dafür erfunden hat. Ändere das Phantombild ruhig ins Falsche und such nochmals: Gefunden wird, was nach Antwort klingt, nicht was stimmt.',
        // Die Zielstelle teilt mit der Frage kaum ein Wort; die Ablenker
        // teilen Wörter, aber nicht den Sinn. Ohne diese Spannung gewinnt die
        // Frage, und es gibt nichts zu sehen.
        // Gemessen, nicht geraten: mit der Frage landen die beiden Ablenker
        // (2, 1) vor der Zielstelle (3), sie fällt bei topK 2 aus dem Kontext.
        // Mit dem Phantombild steht 3 vorne — auch wenn man darin „Vermieter“
        // durch „Mieter“ ersetzt, die Aussage also umdreht.
        corpus: [
          'Wer zahlt die neue Waschmaschine in der gemeinsamen Waschküche? Sie wird aus dem Erneuerungsfonds der Stockwerkeigentümergemeinschaft finanziert.',
          'Wer zahlt was? Neue Geräte, welche die Mieterschaft auf eigenen Wunsch anschafft, etwa ein Tumbler oder ein zweiter Kühlschrank, bezahlt sie selbst.',
          'Der Ersatz von Warmwasseraufbereitern und Wassererwärmern infolge Alters geht zu Lasten der Vermieterschaft; Entkalkungen trägt die Mieterschaft im Rahmen des kleinen Unterhalts.',
          'Wer zahlt die Nebenkosten? Akontozahlungen werden jährlich per 30. Juni abgerechnet; ein Saldo zugunsten der Mieterschaft wird mit der nächsten Miete verrechnet.',
          'Kleine Reparaturen bis CHF 150 im Einzelfall, wie das Ersetzen von Duschschläuchen oder Glühbirnen, übernimmt die Mieterschaft.',
          'Die Heizperiode dauert in der Regel vom 1. Oktober bis 30. April; die Raumtemperatur in Wohnräumen beträgt mindestens 20 Grad.',
        ],
        defaultQuestion: 'Wer zahlt den neuen Boiler?',
        topK: 2,
      }
    case 'decision_model':
      return {
        id,
        type,
        tracked: false,
        title: 'Entscheiden mit Wahrscheinlichkeiten',
        instructions:
          'Eine Meldung, mehrere Fragen mit festen Antwortmöglichkeiten. Das Modell antwortet nicht mit einem Satz, sondern mit Wahrscheinlichkeiten. Mit der Schwelle legst du fest, ab wann der Ablauf selbst handelt und wann er an eine Person geht.',
        defaultSituation:
          'Mieterin Frau Keller, Seestrasse 14, 3. OG links, schreibt am Sonntagabend: «Seit heute Nachmittag tropft es im Badezimmer von der Decke, inzwischen steht eine kleine Pfütze am Boden. Oben wohnt niemand, die Wohnung ist leer. Licht funktioniert noch.»',
        questions: [
          { kind: 'choice', prompt: 'Wer soll die Meldung als Erstes bearbeiten?', options: ['Hauswart', 'Sanitär-Notdienst', 'Versicherung', 'Bewirtschaftung am Montag'] },
          { kind: 'score', prompt: 'Wie dringend ist die Meldung?', levels: ['kann warten', 'diese Woche', 'heute noch', 'sofort'] },
          { kind: 'noul', prompt: 'Es besteht unmittelbare Gefahr für Personen.' },
          { kind: 'noul', prompt: 'Die Ursache liegt in der leeren Wohnung darüber.' },
        ],
        threshold: 90,
      }
    case 'doc_convert':
      return {
        id,
        type,
        title: 'Dokument nach Markdown konvertieren',
        instructions: 'Lade ein Dokument (PDF, PPTX, DOCX, Bild) oder eine Excel-Datei hoch und sieh dir die Umwandlung an.',
        outputFormat: 'markdown',
        formulaMode: 'silent',
      }
    default: {
      // Exhaustiveness guard — a new schema type must be handled here.
      const _never: never = type
      throw new Error(`makeNewArtifact: unhandled type ${_never}`)
    }
  }
}
