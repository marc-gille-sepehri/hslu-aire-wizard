import { useEffect, useState } from 'react'
import { labels } from '../labels'
import {
  downloadPollCsv,
  fetchInstancePolls,
  type CourseInstance,
  type InstancePolls,
  type PollQuestionResult,
  type PollResult,
} from './adminApi'

const t = labels.adminInstances
const pt = labels.poll

const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0)

// Balken als <div>, nicht als SVG: src/index.css blendet `svg rect[width][height]`
// global aus, und für ein paar Balken lohnt sich keine Diagrammbibliothek.
function Bar({ share, tone = 'navy' }: { share: number; tone?: 'navy' | 'gold' | 'slate' }) {
  const color = tone === 'gold' ? 'bg-gold' : tone === 'slate' ? 'bg-slate-300' : 'bg-navy'
  return (
    <div className="h-3 w-full overflow-hidden rounded-sm bg-cream">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, share))}%` }} />
    </div>
  )
}

function YesNo({ q }: { q: Extract<PollQuestionResult, { kind: 'yesno' }> }) {
  return (
    <div className="space-y-1.5">
      {[
        { label: pt.yes, n: q.yes, tone: 'navy' as const },
        { label: pt.no, n: q.no, tone: 'slate' as const },
      ].map((r) => (
        <div key={r.label} className="grid grid-cols-[4rem_1fr_5.5rem] items-center gap-3 text-sm">
          <span className="text-slate-600">{r.label}</span>
          <Bar share={pct(r.n, q.n)} tone={r.tone} />
          <span className="text-right tabular-nums text-slate-600">
            {r.n} · {pct(r.n, q.n)} %
          </span>
        </div>
      ))}
    </div>
  )
}

function Scale({ q }: { q: Extract<PollQuestionResult, { kind: 'scale' }> }) {
  const max = Math.max(1, ...q.counts)
  return (
    <div>
      <div className="flex h-24 items-end gap-2">
        {q.counts.map((c, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${i}: ${c}`}>
            <span className="text-xs tabular-nums text-slate-500">{c}</span>
            <div className="w-full rounded-t-sm bg-navy" style={{ height: `${(c / max) * 64}px`, minHeight: c ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2 border-t border-solid border-mist pt-1">
        {q.counts.map((_, i) => (
          <span key={i} className="flex-1 text-center text-xs font-semibold text-slate-600">{i}</span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>0 = {q.minLabel || pt.scaleMin}</span>
        <span>5 = {q.maxLabel || pt.scaleMax}</span>
      </div>
    </div>
  )
}

function Texts({ q }: { q: Extract<PollQuestionResult, { kind: 'text' }> }) {
  return (
    <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
      {q.answers.map((a, i) => (
        <li key={i} className="rounded-md border border-solid border-mist bg-cream/50 px-3 py-2 text-sm text-slate-700">
          <p className="whitespace-pre-wrap">{a.text}</p>
          {a.name && <p className="mt-1 text-xs text-slate-400">— {a.name}</p>}
        </li>
      ))}
    </ul>
  )
}

function Question({ q, i }: { q: PollQuestionResult; i: number }) {
  return (
    <div className="rounded-lg border border-solid border-mist bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="font-medium text-navy">
          <span className="mr-2 text-slate-400">{i + 1}.</span>
          {q.prompt}
        </p>
        <span className="shrink-0 text-xs text-slate-500">
          {q.kind === 'scale' && q.mean !== null && (
            <span className="mr-2 rounded bg-gold/30 px-1.5 py-0.5 font-semibold text-navy">
              {t.resultsMean(q.mean.toLocaleString('de-CH', { maximumFractionDigits: 1, minimumFractionDigits: 1 }))}
            </span>
          )}
          {t.resultsAnswers(q.n)}
        </span>
      </div>
      {q.n === 0 ? (
        <p className="text-sm text-slate-400">{t.resultsNoAnswers}</p>
      ) : q.kind === 'yesno' ? (
        <YesNo q={q} />
      ) : q.kind === 'scale' ? (
        <Scale q={q} />
      ) : (
        <Texts q={q} />
      )}
    </div>
  )
}

function PollCard({ instanceId, poll }: { instanceId: string; poll: PollResult }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const csv = () => {
    setBusy(true)
    setError(null)
    downloadPollCsv(instanceId, poll.moduleId, poll.artifactId)
      .catch(() => setError(t.resultsCsvError))
      .finally(() => setBusy(false))
  }
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-kicker text-slate-500">{poll.moduleTitle}</p>
          <h3 className="font-display text-lg font-bold text-navy">
            {poll.title}
            {poll.anonymous && (
              <span className="ml-2 rounded bg-cream px-1.5 py-0.5 align-middle text-xs font-semibold text-slate-500">
                {t.resultsAnonymous}
              </span>
            )}
          </h3>
          <div className="mt-2 flex items-center gap-3">
            <div className="w-40">
              <Bar share={pct(poll.responses, poll.participants)} tone="gold" />
            </div>
            <span className="text-sm text-slate-600">{t.resultsResponses(poll.responses, poll.participants)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={csv}
          disabled={busy}
          className="rounded-md border-2 border-solid border-navy px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-40"
        >
          {t.resultsCsv}
        </button>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {poll.questions.map((q, i) => (
          <div key={q.id} className={q.kind === 'text' ? 'md:col-span-2' : ''}>
            <Question q={q} i={i} />
          </div>
        ))}
      </div>
    </section>
  )
}

/** Dashboard: alle Umfragen eines Kurses, ausgewertet über die Teilnehmenden einer Durchführung. */
export default function PollResultsDialog({ instance, onClose }: { instance: CourseInstance; onClose: () => void }) {
  const [data, setData] = useState<InstancePolls | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInstancePolls(instance.id)
      .then(setData)
      .catch((e) => setError((e as Error).message || t.loadError))
  }, [instance.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-20"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl rounded-2xl border border-solid border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-solid border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">{t.resultsTitle(instance.courseTitle ?? '—')}</h2>
          <button type="button" onClick={onClose} aria-label={t.resultsClose} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-8 px-6 py-5">
          {error && <div className="rounded-md border border-solid border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
          {!data && !error && <p className="text-sm text-slate-500">{t.resultsLoading}</p>}
          {data && data.polls.length === 0 && <p className="text-sm text-slate-500">{t.resultsNone}</p>}
          {data?.polls.map((p) => <PollCard key={`${p.moduleId}/${p.artifactId}`} instanceId={instance.id} poll={p} />)}
        </div>
      </div>
    </div>
  )
}
