// Schema v0.1 — keep narrow. If content needs a field that isn't here,
// surface a TODO rather than extending silently.

export type Module = {
  module: {
    id: string
    title: string
    lang: string
    resources: Record<string, Resource>
    sections: Section[]
  }
}

export type Resource =
  | { kind: 'image'; src: string; alt: string; caption?: string; credit?: string }
  | { kind: 'diagram'; src: string; alt: string; caption?: string; interactive?: boolean }
  | { kind: 'video'; src: string; poster?: string; duration?: number; captions?: string; transcript?: string }

export type Section = {
  id: string
  title: string
  objectives?: string[]
  artifacts: Artifact[]
}

export type Artifact =
  | ProseArtifact
  | BulletsArtifact
  | CalloutArtifact
  | MCQArtifact
  | LabSelectArtifact
  | ReflectArtifact
  | MediaArtifact
  | LlmPromptArtifact
  | BpmnArtifact
  | McpInspectorArtifact
  | OntologyArtifact
  | DataQueryArtifact
  | ObjectGraphArtifact
  | DocConvertArtifact
  | EmbeddingCompareArtifact

export type BaseArtifact = {
  id: string
  required?: boolean
  revealAnswer?: boolean
  attempts?: number
  tracked?: boolean
  minTimeSec?: number
}

export type ProseArtifact = BaseArtifact & { type: 'prose'; body: string }
export type BulletsArtifact = BaseArtifact & { type: 'bullets'; title?: string; items: string[] }
export type CalloutArtifact = BaseArtifact & {
  type: 'callout'
  variant: 'note' | 'warning' | 'insight' | 'example'
  body: string
}
export type MCQArtifact = BaseArtifact & {
  type: 'mcq'
  stem: string
  options: { text: string; correct: boolean; feedback?: string }[]
  explanation?: string
}
export type LabSelectArtifact = BaseArtifact & {
  type: 'lab_select'
  scenario: string
  options: { id: string; label: string; correct: boolean; feedback: string }[]
  explanation?: string
}
export type ReflectArtifact = BaseArtifact & {
  type: 'reflect'
  prompt: string
  guidance?: string
}
export type MediaArtifact = BaseArtifact & {
  type: 'media'
  /** Reference into module.resources (the asset library). Optional now that a
   *  direct URL is also supported; at most one of ref/url is used, url wins. */
  ref?: string
  /** Direct URL to an image, video or file (incl. YouTube / Vimeo). */
  url?: string
  /** Original name of an uploaded file — an S3 key is not a label. */
  filename?: string
  /** Byte size at upload time, for the download label. */
  filesize?: number
  /** Percent of the reading column, 10–100. Absent means full width.
   *  A percentage rather than pixels: the column is already responsive, and a
   *  figure fixed at 600px is either oversized on a phone or undersized on a
   *  projector. Anything below 100 is centred. */
  width?: number
  caption_override?: string | null
}
export type LlmPromptArtifact = BaseArtifact & {
  type: 'llm_prompt'
  title?: string
  /** Explanatory text shown above the widget. */
  instructions?: string
  /** Prompt prefilled into the input. */
  defaultPrompt?: string
  /** Model id preselected (must match a server model id). */
  defaultModel?: string
  /** Whether participants may switch the model (default true). */
  allowModelChoice?: boolean
  /** Whether participants may edit parameters like temperature (default true). */
  allowParamEditing?: boolean
}
export type BpmnArtifact = BaseArtifact & {
  type: 'bpmn'
  title?: string
  /** Explanatory text shown above the modeler. */
  instructions?: string
  /** Initial BPMN 2.0 XML the learner starts from (a start event if omitted). */
  starterXml?: string
}
export type McpInspectorArtifact = BaseArtifact & {
  type: 'mcp_inspector'
  title?: string
  /** Explanatory text shown above the inspector. */
  instructions?: string
  /** MCP server URL prefilled into the input. */
  defaultUrl?: string
}
export type OntologyArtifact = BaseArtifact & {
  type: 'ontology'
  title?: string
  /** Explanatory text shown above the explorer. */
  instructions?: string
}
export type DataQueryArtifact = BaseArtifact & {
  type: 'data_query'
  title?: string
  /** Explanatory text shown above the query editor. */
  instructions?: string
  /** SQL prefilled into the editor. */
  defaultQuery?: string
}
export type ObjectGraphArtifact = BaseArtifact & {
  type: 'object_graph'
  title?: string
  /** Explanatory text shown above the graph. */
  instructions?: string
  /** Ontology class to seed the graph with (default Site). */
  startType?: string
}
export type DocConvertArtifact = BaseArtifact & {
  type: 'doc_convert'
  title?: string
  /** Explanatory text shown above the converter. */
  instructions?: string
  /**
   * Spreadsheet output. 'cells' is a cell-addressed serialization that keeps
   * row/column addresses, merges and stored values; a Markdown table loses them
   * without an error. Absent behaves as 'markdown'. Ignored for non-tabular files.
   */
  outputFormat?: 'markdown' | 'cells' | 'both'
  /** How formula cells render in the cells output. Ignored unless cells are shown. */
  formulaMode?: 'silent' | 'error' | 'formula'
}

export type EmbeddingCompareArtifact = BaseArtifact & {
  type: 'embedding_compare'
  title?: string
  /** Explanatory text shown above the widget. */
  instructions?: string
  /** Texts the block starts with; participants can add, edit and remove them. */
  samples?: string[]
}
