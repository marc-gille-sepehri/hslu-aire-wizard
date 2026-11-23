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

  return (
    <div className="space-y-5 rounded-md border border-solid border-slate-200 bg-white p-5">
      {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
      {artifact.instructions && <p className="text-sm text-slate-600">{artifact.instructions}</p>}
      {artifact.anonymous && <p className="text-xs text-slate-500">{t.anonymousHint}</p>}

      <ol className="space-y-5">
        {questions.map((q, i) => (
          <li key={q.id} className="space-y-2">
            <p className="font-sans font-medium text-slate-800">
              <span className="mr-2 text-slate-400">{i + 1}.</span>
              {q.prompt}
            </p>
            <QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-3 border-t border-solid border-mist pt-4">
        <button
          type="button"
          onClick={submit}
          disabled={!dirty || answeredCount === 0}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-40"
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

function QuestionInput({ q, value, onChange }: { q: PollQuestion; value: Answer | undefined; onChange: (v: Answer) => void }) {
  if (q.kind === 'yesno') {
    return (
      <div className="flex gap-2" role="radiogroup">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`min-w-20 rounded-md border border-solid px-4 py-2 text-sm font-semibold transition-colors ${
              value === v ? 'border-navy bg-navy text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-navy'
            }`}
          >
            {v ? t.yes : t.no}
          </button>
        ))}
      </div>
    )
  }
  if (q.kind === 'scale') {
    return (
      <div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup">
          {SCALE.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              onClick={() => onChange(v)}
              className={`h-10 w-10 rounded-md border border-solid text-sm font-semibold transition-colors ${
                value === v ? 'border-navy bg-navy text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-navy'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="mt-1 flex max-w-[19.5rem] justify-between text-xs text-slate-500">
          <span>0 = {q.minLabel || t.scaleMin}</span>
          <span>5 = {q.maxLabel || t.scaleMax}</span>
        </div>
      </div>
    )
  }
  return (
    <textarea
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      maxLength={5000}
      placeholder={t.textPlaceholder}
      className="w-full rounded-md border border-solid border-slate-300 p-3 font-serif leading-relaxed text-slate-800 focus:border-slate-500 focus:outline-none"
    />
  )
}
