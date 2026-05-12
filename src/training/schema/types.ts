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
  ref: string
  caption_override?: string | null
}
