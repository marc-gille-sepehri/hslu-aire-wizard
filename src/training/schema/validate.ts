import { z } from 'zod'
import type { Module } from './types'

const baseArtifact = z.object({
  id: z.string().min(1),
  required: z.boolean().optional(),
  revealAnswer: z.boolean().optional(),
  attempts: z.number().int().nonnegative().optional(),
  tracked: z.boolean().optional(),
  minTimeSec: z.number().nonnegative().optional(),
})

const proseArtifact = baseArtifact.extend({
  type: z.literal('prose'),
  body: z.string(),
})

const bulletsArtifact = baseArtifact.extend({
  type: z.literal('bullets'),
  title: z.string().optional(),
  items: z.array(z.string()).min(1),
})

const calloutArtifact = baseArtifact.extend({
  type: z.literal('callout'),
  variant: z.enum(['note', 'warning', 'insight', 'example']),
  body: z.string(),
})

const mcqArtifact = baseArtifact.extend({
  type: z.literal('mcq'),
  stem: z.string(),
  options: z
    .array(
      z.object({
        text: z.string(),
        correct: z.boolean(),
        feedback: z.string().optional(),
      })
    )
    .min(2),
  explanation: z.string().optional(),
})

const labSelectArtifact = baseArtifact.extend({
  type: z.literal('lab_select'),
  scenario: z.string(),
  options: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string(),
        correct: z.boolean(),
        feedback: z.string(),
      })
    )
    .min(2),
  explanation: z.string().optional(),
})

const reflectArtifact = baseArtifact.extend({
  type: z.literal('reflect'),
  prompt: z.string(),
  guidance: z.string().optional(),
})

const mediaArtifact = baseArtifact.extend({
  type: z.literal('media'),
  // Both optional: a media block may reference a library asset (ref) or carry a
  // direct URL, or be temporarily empty (incomplete) without breaking the module.
  ref: z.string().optional(),
  url: z.string().optional(),
  caption_override: z.string().nullable().optional(),
})

const llmPromptArtifact = baseArtifact.extend({
  type: z.literal('llm_prompt'),
  title: z.string().optional(),
  instructions: z.string().optional(),
  defaultPrompt: z.string().optional(),
  defaultModel: z.string().optional(),
  allowModelChoice: z.boolean().optional(),
  allowParamEditing: z.boolean().optional(),
})

const bpmnArtifact = baseArtifact.extend({
  type: z.literal('bpmn'),
  title: z.string().optional(),
  instructions: z.string().optional(),
  starterXml: z.string().optional(),
})

const artifact = z.discriminatedUnion('type', [
  proseArtifact,
  bulletsArtifact,
  calloutArtifact,
  mcqArtifact,
  labSelectArtifact,
  reflectArtifact,
  mediaArtifact,
  llmPromptArtifact,
  bpmnArtifact,
])

const section = z.object({
  id: z.string().min(1),
  title: z.string(),
  objectives: z.array(z.string()).optional(),
  artifacts: z.array(artifact),
})

const imageResource = z.object({
  kind: z.literal('image'),
  src: z.string().min(1),
  alt: z.string(),
  caption: z.string().optional(),
  credit: z.string().optional(),
})
const diagramResource = z.object({
  kind: z.literal('diagram'),
  src: z.string().min(1),
  alt: z.string(),
  caption: z.string().optional(),
  interactive: z.boolean().optional(),
})
const videoResource = z.object({
  kind: z.literal('video'),
  src: z.string().min(1),
  poster: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  captions: z.string().optional(),
  transcript: z.string().optional(),
})

const resource = z.discriminatedUnion('kind', [imageResource, diagramResource, videoResource])

export const moduleSchema = z.object({
  module: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    lang: z.string().min(1),
    resources: z.record(z.string(), resource),
    sections: z.array(section).min(1),
  }),
})

export type ValidationFailure = {
  path: string
  message: string
}

export function validateModule(
  raw: unknown
): { ok: true; module: Module } | { ok: false; failures: ValidationFailure[] } {
  const result = moduleSchema.safeParse(raw)
  if (result.success) {
    return { ok: true, module: result.data as Module }
  }
  const failures = result.error.issues.map((issue) => ({
    path: issue.path.length === 0 ? '(root)' : issue.path.join('.'),
    message: issue.message,
  }))
  return { ok: false, failures }
}
