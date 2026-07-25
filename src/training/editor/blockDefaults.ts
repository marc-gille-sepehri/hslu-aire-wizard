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
    case 'doc_convert':
      return {
        id,
        type,
        title: 'Dokument nach Markdown konvertieren',
        instructions: 'Lade ein Dokument (PDF, PPTX, DOCX, Bild) oder eine Excel-Datei hoch und sieh dir die Umwandlung an.',
      }
    default: {
      // Exhaustiveness guard — a new schema type must be handled here.
      const _never: never = type
      throw new Error(`makeNewArtifact: unhandled type ${_never}`)
    }
  }
}
