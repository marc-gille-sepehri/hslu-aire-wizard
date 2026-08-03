import { useMemo, useRef, useState } from 'react'
import { labels } from '../labels'
import { UNDECIDABLE, type AttributeDef, type ItemContent, type OwnRating } from './enforcementApi'

const t = labels.enforcement

// One item, one form. The constraints below are data quality, not taste:
//   • the norm text keeps its paragraphs and numbering (rendered verbatim) and
//     is capped at ~70ch, so it gets read rather than skimmed;
//   • nothing is pre-selected — a default value becomes the answer;
//   • "nicht entscheidbar" is a peer option wherever the schema allows it, not
//     a fallback hidden at the bottom of a dropdown. Forcing a choice would
//     destroy exactly the information about which attributes the norm leaves
//     open;
//   • "Weiter" stays disabled until every required attribute is answered, so
//     the form cannot be found before the text has been read.

/** How a single attribute is currently answered. */
type Mode = 'unset' | 'value' | 'undecidable'

export interface ItemSubmission {
  values: Record<string, unknown>
  lookedUpBeyondExcerpt: boolean
  comment?: string
  clientStartedAt: string
  clientSubmittedAt: string
}

export default function ItemForm({
  item,
  initial,
  heading,
  submitLabel,
  busy,
  error,
  readOnly = false,
  onSubmit,
}: {
  item: ItemContent
  /** Present only in correction mode: the rating being revised. */
  initial?: OwnRating
  /** Position line, e.g. "Item 14 von 92". */
  heading: string
  submitLabel: string
  busy: boolean
  error: string | null
  /**
   * Public read mode: the whole instrument is shown, but every control is
   * inert and there is no submit. Showing the disabled fields rather than
   * hiding them is the point — a reader should see what coders are asked.
   */
  readOnly?: boolean
  onSubmit: (submission: ItemSubmission) => void
}) {
  // Stamped when the item is rendered. The server measures dwell time itself
  // from its own delivery record, and that measurement is the authoritative
  // one — this is corroborating evidence, nothing more. No timer is shown:
  // whoever feels watched works differently.
  const startedAt = useRef(new Date().toISOString())

  // Typed answers, exactly as they go to the server (option codes keep their
  // JSON type — the server compares with strict equality).
  const [answers, setAnswers] = useState<Record<string, unknown>>(() => initialAnswers(item, initial))
  // Raw text for integer/text fields, so typing is never fought by parsing.
  const [drafts, setDrafts] = useState<Record<string, string>>(() => initialDrafts(item, initial))
  // Only meaningful where the schema allows "nicht entscheidbar".
  const [modes, setModes] = useState<Record<string, Mode>>(() => initialModes(item, initial))
  const [lookedUp, setLookedUp] = useState(initial?.lookedUpBeyondExcerpt ?? false)
  const [comment, setComment] = useState(initial?.comment ?? '')

  const problems = useMemo(() => {
    const out: Record<string, string | null> = {}
    for (const def of item.attributes) {
      out[def.id] = fieldProblem(def, modes[def.id] ?? 'unset', drafts[def.id] ?? '', answers[def.id])
    }
    return out
  }, [item, modes, drafts, answers])

  const complete = item.attributes.every((def) => problems[def.id] === null)

  const setValue = (def: AttributeDef, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [def.id]: value }))
    setModes((prev) => ({ ...prev, [def.id]: 'value' }))
  }

  const setDraft = (def: AttributeDef, raw: string) => {
    setDrafts((prev) => ({ ...prev, [def.id]: raw }))
    setModes((prev) => ({ ...prev, [def.id]: 'value' }))
  }

  const setMode = (def: AttributeDef, mode: Mode) => {
    setModes((prev) => ({ ...prev, [def.id]: mode }))
    if (mode === 'undecidable') {
      setAnswers((prev) => ({ ...prev, [def.id]: UNDECIDABLE }))
      setDrafts((prev) => ({ ...prev, [def.id]: '' }))
    } else if (answers[def.id] === UNDECIDABLE) {
      setAnswers((prev) => {
        const next = { ...prev }
        delete next[def.id]
        return next
      })
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly || !complete || busy) return
    const values: Record<string, unknown> = {}
    for (const def of item.attributes) {
      const mode = modes[def.id] ?? 'unset'
      if (mode === 'undecidable') values[def.id] = UNDECIDABLE
      else if (mode === 'unset') continue // optional and left empty — omitted
      else if (def.type === 'integer') values[def.id] = Number((drafts[def.id] ?? '').trim())
      else if (def.type === 'text') values[def.id] = drafts[def.id] ?? ''
      else values[def.id] = answers[def.id]
    }
    onSubmit({
      values,
      lookedUpBeyondExcerpt: lookedUp,
      comment: comment.trim() || undefined,
      clientStartedAt: startedAt.current,
      clientSubmittedAt: new Date().toISOString(),
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">{heading}</p>

      <header className="border-b border-mist pb-4">
        <h2 className="font-display text-lg font-bold text-navy">{item.instrumentShortName}</h2>
        {item.instrumentTitle && item.instrumentTitle !== item.instrumentShortName && (
          <p className="mt-0.5 max-w-prose font-sans text-xs text-slate-400">{item.instrumentTitle}</p>
        )}
        <p className="mt-1 max-w-prose font-sans text-sm text-slate-500">{item.provision}</p>
      </header>

      {/* Verbatim: paragraphs and numbering are part of the text. A norm pulled
          into one block is a different norm. */}
      {/* White, not cream: the page background is cream, and the norm text has
          to read as its own object. */}
      <div className="max-h-[60vh] overflow-y-auto rounded-md border border-mist bg-white px-5 py-4">
        <p className="max-w-prose whitespace-pre-wrap font-serif text-[1.0625rem] leading-relaxed text-slate-800">
          {item.excerpt}
        </p>
        {item.excerptTruncated && (
          <p className="mt-3 border-t border-mist pt-2 font-sans text-xs text-slate-500">{t.excerptTruncated}</p>
        )}
      </div>

      <div className="space-y-6">
        {item.attributes.map((def) => (
          <AttributeField
            key={def.id}
            def={def}
            mode={modes[def.id] ?? 'unset'}
            answer={answers[def.id]}
            draft={drafts[def.id] ?? ''}
            problem={readOnly ? null : problems[def.id] || null}
            readOnly={readOnly}
            onMode={(m) => setMode(def, m)}
            onValue={(v) => setValue(def, v)}
            onDraft={(raw) => setDraft(def, raw)}
          />
        ))}
      </div>

      <div className="border-t border-mist pt-5">
        <label className="flex items-start gap-2.5 font-sans text-sm text-slate-800">
          <input
            type="checkbox"
            checked={lookedUp}
            disabled={readOnly}
            onChange={(e) => setLookedUp(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-navy"
          />
          <span>{t.lookedUp}</span>
        </label>
        <p className="mt-1 max-w-prose pl-[1.625rem] font-sans text-xs text-slate-500">{t.lookedUpHint}</p>
      </div>

      <div>
        <label className="mb-1.5 block font-sans text-sm font-semibold text-slate-800" htmlFor="es-comment">
          {t.commentLabel}
        </label>
        <textarea
          id="es-comment"
          value={comment}
          disabled={readOnly}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={t.commentPlaceholder}
          className="w-full rounded-md border border-slate-300 p-2.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Not merely hidden: a read-only form has no submit control at all. */}
      {!readOnly && (
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!complete || busy}
          className={
            complete && !busy
              ? 'rounded-md bg-navy px-6 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-navy-light'
              : 'cursor-not-allowed rounded-md bg-mist px-6 py-2.5 font-sans text-sm font-semibold text-slate-400'
          }
        >
          {busy ? t.saving : submitLabel}
        </button>
      </div>
      )}
    </form>
  )
}

/** One attribute: its own control, plus "nicht entscheidbar" as an equal choice. */
function AttributeField({
  def,
  mode,
  answer,
  draft,
  problem,
  readOnly,
  onMode,
  onValue,
  onDraft,
}: {
  def: AttributeDef
  mode: Mode
  answer: unknown
  draft: string
  problem: string | null
  readOnly: boolean
  onMode: (m: Mode) => void
  onValue: (v: unknown) => void
  onDraft: (raw: string) => void
}) {
  const name = `attr-${def.id}`
  const control = 'mt-0.5 h-4 w-4 shrink-0 accent-navy'
  const row = `flex items-start gap-2.5 font-sans text-sm ${readOnly ? 'text-slate-500' : 'text-slate-800'}`
  const chosen = mode === 'value'
  const selected = Array.isArray(answer) ? (answer as unknown[]) : []

  return (
    // Preflight is off project-wide, so the UA's groove border and padding on
    // fieldset/legend have to be cleared here.
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-0.5 p-0 font-sans text-sm font-semibold text-slate-800">
        {def.label}
        {!def.required && <span className="ml-1.5 font-normal text-slate-400">{t.optional}</span>}
      </legend>
      {def.help && <p className="mb-2 max-w-prose font-sans text-xs text-slate-500">{def.help}</p>}

      <div className="mt-2 space-y-2">
        {def.type === 'enum' &&
          def.options.map((opt, i) => (
            <label key={i} className={row}>
              <input
                type="radio"
                name={name}
                className={control}
                disabled={readOnly}
                checked={chosen && Object.is(answer, opt.value)}
                onChange={() => onValue(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}

        {def.type === 'multi' &&
          def.options.map((opt, i) => (
            <label key={i} className={row}>
              <input
                type="checkbox"
                className={control}
                disabled={readOnly}
                checked={chosen && selected.some((v) => Object.is(v, opt.value))}
                onChange={(e) =>
                  onValue(
                    e.target.checked
                      ? [...selected.filter((v) => !Object.is(v, opt.value)), opt.value]
                      : selected.filter((v) => !Object.is(v, opt.value)),
                  )
                }
              />
              <span>{opt.label}</span>
            </label>
          ))}

        {def.type === 'boolean' &&
          [true, false].map((b) => (
            <label key={String(b)} className={row}>
              <input
                type="radio"
                name={name}
                className={control}
                disabled={readOnly}
                checked={chosen && answer === b}
                onChange={() => onValue(b)}
              />
              <span>{b ? t.yes : t.no}</span>
            </label>
          ))}

        {def.type === 'integer' && (
          <label className={row}>
            {def.allowUndecidable && (
              <input
                type="radio"
                name={name}
                className={control}
                disabled={readOnly}
                checked={chosen}
                onChange={() => onMode('value')}
              />
            )}
            <span className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={draft}
                disabled={readOnly}
                onChange={(e) => onDraft(e.target.value)}
                aria-label={def.label}
                className="w-24 rounded-md border border-slate-300 px-2 py-1 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
              />
              {(def.min !== undefined || def.max !== undefined) && (
                <span className="text-xs text-slate-400">{rangeHint(def)}</span>
              )}
            </span>
          </label>
        )}

        {def.type === 'text' && (
          <div className={def.allowUndecidable ? row : ''}>
            {def.allowUndecidable && (
              <input
                type="radio"
                name={name}
                className={control}
                disabled={readOnly}
                checked={chosen}
                onChange={() => onMode('value')}
              />
            )}
            <textarea
              value={draft}
              disabled={readOnly}
              onChange={(e) => onDraft(e.target.value)}
              rows={3}
              aria-label={def.label}
              className="w-full rounded-md border border-slate-300 p-2.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
            />
          </div>
        )}

        {/* Peer option, same styling. Set off by a rule only so it is not read
            as one more substantive value. */}
        {def.allowUndecidable && (
          <label className={`${row} border-t border-mist pt-2`}>
            <input
              type="radio"
              name={name}
              className={control}
              disabled={readOnly}
              checked={mode === 'undecidable'}
              onChange={() => onMode('undecidable')}
            />
            <span>{t.undecidable}</span>
          </label>
        )}
      </div>

      {problem && <p className="mt-1.5 font-sans text-xs text-red-700">{problem}</p>}
    </fieldset>
  )
}

function rangeHint(def: AttributeDef): string {
  if (def.min !== undefined && def.max !== undefined) return t.rangeHint(def.min, def.max)
  if (def.min !== undefined) return t.rangeMinHint(def.min)
  return t.rangeMaxHint(def.max as number)
}

/**
 * null = usable answer. A string is shown under the field. An unanswered
 * required field blocks "Weiter" but says nothing (NOT_ANSWERED): a coder who
 * has not reached the field yet should not be scolded.
 */
function fieldProblem(def: AttributeDef, mode: Mode, draft: string, answer: unknown): string | null {
  if (mode === 'undecidable') return null
  if (mode === 'unset') return def.required ? NOT_ANSWERED : null

  switch (def.type) {
    case 'enum':
    case 'boolean':
      return answer === undefined ? NOT_ANSWERED : null
    case 'multi': {
      const list = Array.isArray(answer) ? answer : []
      return def.required && list.length === 0 ? NOT_ANSWERED : null
    }
    case 'text':
      return def.required && !draft.trim() ? NOT_ANSWERED : null
    case 'integer': {
      const raw = draft.trim()
      if (!raw) return def.required ? NOT_ANSWERED : null
      if (!/^-?\d+$/.test(raw)) return t.numberInvalid
      const n = Number(raw)
      if (def.min !== undefined && n < def.min) return t.numberMin(def.min)
      if (def.max !== undefined && n > def.max) return t.numberMax(def.max)
      return null
    }
  }
}

/** Blocks "Weiter" but shows no message — see fieldProblem(). */
const NOT_ANSWERED = ''

function initialAnswers(item: ItemContent, initial?: OwnRating): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!initial) return out
  for (const def of item.attributes) {
    const v = initial.values[def.id]
    if (v === undefined) continue
    if (def.type === 'integer' || def.type === 'text') {
      if (v === UNDECIDABLE) out[def.id] = v
      continue // the raw value lives in drafts
    }
    out[def.id] = v
  }
  return out
}

function initialDrafts(item: ItemContent, initial?: OwnRating): Record<string, string> {
  const out: Record<string, string> = {}
  if (!initial) return out
  for (const def of item.attributes) {
    if (def.type !== 'integer' && def.type !== 'text') continue
    const v = initial.values[def.id]
    if (v === undefined || v === UNDECIDABLE) continue
    out[def.id] = String(v)
  }
  return out
}

/** Nothing is pre-selected for a fresh item — a default becomes the answer. */
function initialModes(item: ItemContent, initial?: OwnRating): Record<string, Mode> {
  const out: Record<string, Mode> = {}
  if (!initial) return out
  for (const def of item.attributes) {
    const v = initial.values[def.id]
    if (v === undefined) continue
    out[def.id] = v === UNDECIDABLE ? 'undecidable' : 'value'
  }
  return out
}
