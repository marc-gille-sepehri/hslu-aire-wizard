import { useMemo, useState, type FormEvent } from 'react'
import type { EmbeddingCompareArtifact } from '../../schema/types'
import { labels } from '../../labels'
import { embedTexts } from '../../lib/embeddingsApi'
import { distanceMatrix, edgeDistortion, layoutInPlane } from '../../lib/embeddingGeometry'

const t = labels.embeddingCompare

// Paste texts, embed them, see them as points with the distances written on the
// lines between them.
//
// The one thing this block must not do is imply the plane tells the truth. Three
// points always fit exactly; from four on the drawing is a projection, and it
// says so — with the measured distortion, not a disclaimer. The numbers on the
// edges are always the real distances, never the drawn lengths.

/** Distinguishable at a glance, and legible against the cream background. */
const COLORS = ['#0b2447', '#c2523c', '#4f8f42', '#f2a93b', '#7a3f9d', '#1b8a9e', '#b0672a', '#5b6b85']

interface Item {
  id: string
  text: string
  selected: boolean
}

type Computed = {
  ids: string[]
  distances: number[][]
  points: { x: number; y: number }[]
  /** Unscaled layout — distortion must be measured on this, not on `points`. */
  raw: { x: number; y: number }[]
  stress: number
  exact: boolean
  model: string
  dimensions: number
}

export default function EmbeddingCompare({ artifact }: { artifact: EmbeddingCompareArtifact }) {
  const [items, setItems] = useState<Item[]>(() =>
    (artifact.samples ?? []).map((text, i) => ({ id: `s${i}`, text, selected: true })),
  )
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [computed, setComputed] = useState<Computed | null>(null)

  const selected = items.filter((i) => i.selected)
  const colorOf = (id: string) => COLORS[items.findIndex((i) => i.id === id) % COLORS.length]

  // The plot belongs to the selection it was computed from; changing the
  // selection must not silently repaint old numbers under a new set of points.
  const stale = useMemo(() => {
    if (!computed) return false
    const now = selected.map((i) => i.id).join('|')
    return now !== computed.ids.join('|')
  }, [computed, selected])

  const add = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setItems((prev) => [...prev, { id: `i${Date.now()}${prev.length}`, text, selected: true }])
    setDraft('')
  }

  const compute = async () => {
    if (selected.length < 2) {
      setError(t.needTwo)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await embedTexts(selected.map((i) => i.text))
      const d = distanceMatrix(res.vectors)
      const layout = layoutInPlane(d)
      setComputed({
        ids: selected.map((i) => i.id),
        distances: d,
        points: layout.points,
        raw: layout.raw,
        stress: layout.stress,
        exact: layout.exact,
        model: res.model,
        dimensions: res.dimensions,
      })
    } catch (e) {
      setError((e as Error).message || t.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
      {artifact.instructions && (
        <p className="max-w-prose font-sans text-sm text-slate-600">{artifact.instructions}</p>
      )}

      {/* ── The list ─────────────────────────────────────────────────────── */}
      <div className="rounded-md border border-mist bg-white">
        <div className="flex items-baseline justify-between border-b border-mist px-4 py-2">
          <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            {t.listHeading}
          </span>
          <span className="font-sans text-xs text-slate-400">{t.selectHint}</span>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-6 text-center font-sans text-sm text-slate-400">{t.empty}</p>
        ) : (
          <ul className="divide-y divide-mist">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() =>
                    setItems((prev) =>
                      prev.map((p) => (p.id === item.id ? { ...p, selected: !p.selected } : p)),
                    )
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-navy"
                />
                {/* The dot is the whole point of the list: it is the same mark
                    that appears in the plane below. */}
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: item.selected ? colorOf(item.id) : '#cfd8e6' }}
                />
                <span
                  className={`min-w-0 flex-1 whitespace-pre-wrap font-sans text-sm ${
                    item.selected ? 'text-slate-800' : 'text-slate-400'
                  }`}
                >
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((p) => p.id !== item.id))}
                  aria-label={t.remove}
                  title={t.remove}
                  className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:text-red-700"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="flex gap-2 border-t border-mist px-4 py-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter adds, Shift+Enter keeps a line break — pasted excerpts are
              // often multi-line and should not be split by accident.
              if (e.key === 'Enter' && !e.shiftKey) add(e as unknown as FormEvent)
            }}
            rows={2}
            placeholder={t.addPlaceholder}
            className="min-w-0 flex-1 rounded-md border border-slate-300 p-2 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="shrink-0 self-start rounded-md border-2 border-navy px-3 py-1.5 font-sans text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:border-mist disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            {t.add}
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void compute()}
          disabled={busy || selected.length < 2}
          className="rounded-md bg-gold px-4 py-2 font-sans text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:bg-mist disabled:text-slate-400"
        >
          {busy ? t.computing : computed ? t.recompute : t.compute}
        </button>
        {stale && !busy && <span className="font-sans text-xs text-amber-800">{t.dirty}</span>}
        {computed && !stale && (
          <span className="font-sans text-xs text-slate-400">
            {t.modelLine(computed.model, computed.dimensions)}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
          {error}
        </div>
      )}

      {computed && (
        <Plot
          computed={computed}
          labelOf={(id) => items.find((i) => i.id === id)?.text ?? ''}
          colorOf={colorOf}
          dimmed={stale}
        />
      )}
    </div>
  )
}

function Plot({
  computed,
  labelOf,
  colorOf,
  dimmed,
}: {
  computed: Computed
  labelOf: (id: string) => string
  colorOf: (id: string) => string
  dimmed: boolean
}) {
  const { ids, distances, points, raw, stress, exact } = computed
  const SIZE = 460
  const PAD = 46 // room for the dot, its number and the edge labels
  const at = (i: number) => ({
    x: PAD + points[i].x * (SIZE - 2 * PAD),
    y: PAD + points[i].y * (SIZE - 2 * PAD),
  })

  const pct = `${(stress * 100).toFixed(1)} %`

  return (
    <div className={`space-y-2 ${dimmed ? 'opacity-40' : ''}`}>
      <div className="overflow-x-auto rounded-md border border-mist bg-white">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block h-auto w-full max-w-[460px]">
          {ids.map((_, i) =>
            ids.slice(i + 1).map((__, k) => {
              const j = i + 1 + k
              const a = at(i)
              const b = at(j)
              const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
              const off = Math.abs(edgeDistortion(distances, raw, i, j))
              return (
                <g key={`${i}-${j}`}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#cfd8e6"
                    strokeWidth={1.5}
                    // A visibly distorted edge is drawn dashed: the plane is
                    // lying most on exactly this pair.
                    strokeDasharray={off > 0.12 ? '4 3' : undefined}
                  />
                  <text
                    x={mid.x}
                    y={mid.y - 3}
                    textAnchor="middle"
                    className="font-sans"
                    fontSize="11"
                    fill="#5b6b85"
                  >
                    {distances[i][j].toFixed(2)}
                  </text>
                </g>
              )
            }),
          )}
          {ids.map((id, i) => {
            const p = at(i)
            return (
              <g key={id}>
                <circle cx={p.x} cy={p.y} r={9} fill={colorOf(id)} />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  className="font-sans"
                  fontSize="11"
                  fontWeight="700"
                  fill="#ffffff"
                >
                  {i + 1}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <p className="font-sans text-xs text-slate-500">{t.distanceHint}</p>
      <p className={`font-sans text-xs ${exact ? 'text-emerald-800' : 'text-amber-800'}`}>
        {exact ? t.exact : t.projected(pct)}
      </p>
      {!exact && <p className="max-w-prose font-sans text-xs text-slate-500">{t.projectedNote}</p>}

      <ol className="mt-1 space-y-1">
        {ids.map((id, i) => (
          <li key={id} className="flex items-start gap-2 font-sans text-xs text-slate-600">
            <span
              className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold text-white"
              style={{ backgroundColor: colorOf(id) }}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate" title={labelOf(id)}>
              {labelOf(id)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
