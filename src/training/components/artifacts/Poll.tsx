import { useEffect, useMemo, useState } from 'react'
import type { PollArtifact, PollQuestion } from '../../schema/types'
import { useLearner } from '../../state/LearnerStateContext'
import { useProgressOptional, useRecordInteraction, useSavedInteraction } from '../../state/ProgressContext'
import { labels } from '../../labels'

const t = labels.poll

type Answer = boolean | number | string
type Answers = Record<string, Answer>

const SCALE = [0, 1, 2, 3, 4, 5]

/** Gespeicherte Antworten aus dem Server-Fortschritt, falls es welche gibt. */
function savedAnswers(raw: unknown): Answers | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as { type?: string; answers?: unknown }
  if (r.type !== 'poll' || !r.answers || typeof r.answers !== 'object') return null
  return r.answers as Answers
}

/** Antworten ohne leere Freitexte — die zählen nicht als beantwortet. */
function cleaned(answers: Answers): Answers {
  return Object.fromEntries(
    Object.entries(answers).filter(([, v]) => (typeof v === 'string' ? v.trim() !== '' : true)),
  )
}

const same = (a: Answers, b: Answers) => JSON.stringify(cleaned(a)) === JSON.stringify(cleaned(b))

export default function Poll({ artifact }: { artifact: PollArtifact }) {
  const { markComplete } = useLearner()
  const record = useRecordInteraction()
  const progress = useProgressOptional()
  const { interaction, loaded } = useSavedInteraction(artifact.id)
  const questions = artifact.questions ?? []

  const [answers, setAnswers] = useState<Answers>({})
  // Was zuletzt abgegeben wurde; null = noch nie.
  const [submitted, setSubmitted] = useState<Answers | null>(null)

  // Erst nach dem Laden wiederherstellen — sonst überschreibt ein leerer
  // Anfangszustand, was die Person schon abgegeben hat.
  useEffect(() => {
    if (!loaded) return
    const saved = savedAnswers(interaction)
    if (saved) {
      setAnswers(saved)
      setSubmitted(saved)
    }
  }, [loaded, interaction])

  const set = (id: string, v: Answer) => setAnswers((a) => ({ ...a, [id]: v }))

  const answeredCount = useMemo(
    () => questions.filter((q) => cleaned(answers)[q.id] !== undefined).length,
    [answers, questions],
  )
  const dirty = submitted === null ? answeredCount > 0 : !same(answers, submitted)
  // Ohne Fortschrittskontext (Editor-Vorschau) wird nichts gespeichert.
  const preview = !progress

  const submit = () => {
    const out = cleaned(answers)
    if (Object.keys(out).length === 0) return
    record(artifact.id, { type: 'poll', answers: out })
    setSubmitted(out)
    if (artifact.tracked !== false) markComplete(artifact.id)
  }

  // Preflight ist aus: Überschriften, Absätze und Buttons bringen Browser-
  // Abstände und -Rahmen mit. Darum hier alles ausdrücklich, auch m-0.
  return (
    <div className="rounded-lg border border-solid border-mist bg-white px-6 py-5 font-sans">
      {(artifact.title || artifact.instructions || artifact.anonymous) && (
        <header className="mb-2 space-y-1.5">
          {artifact.title && <h3 className="m-0 font-display text-lg font-bold text-navy">{artifact.title}</h3>}
          {artifact.instructions && <p className="m-0 text-sm leading-relaxed text-slate-600">{artifact.instructions}</p>}
          {artifact.anonymous && (
            <p className="m-0 inline-flex items-center gap-1.5 text-xs text-slate-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />
              </svg>
              {t.anonymousHint}
            </p>
          )}
        </header>
      )}

      <div>
        {questions.map((q, i) => (
          <div key={q.id} className={`py-5 ${i > 0 ? 'border-0 border-t border-solid border-mist' : ''}`}>
            <div className="mb-3 flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  cleaned(answers)[q.id] !== undefined ? 'bg-navy text-white' : 'bg-mist text-navy'
                }`}
              >
                {i + 1}
              </span>
              <p className="m-0 font-medium leading-snug text-slate-800">{q.prompt}</p>
            </div>
            <div className="pl-9">
              <QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-0 border-t border-solid border-mist pt-4">
        <button
          type="button"
          onClick={submit}
          disabled={!dirty || answeredCount === 0}
          className="cursor-pointer rounded-md border-0 bg-gold px-5 py-2 font-sans text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitted ? t.resubmit : t.submit}
        </button>
        <span className="text-xs text-slate-500">{t.answered(answeredCount, questions.length)}</span>
        <span className="text-xs text-slate-500">
          {preview ? t.previewHint : submitted && !dirty ? t.submitted : submitted && dirty ? t.unsaved : null}
        </span>
      </div>
    </div>
  )
}

/** Ja/Nein als Segment-Toggle: beide Seiten sichtbar, keine vorausgewählt. */
function YesNoToggle({ value, onChange }: { value: Answer | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex rounded-full bg-cream-deep p-1" role="radiogroup">
      {[true, false].map((v) => {
        const on = value === v
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={`min-w-[5.5rem] cursor-pointer rounded-full border-0 px-5 py-1.5 font-sans text-sm font-semibold transition-all ${
              on ? 'bg-navy text-white shadow-sm' : 'bg-transparent text-slate-600 hover:text-navy'
            }`}
          >
            {v ? t.yes : t.no}
          </button>
        )
      })}
    </div>
  )
}

// Pfeilsegmente wie eine Breadcrumb. Das erste hat links keine Kerbe, das letzte
// rechts keine Spitze; die Überlappung (-ml) schliesst die Kerbe des nächsten.
const NOTCH = 10
function chevron(i: number, last: number): string {
  const tip = `calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%`
  const notch = `${NOTCH}px 50%`
  if (i === 0) return `polygon(0 0, ${tip}, 0 100%)`
  if (i === last) return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${notch})`
  return `polygon(0 0, ${tip}, 0 100%, ${notch})`
}

/** Skala 0–5 als Breadcrumb, bis zum gewählten Wert gefüllt. */
function ScaleCrumbs({ q, value, onChange }: { q: Extract<PollQuestion, { kind: 'scale' }>; value: Answer | undefined; onChange: (v: number) => void }) {
  const v = typeof value === 'number' ? value : null
  const last = SCALE.length - 1
  return (
    <div className="w-full max-w-md">
      <div className="flex" role="radiogroup">
        {SCALE.map((n, i) => {
          const filled = v !== null && n <= v
          const selected = v === n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={String(n)}
              onClick={() => onChange(n)}
              style={{ clipPath: chevron(i, last), marginLeft: i === 0 ? 0 : -(NOTCH - 3) }}
              className={`h-10 flex-1 cursor-pointer border-0 font-sans text-sm font-semibold transition-colors ${
                selected
                  ? 'bg-gold text-navy'
                  : filled
                  ? 'bg-navy text-white'
                  : 'bg-mist text-slate-600 hover:bg-mist-strong'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between gap-4 text-xs text-slate-500">
        <span>{q.minLabel || t.scaleMin}</span>
        <span className="text-right">{q.maxLabel || t.scaleMax}</span>
      </div>
    </div>
  )
}

function QuestionInput({ q, value, onChange }: { q: PollQuestion; value: Answer | undefined; onChange: (v: Answer) => void }) {
  if (q.kind === 'yesno') return <YesNoToggle value={value} onChange={onChange} />
  if (q.kind === 'scale') return <ScaleCrumbs q={q} value={value} onChange={onChange} />
  return (
    <textarea
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      maxLength={5000}
      placeholder={t.textPlaceholder}
      className="box-border block w-full max-w-2xl rounded-md border border-solid border-mist-strong bg-white p-3 font-sans text-sm leading-relaxed text-slate-800 focus:border-navy focus:outline-none"
    />
  )
}
