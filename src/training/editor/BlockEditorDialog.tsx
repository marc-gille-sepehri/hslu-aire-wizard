import { useEffect, useState, type ReactNode } from 'react'
import type {
  Artifact,
  BpmnArtifact,
  BulletsArtifact,
  CalloutArtifact,
  LabSelectArtifact,
  LlmPromptArtifact,
  DataQueryArtifact,
  DocConvertArtifact,
  McpInspectorArtifact,
  MCQArtifact,
  MediaArtifact,
  ObjectGraphArtifact,
  OntologyArtifact,
  ProseArtifact,
  ReflectArtifact,
} from '../schema/types'
import { useModuleEditor } from './ModuleEditorContext'
import { BLOCK_TYPE_LABEL } from './blockDefaults'
import { labels } from '../labels'
import MarkdownEditor from './MarkdownEditor'
import { fetchModels, type ModelInfo } from '../lib/llmApi'
import { detectMedia, mediaKindLabel } from '../lib/media'

const t = labels.editor

// ── Field primitives ──────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
}

function TextArea({ value, onChange, rows = 5 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return <textarea className={`${inputCls} font-serif leading-relaxed`} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
}

/** Editor for a list of plain strings (bullets). */
function StringListEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const set = (i: number, v: string) => onChange(items.map((it, idx) => (idx === i ? v : it)))
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, ''])
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={inputCls} value={it} onChange={(e) => set(i, e.target.value)} />
          <button type="button" onClick={() => remove(i)} className="shrink-0 rounded-md border border-mist px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">
            {t.removeItem}
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="rounded-md border border-mist px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream">
        + {t.addItem}
      </button>
    </div>
  )
}

// ── Per-type editors ──────────────────────────────────────────────────────
function ProseEditor({ draft, set, courseId }: { draft: ProseArtifact; set: (d: ProseArtifact) => void; courseId?: string }) {
  return (
    <Field label={t.fBody}>
      <MarkdownEditor value={draft.body} onChange={(v) => set({ ...draft, body: v })} courseId={courseId} />
    </Field>
  )
}

function BulletsEditor({ draft, set }: { draft: BulletsArtifact; set: (d: BulletsArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v })} />
      </Field>
      <Field label={t.fItems}>
        <StringListEditor items={draft.items} onChange={(items) => set({ ...draft, items })} />
      </Field>
    </div>
  )
}

const VARIANTS: { value: CalloutArtifact['variant']; label: string }[] = [
  { value: 'note', label: t.variantNote },
  { value: 'insight', label: t.variantInsight },
  { value: 'warning', label: t.variantWarning },
  { value: 'example', label: t.variantExample },
]

function CalloutEditor({ draft, set }: { draft: CalloutArtifact; set: (d: CalloutArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fVariant}>
        <select className={inputCls} value={draft.variant} onChange={(e) => set({ ...draft, variant: e.target.value as CalloutArtifact['variant'] })}>
          {VARIANTS.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </Field>
      <Field label={t.fBody}>
        <TextArea value={draft.body} onChange={(v) => set({ ...draft, body: v })} />
      </Field>
    </div>
  )
}

function McqEditor({ draft, set }: { draft: MCQArtifact; set: (d: MCQArtifact) => void }) {
  const setOpt = (i: number, patch: Partial<MCQArtifact['options'][number]>) =>
    set({ ...draft, options: draft.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) })
  const addOpt = () => set({ ...draft, options: [...draft.options, { text: '', correct: false }] })
  const removeOpt = (i: number) => set({ ...draft, options: draft.options.filter((_, idx) => idx !== i) })
  return (
    <div className="space-y-4">
      <Field label={t.fStem}>
        <TextArea value={draft.stem} rows={2} onChange={(v) => set({ ...draft, stem: v })} />
      </Field>
      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">{t.fOptions}</span>
        <div className="space-y-3">
          {draft.options.map((o, i) => (
            <div key={i} className="rounded-md border border-mist p-3">
              <div className="mb-2 flex items-center gap-2">
                <input className={inputCls} placeholder={t.fOptionText} value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} />
                <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={o.correct} onChange={(e) => setOpt(i, { correct: e.target.checked })} />
                  {t.markCorrect}
                </label>
                <button type="button" onClick={() => removeOpt(i)} className="shrink-0 rounded-md border border-mist px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">
                  {t.removeItem}
                </button>
              </div>
              <input className={inputCls} placeholder={t.fFeedback} value={o.feedback ?? ''} onChange={(e) => setOpt(i, { feedback: e.target.value })} />
            </div>
          ))}
          <button type="button" onClick={addOpt} className="rounded-md border border-mist px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream">
            + {t.addItem}
          </button>
        </div>
      </div>
      <Field label={t.fExplanation}>
        <TextArea value={draft.explanation ?? ''} rows={2} onChange={(v) => set({ ...draft, explanation: v })} />
      </Field>
    </div>
  )
}

function LabSelectEditor({ draft, set }: { draft: LabSelectArtifact; set: (d: LabSelectArtifact) => void }) {
  const setOpt = (i: number, patch: Partial<LabSelectArtifact['options'][number]>) =>
    set({ ...draft, options: draft.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) })
  const addOpt = () =>
    set({ ...draft, options: [...draft.options, { id: `${draft.id}-${draft.options.length}`, label: '', correct: false, feedback: '' }] })
  const removeOpt = (i: number) => set({ ...draft, options: draft.options.filter((_, idx) => idx !== i) })
  return (
    <div className="space-y-4">
      <Field label={t.fScenario}>
        <TextArea value={draft.scenario} onChange={(v) => set({ ...draft, scenario: v })} />
      </Field>
      <div>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">{t.fOptions}</span>
        <div className="space-y-3">
          {draft.options.map((o, i) => (
            <div key={o.id} className="rounded-md border border-mist p-3">
              <div className="mb-2 flex items-center gap-2">
                <input className={inputCls} placeholder={t.fOptionLabel} value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} />
                <label className="flex shrink-0 items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={o.correct} onChange={(e) => setOpt(i, { correct: e.target.checked })} />
                  {t.markCorrect}
                </label>
                <button type="button" onClick={() => removeOpt(i)} className="shrink-0 rounded-md border border-mist px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">
                  {t.removeItem}
                </button>
              </div>
              <input className={inputCls} placeholder={t.fFeedback} value={o.feedback} onChange={(e) => setOpt(i, { feedback: e.target.value })} />
            </div>
          ))}
          <button type="button" onClick={addOpt} className="rounded-md border border-mist px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream">
            + {t.addItem}
          </button>
        </div>
      </div>
      <Field label={t.fExplanation}>
        <TextArea value={draft.explanation ?? ''} rows={2} onChange={(v) => set({ ...draft, explanation: v })} />
      </Field>
    </div>
  )
}

function BpmnEditor({ draft, set }: { draft: BpmnArtifact; set: (d: BpmnArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v || undefined })} />
      </Field>
      <Field label={t.fInstructions}>
        <TextArea value={draft.instructions ?? ''} rows={2} onChange={(v) => set({ ...draft, instructions: v || undefined })} />
      </Field>
      <p className="text-xs text-slate-500">{t.bpmnEditorHint}</p>
    </div>
  )
}

function McpInspectorEditor({ draft, set }: { draft: McpInspectorArtifact; set: (d: McpInspectorArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v || undefined })} />
      </Field>
      <Field label={t.fInstructions}>
        <TextArea value={draft.instructions ?? ''} rows={2} onChange={(v) => set({ ...draft, instructions: v || undefined })} />
      </Field>
      <Field label={t.fMcpDefaultUrl}>
        <TextInput value={draft.defaultUrl ?? ''} onChange={(v) => set({ ...draft, defaultUrl: v || undefined })} />
      </Field>
      <p className="text-xs text-slate-500">{t.mcpEditorHint}</p>
    </div>
  )
}

function OntologyEditor({ draft, set }: { draft: OntologyArtifact; set: (d: OntologyArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v || undefined })} />
      </Field>
      <Field label={t.fInstructions}>
        <TextArea value={draft.instructions ?? ''} rows={2} onChange={(v) => set({ ...draft, instructions: v || undefined })} />
      </Field>
      <p className="text-xs text-slate-500">{t.ontologyEditorHint}</p>
    </div>
  )
}

function DataQueryEditor({ draft, set }: { draft: DataQueryArtifact; set: (d: DataQueryArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v || undefined })} />
      </Field>
      <Field label={t.fInstructions}>
        <TextArea value={draft.instructions ?? ''} rows={2} onChange={(v) => set({ ...draft, instructions: v || undefined })} />
      </Field>
      <Field label={t.fDefaultQuery}>
        <TextArea value={draft.defaultQuery ?? ''} rows={3} onChange={(v) => set({ ...draft, defaultQuery: v || undefined })} />
      </Field>
      <p className="text-xs text-slate-500">{t.dataQueryEditorHint}</p>
    </div>
  )
}

function ObjectGraphEditor({ draft, set }: { draft: ObjectGraphArtifact; set: (d: ObjectGraphArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v || undefined })} />
      </Field>
      <Field label={t.fInstructions}>
        <TextArea value={draft.instructions ?? ''} rows={2} onChange={(v) => set({ ...draft, instructions: v || undefined })} />
      </Field>
      <Field label={t.fStartType}>
        <TextInput value={draft.startType ?? ''} onChange={(v) => set({ ...draft, startType: v || undefined })} />
      </Field>
      <p className="text-xs text-slate-500">{t.objectGraphEditorHint}</p>
    </div>
  )
}

function DocConvertEditor({ draft, set }: { draft: DocConvertArtifact; set: (d: DocConvertArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v || undefined })} />
      </Field>
      <Field label={t.fInstructions}>
        <TextArea value={draft.instructions ?? ''} rows={2} onChange={(v) => set({ ...draft, instructions: v || undefined })} />
      </Field>
      <Field label={t.fOutputFormat}>
        <select
          className={inputCls}
          value={draft.outputFormat ?? 'markdown'}
          onChange={(e) => set({ ...draft, outputFormat: e.target.value as DocConvertArtifact['outputFormat'] })}
        >
          <option value="markdown">{t.outputFormatOpt.markdown}</option>
          <option value="cells">{t.outputFormatOpt.cells}</option>
          <option value="both">{t.outputFormatOpt.both}</option>
        </select>
      </Field>
      {draft.outputFormat && draft.outputFormat !== 'markdown' && (
        <Field label={t.fFormulaMode}>
          <select
            className={inputCls}
            value={draft.formulaMode ?? 'silent'}
            onChange={(e) => set({ ...draft, formulaMode: e.target.value as DocConvertArtifact['formulaMode'] })}
          >
            <option value="silent">{t.formulaModeOpt.silent}</option>
            <option value="error">{t.formulaModeOpt.error}</option>
            <option value="formula">{t.formulaModeOpt.formula}</option>
          </select>
        </Field>
      )}
      <p className="text-xs text-slate-500">{t.docConvertEditorHint}</p>
    </div>
  )
}

function ReflectEditor({ draft, set }: { draft: ReflectArtifact; set: (d: ReflectArtifact) => void }) {
  return (
    <div className="space-y-4">
      <Field label={t.fPrompt}>
        <TextArea value={draft.prompt} rows={2} onChange={(v) => set({ ...draft, prompt: v })} />
      </Field>
      <Field label={t.fGuidance}>
        <TextInput value={draft.guidance ?? ''} onChange={(v) => set({ ...draft, guidance: v })} />
      </Field>
    </div>
  )
}

function MediaEditor({ draft, set, resourceKeys }: { draft: MediaArtifact; set: (d: MediaArtifact) => void; resourceKeys: string[] }) {
  const detected = draft.url ? detectMedia(draft.url) : null
  return (
    <div className="space-y-4">
      <Field label={t.fMediaUrl}>
        <TextInput
          value={draft.url ?? ''}
          placeholder={t.mediaUrlPlaceholder}
          onChange={(v) => set({ ...draft, url: v === '' ? undefined : v })}
        />
        {draft.url?.trim() && (
          <p className="mt-1 text-xs text-slate-500">
            {t.mediaDetected}: <span className="font-medium text-navy">{mediaKindLabel(detected)}</span>
          </p>
        )}
      </Field>
      {resourceKeys.length > 0 && (
        <Field label={t.fResourceOptional}>
          <select
            className={inputCls}
            value={draft.ref ?? ''}
            onChange={(e) => set({ ...draft, ref: e.target.value === '' ? undefined : e.target.value })}
            disabled={!!draft.url?.trim()}
          >
            <option value="">—</option>
            {resourceKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {!!draft.url?.trim() && <p className="mt-1 text-xs text-slate-400">{t.mediaUrlWins}</p>}
        </Field>
      )}
      <Field label={t.fCaption}>
        <TextInput value={draft.caption_override ?? ''} onChange={(v) => set({ ...draft, caption_override: v === '' ? null : v })} />
      </Field>
    </div>
  )
}

function LlmPromptEditor({ draft, set }: { draft: LlmPromptArtifact; set: (d: LlmPromptArtifact) => void }) {
  const [models, setModels] = useState<ModelInfo[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchModels()
      .then((list) => !cancelled && setModels(list))
      .catch(() => !cancelled && setModels([]))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-4">
      <Field label={t.fTitle}>
        <TextInput value={draft.title ?? ''} onChange={(v) => set({ ...draft, title: v })} />
      </Field>
      <Field label={t.fInstructions}>
        <TextArea value={draft.instructions ?? ''} rows={2} onChange={(v) => set({ ...draft, instructions: v })} />
      </Field>
      <Field label={t.fDefaultModel}>
        <select
          className={inputCls}
          value={draft.defaultModel ?? ''}
          onChange={(e) => set({ ...draft, defaultModel: e.target.value || undefined })}
        >
          <option value="">{t.fDefaultModelAuto}</option>
          {(models ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.fDefaultPrompt}>
        <TextArea value={draft.defaultPrompt ?? ''} rows={3} onChange={(v) => set({ ...draft, defaultPrompt: v })} />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={draft.allowModelChoice !== false}
          onChange={(e) => set({ ...draft, allowModelChoice: e.target.checked })}
        />
        {t.fAllowModelChoice}
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={draft.allowParamEditing !== false}
          onChange={(e) => set({ ...draft, allowParamEditing: e.target.checked })}
        />
        {t.fAllowParamEditing}
      </label>
    </div>
  )
}

// ── Dialog shell ──────────────────────────────────────────────────────────
export default function BlockEditorDialog({
  sectionId,
  artifact,
  onClose,
}: {
  sectionId: string
  artifact: Artifact
  onClose: () => void
}) {
  const { updateArtifact, mod, courseId } = useModuleEditor()
  const [draft, setDraft] = useState<Artifact>(() => structuredClone(artifact))
  const resourceKeys = Object.keys(mod.module.resources ?? {})

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = () => {
    updateArtifact(sectionId, artifact.id, draft)
    onClose()
  }

  const body = (() => {
    switch (draft.type) {
      case 'prose':
        return <ProseEditor draft={draft} set={setDraft} courseId={courseId} />
      case 'bullets':
        return <BulletsEditor draft={draft} set={setDraft} />
      case 'callout':
        return <CalloutEditor draft={draft} set={setDraft} />
      case 'mcq':
        return <McqEditor draft={draft} set={setDraft} />
      case 'lab_select':
        return <LabSelectEditor draft={draft} set={setDraft} />
      case 'reflect':
        return <ReflectEditor draft={draft} set={setDraft} />
      case 'media':
        return <MediaEditor draft={draft} set={setDraft} resourceKeys={resourceKeys} />
      case 'llm_prompt':
        return <LlmPromptEditor draft={draft} set={setDraft} />
      case 'bpmn':
        return <BpmnEditor draft={draft} set={setDraft} />
      case 'mcp_inspector':
        return <McpInspectorEditor draft={draft} set={setDraft} />
      case 'ontology':
        return <OntologyEditor draft={draft} set={setDraft} />
      case 'data_query':
        return <DataQueryEditor draft={draft} set={setDraft} />
      case 'object_graph':
        return <ObjectGraphEditor draft={draft} set={setDraft} />
      case 'doc_convert':
        return <DocConvertEditor draft={draft} set={setDraft} />
      default:
        return null
    }
  })()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-28"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">
            {t.dialogTitle(BLOCK_TYPE_LABEL[draft.type] ?? draft.type)}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.cancel} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{body}</div>

        <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
            {t.cancel}
          </button>
          <button type="button" onClick={save} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark">
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
