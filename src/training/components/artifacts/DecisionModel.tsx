import { useEffect, useMemo, useRef, useState } from 'react'
import type { DecisionModelArtifact, DecisionQuestion } from '../../schema/types'
import { labels } from '../../labels'
import {
  evaluateDecision,
  fetchEngine,
  type DecisionAnswer,
  type DecisionResult,
  type EngineInfo,
} from '../../lib/decisionApi'
import DecisionQuestions, { cleanQuestion, kindLabel } from './DecisionQuestions'

const t = labels.decision

// Eine Situation, typisierte Fragen, je Frage eine Verteilung — im Stil von Jev
// (TypeSafe System One).
//
// Die Lektion steckt im Regler, nicht im Modell: was mit einer unsicheren
// Antwort geschieht, entscheidet die Schwelle, und die setzt der Mensch. Darum
// zeigt jeder Balken die Schwelle als Linie, und jede Frage sagt in Worten, ob
// der Ablauf handeln oder vorlegen würde.
//
// Was der Block nie darf: eine Nachstellung für Jev ausgeben. Ohne
// TypeSafe-Schlüssel antwortet ein gewöhnliches Sprachmodell, und das steht
// schon vor dem ersten Klick oben im Block — nicht klein unter dem Ergebnis.

type Q = DecisionQuestion & { id: string }

const DEFAULT_THRESHOLD = 90

export default function DecisionModel({ artifact }: { artifact: DecisionModelArtifact }) {
  const counter = useRef(0)
  const newId = () => `q${Date.now().toString(36)}-${counter.current++}`

  const [engine, setEngine] = useState<EngineInfo | null>(null)
  const [situation, setSituation] = useState(artifact.defaultSituation ?? '')
  const [questions, setQuestions] = useState<Q[]>(() =>
    (artifact.questions ?? []).map((q, i) => ({ ...q, id: q.id || `q${i + 1}` }) as Q),
  )
  const [threshold, setThreshold] = useState(() => artifact.threshold ?? DEFAULT_THRESHOLD)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DecisionResult | null>(null)
  // Woraus das Ergebnis berechnet wurde — damit eine geänderte Frage nicht
  // still unter alten Balken steht.
  const [basis, setBasis] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchEngine()
      .then((e) => !cancelled && setEngine(e))
      .catch(() => {
        // Ohne Info lieber als nachgestellt kennzeichnen als gar nicht.
        if (!cancelled) setEngine({ engine: 'simulated', model: 'LLM' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cleaned = useMemo(() => questions.map(cleanQuestion), [questions])
  const fingerprint = JSON.stringify([situation.trim(), cleaned])
  const stale = result !== null && fingerprint !== basis

  const evaluate = async () => {
    if (!situation.trim()) {
      setError(t.needSituation)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await evaluateDecision(situation.trim(), cleaned)
      setResult(res)
      setBasis(fingerprint)
      // Der Server weiss es am besten: hat er anders geantwortet, als die
      // Vorabinfo sagte, gilt die Antwort.
      setEngine({ engine: res.engine, model: res.model })
    } catch (e) {
      setError((e as Error).message || t.error)
    } finally {
      setBusy(false)
    }
  }

  const answerOf = (id: string) => result?.answers.find((a) => a.id === id)
  const acting = result ? result.answers.filter((a) => topP(a) * 100 >= threshold).length : 0

  return (
    <div className="space-y-4">
      {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
      {artifact.instructions && (
        <p className="max-w-prose font-sans text-sm text-slate-600">{artifact.instructions}</p>
      )}

      {engine && <EngineBanner engine={engine} />}

      <label className="block">
        <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
          {t.situationLabel}
        </span>
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          rows={4}
          placeholder={t.situationPlaceholder}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white p-3 font-serif leading-relaxed text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </label>

      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            {t.questionsHeading}
          </span>
          <span className="font-sans text-xs text-slate-400">{t.questionsHint}</span>
        </div>
        <DecisionQuestions questions={questions} onChange={setQuestions} newId={newId} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void evaluate()}
          disabled={busy || !situation.trim() || questions.length === 0}
          className="rounded-md bg-gold px-4 py-2 font-sans text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:bg-mist disabled:text-slate-400"
        >
          {busy ? t.evaluating : result ? t.reevaluate : t.evaluate}
        </button>
        {stale && !busy && <span className="font-sans text-xs text-amber-800">{t.stale}</span>}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <div className={`space-y-3 ${stale ? 'opacity-40' : ''}`}>
          {/* Der Regler steht bei den Ergebnissen, nicht bei der Eingabe: er
              verändert nichts am Modell, nur was man aus seiner Antwort macht. */}
          <div className="rounded-md border border-mist bg-white px-4 py-3">
            <label className="block">
              <span className="flex items-baseline justify-between font-sans text-xs text-slate-600">
                <span className="font-semibold uppercase tracking-kicker text-slate-500">{t.threshold}</span>
                <span className="font-sans text-lg font-bold tabular-nums text-navy">{threshold} %</span>
              </span>
              <input
                type="range"
                min={50}
                max={99}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-1 w-full accent-navy"
              />
            </label>
            <p className="mt-1 max-w-prose font-sans text-xs text-slate-500">{t.thresholdHint}</p>
            <p className="mt-2 font-sans text-sm font-semibold text-navy">
              {t.summary(acting, result.answers.length)}
            </p>
          </div>

          {questions.map((q, i) => {
            const a = answerOf(q.id)
            if (!a) return null
            return <AnswerCard key={q.id} index={i + 1} question={q} answer={a} threshold={threshold} />
          })}

          <p className="font-sans text-xs text-slate-400">
            {result.engine === 'jev' ? t.engineJev(result.model) : `${t.engineSimulated} · ${result.model}`}
            {result.usage ? ` · ${t.tokens(result.usage.inputTokens, result.usage.outputTokens)}` : ''}
          </p>
        </div>
      )}
    </div>
  )
}

/** Die Zahl, gegen die die Schwelle gilt: die Wahrscheinlichkeit der wahrscheinlichsten Antwort. */
function topP(a: DecisionAnswer): number {
  return Math.max(...a.probabilities.map((p) => p.p))
}

function EngineBanner({ engine }: { engine: EngineInfo }) {
  if (engine.engine === 'jev') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5">
        <span className="mt-0.5 rounded bg-emerald-700 px-2 py-0.5 font-sans text-xs font-bold text-white">
          {t.engineJev(engine.model)}
        </span>
        <span className="font-sans text-xs text-emerald-900">{t.engineJevHint}</span>
      </div>
    )
  }
  return (
    <div className="rounded-md border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-3">
      <span className="inline-block rounded bg-amber-500 px-2 py-0.5 font-sans text-xs font-bold uppercase tracking-wide text-white">
        {t.engineSimulated}
      </span>
      <p className="mt-1.5 max-w-prose font-sans text-xs text-amber-900">{t.engineSimulatedHint(engine.model)}</p>
    </div>
  )
}

function AnswerCard({
  index,
  question,
  answer,
  threshold,
}: {
  index: number
  question: Q
  answer: DecisionAnswer
  threshold: number
}) {
  const best = topP(answer)
  const act = best * 100 >= threshold
  const shown = question.kind === 'noul' ? (answer.top === 'wahr' ? t.noulHolds : t.noulFails) : answer.top

  return (
    <div className={`rounded-md border bg-white px-4 py-3 ${act ? 'border-emerald-300' : 'border-amber-300'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="mr-2 font-sans text-xs font-bold text-slate-400">{index}</span>
          <span className="mr-2 rounded bg-cream px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
            {kindLabel(question.kind)}
          </span>
          <span className="font-sans text-sm text-slate-800">{question.prompt}</span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 font-sans text-xs font-bold uppercase tracking-wide ${
            act ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {act ? t.act : t.escalate}
        </span>
      </div>

      <ul className="mt-3 list-none space-y-1.5">
        {answer.probabilities.map((p) => {
          const isTop = p.p === best
          return (
            <li key={p.label} className="grid grid-cols-[minmax(6rem,12rem)_1fr_3.5rem] items-center gap-2">
              <span
                className={`truncate font-sans text-xs ${isTop ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
                title={p.label}
              >
                {question.kind === 'noul' ? noulLabel(p.label) : p.label}
              </span>
              <span className="relative block h-3 overflow-hidden rounded bg-mist">
                <span
                  className={`block h-full rounded ${
                    isTop ? (act ? 'bg-emerald-600' : 'bg-amber-500') : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.max(1, p.p * 100)}%` }}
                />
                {/* Die Schwelle auf jedem Balken: man sieht, ob er sie erreicht. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-0.5 bg-navy"
                  style={{ left: `${threshold}%` }}
                />
              </span>
              <span className="text-right font-sans text-xs tabular-nums text-slate-600">
                {(p.p * 100).toFixed(0)} %
              </span>
            </li>
          )
        })}
      </ul>

      <p className={`mt-2 font-sans text-sm ${act ? 'text-emerald-800' : 'text-amber-800'}`}>
        {act ? t.actLine(shown) : t.escalateLine}
      </p>
      {answer.confidence !== null && (
        <p className="mt-0.5 font-sans text-xs text-slate-400" title={t.confidenceHint}>
          {t.confidence(Math.round(answer.confidence * 100))}
        </p>
      )}
    </div>
  )
}

function noulLabel(serverLabel: string): string {
  return serverLabel === 'wahr' ? t.noulTrue : serverLabel === 'falsch' ? t.noulFalse : serverLabel
}
