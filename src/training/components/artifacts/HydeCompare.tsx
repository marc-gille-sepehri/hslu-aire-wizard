import { useMemo, useRef, useState } from 'react'
import type { HydeCompareArtifact } from '../../schema/types'
import { labels } from '../../labels'
import { embedTexts } from '../../lib/embeddingsApi'
import { cosineSimilarity } from '../../lib/embeddingGeometry'
import { writePhantom } from '../../lib/hydeApi'

const t = labels.hyde

// HyDE — Hypothetical Document Embeddings — nebeneinander.
//
// Eine Frage sieht keiner Antwort ähnlich. HyDE lässt deshalb ein Modell zuerst
// eine Antwort erfinden und sucht mit deren Vektor. Der Block zeigt beide Suchen
// über derselben kleinen Sammlung: links mit der Frage, rechts mit dem
// Phantombild.
//
// Die eigentliche Pointe liefert erst das Editieren: das Phantombild darf
// inhaltlich falsch sein und findet trotzdem die richtige Stelle. Deshalb ist es
// editierbar, und ein geändertes Phantombild wird nur neu eingebettet — nicht
// neu geschrieben —, damit man genau die eigene Änderung sieht.

/** Erkennbar und auf Creme lesbar; dieselbe Farbe für dieselbe Stelle in beiden Listen. */
const COLORS = ['#0b2447', '#c2523c', '#4f8f42', '#f2a93b', '#7a3f9d', '#1b8a9e', '#b0672a', '#5b6b85']
const DEFAULT_TOP_K = 3

type Ranked = { index: number; similarity: number }[]

interface Run {
  question: string
  phantom: string
  byQuestion: Ranked
  byPhantom: Ranked
  llmModel: string
  embeddingModel: string
  dimensions: number
}

export default function HydeCompare({ artifact }: { artifact: HydeCompareArtifact }) {
  // Leere Einträge aus dem Editor zählen nicht.
  const corpus = useMemo(() => (artifact.corpus ?? []).map((c) => c.trim()).filter(Boolean), [artifact.corpus])
  const topK = Math.min(artifact.topK ?? DEFAULT_TOP_K, corpus.length)

  const [question, setQuestion] = useState(artifact.defaultQuestion ?? '')
  const [phantom, setPhantom] = useState('')
  const [original, setOriginal] = useState('')
  const [phase, setPhase] = useState<'idle' | 'writing' | 'embedding'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [run, setRun] = useState<Run | null>(null)
  const [corpusOpen, setCorpusOpen] = useState(false)

  // Die Sammlung ändert sich während der Übung nicht — ihre Vektoren werden
  // einmal berechnet. So kostet ein editiertes Phantombild genau einen Vektor.
  const corpusVectors = useRef<{ key: string; vectors: number[][] } | null>(null)

  const busy = phase !== 'idle'
  const phantomEdited = run !== null && phantom.trim() !== run.phantom
  const questionChanged = run !== null && question.trim() !== run.question

  const rank = (query: number[], vectors: number[][]): Ranked =>
    vectors
      .map((v, index) => ({ index, similarity: cosineSimilarity(query, v) }))
      .sort((a, b) => b.similarity - a.similarity)

  /**
   * Frage und Phantombild im selben Aufruf wie (beim ersten Mal) die Sammlung:
   * Vektoren aus zwei Modellen zu vergleichen ergäbe Zahlen ohne Bedeutung.
   */
  const embedAndRank = async (q: string, p: string, llmModel: string) => {
    setPhase('embedding')
    const key = corpus.join('\u0000')
    let corpusVecs = corpusVectors.current?.key === key ? corpusVectors.current.vectors : null
    let qv: number[]
    let pv: number[]
    let model: string
    let dimensions: number
    if (corpusVecs) {
      const res = await embedTexts([q, p])
      ;[qv, pv] = res.vectors
      model = res.model
      dimensions = res.dimensions
    } else {
      const res = await embedTexts([q, p, ...corpus])
      ;[qv, pv, ...corpusVecs] = res.vectors
      corpusVectors.current = { key, vectors: corpusVecs }
      model = res.model
      dimensions = res.dimensions
    }
    setRun({
      question: q,
      phantom: p,
      byQuestion: rank(qv, corpusVecs),
      byPhantom: rank(pv, corpusVecs),
      llmModel,
      embeddingModel: model,
      dimensions,
    })
  }

  const search = async () => {
    const q = question.trim()
    if (!q) {
      setError(t.needQuestion)
      return
    }
    setError(null)
    setPhase('writing')
    try {
      const res = await writePhantom(q, artifact.generatorPrompt)
      setPhantom(res.phantom)
      setOriginal(res.phantom)
      await embedAndRank(q, res.phantom, res.model)
    } catch (e) {
      setError((e as Error).message || t.error)
    } finally {
      setPhase('idle')
    }
  }

  /** Nur das geänderte Phantombild neu einbetten — kein neuer Modellaufruf. */
  const rerank = async () => {
    if (!run || !phantom.trim()) return
    setError(null)
    try {
      await embedAndRank(run.question, phantom.trim(), run.llmModel)
    } catch (e) {
      setError((e as Error).message || t.error)
    } finally {
      setPhase('idle')
    }
  }

  const colorOf = (i: number) => COLORS[i % COLORS.length]

  return (
    <div className="space-y-4">
      {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
      {artifact.instructions && (
        <p className="max-w-prose font-sans text-sm text-slate-600">{artifact.instructions}</p>
      )}

      {/* ── Die Sammlung ─────────────────────────────────────────────────── */}
      <div className="rounded-md border border-mist bg-white">
        <button
          type="button"
          onClick={() => setCorpusOpen((o) => !o)}
          className="flex w-full items-baseline justify-between px-4 py-2 text-left"
        >
          <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            {corpusOpen ? '▾' : '▸'} {t.corpusHeading(corpus.length)}
          </span>
          <span className="font-sans text-xs text-slate-400">{t.corpusHint}</span>
        </button>
        {corpusOpen && (
          <ol className="list-none divide-y divide-mist border-t border-mist">
            {corpus.map((text, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2">
                <Dot n={i + 1} color={colorOf(i)} />
                <span className="font-sans text-sm text-slate-700">{text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ── Frage ────────────────────────────────────────────────────────── */}
      <div className="rounded-md border border-mist bg-white px-4 py-3">
        <label className="block">
          <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            {t.questionLabel}
          </span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !busy && void search()}
            placeholder={t.questionPlaceholder}
            className="mt-1 w-full rounded-md border border-slate-300 p-2 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void search()}
            disabled={busy || !question.trim() || corpus.length < 2}
            className="rounded-md bg-gold px-4 py-2 font-sans text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:bg-mist disabled:text-slate-400"
          >
            {phase === 'writing' ? t.searching : phase === 'embedding' ? t.embedding : run ? t.searchAgain : t.search}
          </button>
          {questionChanged && !busy && <span className="font-sans text-xs text-amber-800">{t.stale}</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
          {error}
        </div>
      )}

      {/* ── Phantombild ──────────────────────────────────────────────────── */}
      {run && (
        <div className="rounded-md border-2 border-dashed border-amber-400 bg-amber-50/60 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-amber-900">
              {t.phantomHeading}
            </span>
            <span className="rounded bg-amber-500 px-2 py-0.5 font-sans text-[0.65rem] font-bold uppercase tracking-wide text-white">
              {t.phantomBadge}
            </span>
          </div>
          <textarea
            value={phantom}
            onChange={(e) => setPhantom(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-md border border-amber-300 bg-white p-3 font-serif italic leading-relaxed text-slate-800 focus:border-amber-500 focus:outline-none"
          />
          <p className="mt-1 max-w-prose font-sans text-xs text-amber-900">{t.phantomHint}</p>
          {phantomEdited && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void rerank()}
                disabled={busy || !phantom.trim()}
                className="rounded-md bg-navy px-3 py-1.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:bg-mist disabled:text-slate-400"
              >
                {phase === 'embedding' ? t.embedding : t.rerank}
              </button>
              <button
                type="button"
                onClick={() => setPhantom(original)}
                className="font-sans text-xs text-slate-500 underline underline-offset-2 hover:text-navy"
              >
                {t.restore}
              </button>
              <span className="font-sans text-xs text-amber-800">{t.phantomEdited}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Zwei Trefferlisten ───────────────────────────────────────────── */}
      {run && (
        <div className={`space-y-2 ${questionChanged || phantomEdited ? 'opacity-50' : ''}`}>
          <div className="grid gap-3 md:grid-cols-2">
            <HitList
              heading={t.columnQuestion}
              hint={t.columnQuestionHint}
              ranked={run.byQuestion}
              corpus={corpus}
              topK={topK}
              colorOf={colorOf}
            />
            <HitList
              heading={t.columnPhantom}
              hint={t.columnPhantomHint}
              ranked={run.byPhantom}
              compareTo={run.byQuestion}
              corpus={corpus}
              topK={topK}
              colorOf={colorOf}
              accent
            />
          </div>
          <p className="max-w-prose font-sans text-xs text-slate-500">{t.similarityHint}</p>
          <p className="font-sans text-xs text-slate-400">
            {t.modelLine(run.llmModel, run.embeddingModel, run.dimensions)}
          </p>
        </div>
      )}
    </div>
  )
}

function Dot({ n, color, muted }: { n: number; color: string; muted?: boolean }) {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-sans text-[0.65rem] font-bold text-white"
      style={{ backgroundColor: muted ? '#cfd8e6' : color }}
    >
      {n}
    </span>
  )
}

/**
 * Eine Rangliste. Die Nummer im Punkt ist die Stelle in der Sammlung, nicht der
 * Rang — so erkennt man dieselbe Stelle in beiden Spalten wieder, auch wenn sie
 * den Platz gewechselt hat. In der Phantom-Spalte steht dazu, um wie viel.
 */
function HitList({
  heading,
  hint,
  ranked,
  compareTo,
  corpus,
  topK,
  colorOf,
  accent,
}: {
  heading: string
  hint: string
  ranked: Ranked
  compareTo?: Ranked
  corpus: string[]
  topK: number
  colorOf: (i: number) => string
  accent?: boolean
}) {
  // Balken über den beobachteten Bereich, nicht 0–1: Ähnlichkeiten zu einer
  // Anfrage liegen eng beieinander, und auf voller Achse wären alle gleich lang.
  const hi = ranked[0]?.similarity ?? 1
  const lo = ranked[ranked.length - 1]?.similarity ?? 0
  const span = Math.max(hi - lo, 0.001)

  return (
    <div className={`overflow-hidden rounded-md border bg-white ${accent ? 'border-amber-300' : 'border-mist'}`}>
      <div className={`border-b px-4 py-2 ${accent ? 'border-amber-200 bg-amber-50' : 'border-mist bg-cream'}`}>
        <div className="font-sans text-xs font-semibold uppercase tracking-kicker text-navy">{heading}</div>
        <div className="font-sans text-xs text-slate-500">{hint}</div>
      </div>
      <ol className="list-none">
        {ranked.map((row, rank) => {
          const inContext = rank < topK
          const before = compareTo?.findIndex((r) => r.index === row.index)
          const delta = before === undefined || before < 0 ? null : before - rank
          return (
            <li key={row.index}>
              {rank === topK && (
                <div className="flex items-center gap-2 bg-cream px-4 py-1">
                  <span className="h-px flex-1 bg-mist" />
                  <span className="font-sans text-[0.6rem] font-semibold uppercase tracking-wide text-slate-500">
                    {t.cutoff}
                  </span>
                  <span className="h-px flex-1 bg-mist" />
                </div>
              )}
              <div className={`flex items-start gap-3 border-t border-mist px-4 py-2 first:border-t-0 ${inContext ? '' : 'opacity-60'}`}>
                <Dot n={row.index + 1} color={colorOf(row.index)} muted={!inContext} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-sans text-xs font-semibold text-slate-500">{rank + 1}.</span>
                    <span className="font-sans text-xs tabular-nums text-slate-600">
                      {t.similarity} {row.similarity.toFixed(3)}
                    </span>
                    {delta !== null && (
                      <span
                        className={`font-sans text-[0.65rem] font-semibold ${
                          delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-red-700' : 'text-slate-400'
                        }`}
                      >
                        {delta === 0 ? t.same : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta) === 1 ? t.movedOne(delta) : t.moved(delta)}`}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block h-1 w-full overflow-hidden rounded bg-mist">
                    <span
                      className="block h-full rounded"
                      style={{
                        width: `${Math.max(4, ((row.similarity - lo) / span) * 100)}%`,
                        backgroundColor: inContext ? colorOf(row.index) : '#cfd8e6',
                      }}
                    />
                  </span>
                  <span className="mt-1 line-clamp-3 block font-sans text-sm text-slate-700" title={corpus[row.index]}>
                    {corpus[row.index]}
                  </span>
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
