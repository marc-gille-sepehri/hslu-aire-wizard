import type { DecisionQuestion } from '../../schema/types'
import { labels } from '../../labels'

const t = labels.decision

// Die Fragenliste des Entscheidungsmodells — im Block für Teilnehmende und im
// Editor für Autoren dieselbe Komponente. Zwei Fassungen würden auseinander-
// laufen, und dann könnte man im Editor Fragen bauen, die der Block nicht kennt.

export type Kind = DecisionQuestion['kind']

export const KINDS: Kind[] = ['choice', 'score', 'noul']

export const kindLabel = (k: Kind): string =>
  k === 'choice' ? t.kindChoice : k === 'score' ? t.kindScore : t.kindNoul

const kindHint = (k: Kind): string =>
  k === 'choice' ? t.kindChoiceHint : k === 'score' ? t.kindScoreHint : t.kindNoulHint

/** Eine leere Frage des Typs, mit Platzhaltern, die man sofort überschreibt. */
export function blankQuestion(kind: Kind, id: string): DecisionQuestion & { id: string } {
  if (kind === 'choice') return { id, kind, prompt: '', options: ['', ''] }
  if (kind === 'score') return { id, kind, prompt: '', levels: ['tief', 'mittel', 'hoch'] }
  return { id, kind, prompt: '' }
}

/**
 * Typwechsel behält die Frage und so viel wie möglich vom Rest: Optionen werden
 * zu Stufen und umgekehrt. Wer aus Versehen umschaltet, verliert nichts.
 */
function convert(q: DecisionQuestion & { id: string }, kind: Kind): DecisionQuestion & { id: string } {
  if (q.kind === kind) return q
  const list = q.kind === 'choice' ? q.options : q.kind === 'score' ? q.levels : []
  if (kind === 'choice') return { id: q.id, kind, prompt: q.prompt, options: list.length >= 2 ? list : ['', ''] }
  if (kind === 'score') return { id: q.id, kind, prompt: q.prompt, levels: list.length >= 2 ? list : ['tief', 'mittel', 'hoch'] }
  return { id: q.id, kind, prompt: q.prompt }
}

const inputCls =
  'w-full rounded-md border border-mist bg-white px-3 py-2 font-sans text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30'

export default function DecisionQuestions({
  questions,
  onChange,
  newId,
  max = 8,
}: {
  questions: (DecisionQuestion & { id: string })[]
  onChange: (next: (DecisionQuestion & { id: string })[]) => void
  newId: () => string
  max?: number
}) {
  const update = (id: string, next: DecisionQuestion & { id: string }) =>
    onChange(questions.map((q) => (q.id === id ? next : q)))

  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const list = q.kind === 'choice' ? q.options : q.kind === 'score' ? q.levels : null
        return (
          <div key={q.id} className="rounded-md border border-mist bg-white p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-sans text-xs font-bold text-slate-400">{i + 1}</span>
              <div className="inline-flex overflow-hidden rounded-md border border-mist">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => update(q.id, convert(q, k))}
                    title={kindHint(k)}
                    className={`px-2.5 py-1 font-sans text-xs font-semibold transition-colors ${
                      q.kind === k ? 'bg-navy text-white' : 'bg-white text-slate-600 hover:bg-cream'
                    }`}
                  >
                    {kindLabel(k)}
                  </button>
                ))}
              </div>
              <span className="flex-1 font-sans text-xs text-slate-400">{kindHint(q.kind)}</span>
              <button
                type="button"
                onClick={() => onChange(questions.filter((x) => x.id !== q.id))}
                disabled={questions.length <= 1}
                aria-label={t.removeQuestion}
                title={t.removeQuestion}
                className="rounded p-1 text-slate-300 transition-colors hover:text-red-700 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
            <label className="block">
              <span className="mb-1 block font-sans text-xs text-slate-500">
                {q.kind === 'noul' ? t.promptNoul : q.kind === 'score' ? t.promptScore : t.promptChoice}
              </span>
              <input
                className={inputCls}
                value={q.prompt}
                onChange={(e) => update(q.id, { ...q, prompt: e.target.value })}
              />
            </label>
            {list && (
              <label className="mt-2 block">
                <span className="mb-1 block font-sans text-xs text-slate-500">
                  {q.kind === 'choice' ? t.optionsLabel : t.levelsLabel}
                </span>
                <textarea
                  className={inputCls}
                  rows={Math.max(2, list.length)}
                  value={list.join('\n')}
                  // Leere Zeilen bleiben beim Tippen stehen; herausgefiltert
                  // wird erst beim Auswerten, sonst liesse sich keine neue
                  // Zeile anfangen.
                  onChange={(e) => {
                    const lines = e.target.value.split('\n')
                    update(
                      q.id,
                      q.kind === 'choice' ? { ...q, options: lines } : { ...q, levels: lines } as typeof q,
                    )
                  }}
                />
              </label>
            )}
          </div>
        )
      })}
      {questions.length < max && (
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onChange([...questions, blankQuestion(k, newId())])}
              className="rounded-md border border-mist px-3 py-1.5 font-sans text-xs font-semibold text-navy hover:bg-cream"
            >
              {t.addQuestion(kindLabel(k))}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Für Server und Validierung: leere Zeilen weg, Leerraum getrimmt. */
export function cleanQuestion<Q extends DecisionQuestion>(q: Q): Q {
  const tidy = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean)
  if (q.kind === 'choice') return { ...q, prompt: q.prompt.trim(), options: tidy(q.options) }
  if (q.kind === 'score') return { ...q, prompt: q.prompt.trim(), levels: tidy(q.levels) }
  return { ...q, prompt: q.prompt.trim() }
}
