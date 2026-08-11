import { useMemo, useState, type DragEvent, type FormEvent } from 'react'
import type { EmbeddingCompareArtifact } from '../../schema/types'
import { labels } from '../../labels'
import { chunkText } from '../../lib/chunking'
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

/** Defaults when the author set none. ~400 characters is a paragraph. */
const DEFAULT_CHUNK_SIZE = 400
const DEFAULT_OVERLAP = 60
const MAX_CHUNK_SIZE = 4000   // the embedding proxy's per-text ceiling

interface Item {
  id: string
  text: string
  selected: boolean
  /** Set when this item came out of a split, so the list can say so. */
  chunk?: { index: number; total: number }
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
  const [size, setSize] = useState(() =>
    clamp(artifact.chunkSize ?? DEFAULT_CHUNK_SIZE, 100, MAX_CHUNK_SIZE),
  )
  const [overlap, setOverlap] = useState(() => artifact.chunkOverlap ?? DEFAULT_OVERLAP)
  const [dropping, setDropping] = useState(false)
  const [lastSplit, setLastSplit] = useState<number | null>(null)

  // The overlap can never reach the window: past half, each chunk is mostly its
  // predecessor and the count grows while the content does not.
  const maxOverlap = Math.floor(size / 2)
  const effectiveOverlap = Math.min(overlap, maxOverlap)

  // Splitting a pasted document is linear in its length, and the button label
  // needs the count on every render. Memoised so a slider drag does not re-cut
  // half a megabyte per frame.
  const willSplitInto = useMemo(
    () => (draft.trim().length > size ? chunkText(draft, size, effectiveOverlap).length : 1),
    [draft, size, effectiveOverlap],
  )

  const selected = items.filter((i) => i.selected)
  const colorOf = (id: string) => COLORS[items.findIndex((i) => i.id === id) % COLORS.length]

  // The plot belongs to the selection it was computed from; changing the
  // selection must not silently repaint old numbers under a new set of points.
  const stale = useMemo(() => {
    if (!computed) return false
    const now = selected.map((i) => i.id).join('|')
    return now !== computed.ids.join('|')
  }, [computed, selected])

  /**
   * Add a text, split first if it is longer than the chunk size.
   *
   * This is the whole point of the block's second half: retrieval never sees a
   * document, only the fragments somebody cut out of it. Pasting a page and
   * watching it become eight points — some of which land nowhere near the
   * others — is the lesson, and it cannot be told by swallowing the page whole.
   */
  const addText = (raw: string) => {
    const chunks = chunkText(raw, size, effectiveOverlap)
    if (chunks.length === 0) return
    const stamp = Date.now()
    setItems((prev) => [
      ...prev,
      ...chunks.map((c, i) => ({
        id: `i${stamp}-${prev.length}-${i}`,
        text: c.text,
        selected: true,
        chunk: c.total > 1 ? { index: c.index, total: c.total } : undefined,
      })),
    ])
    setLastSplit(chunks.length > 1 ? chunks.length : null)
  }

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    addText(draft)
    setDraft('')
  }

  /** Text or a text file, dragged onto the box. */
  const onDrop = async (e: DragEvent) => {
    e.preventDefault()
    setDropping(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (file.size > 2_000_000) {
        setError(t.fileTooBig)
        return
      }
      addText(await file.text())
      return
    }
    const text = e.dataTransfer.getData('text/plain')
    if (text.trim()) addText(text)
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
                <span className="min-w-0 flex-1">
                  {item.chunk && (
                    <span className="mr-2 rounded bg-cream px-1.5 py-0.5 align-middle font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
                      {t.chunkBadge(item.chunk.index, item.chunk.total)}
                    </span>
                  )}
                  <span
                    className={`whitespace-pre-wrap font-sans text-sm ${
                      item.selected ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {item.text}
                  </span>
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

        <form
          onSubmit={add}
          onDragOver={(e) => {
            e.preventDefault()
            setDropping(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget === e.target) setDropping(false)
          }}
          onDrop={(e) => void onDrop(e)}
          className={`relative flex gap-2 border-t border-mist px-4 py-3 transition-colors ${
            dropping ? 'bg-navy/5' : ''
          }`}
        >
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
            {/* Say up front that this will be cut, so nobody is surprised by
                eight new rows appearing where one was typed. */}
            {willSplitInto > 1 ? t.addChunked(willSplitInto) : t.add}
          </button>
          {dropping && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded font-sans text-sm font-semibold text-navy">
              {t.dropHint}
            </span>
          )}
        </form>
      </div>

      {/* ── Chunking ─────────────────────────────────────────────────────── */}
      <div className="rounded-md border border-mist bg-white px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Slider
            label={t.chunkSize}
            value={size}
            min={100}
            max={MAX_CHUNK_SIZE}
            step={50}
            onChange={(v) => setSize(v)}
            unit={t.chars}
          />
          <Slider
            label={t.chunkOverlap}
            value={effectiveOverlap}
            min={0}
            max={maxOverlap}
            step={10}
            onChange={(v) => setOverlap(v)}
            unit={t.chars}
          />
        </div>
        <p className="mt-2 max-w-prose font-sans text-xs text-slate-500">{t.chunkHint}</p>
        {lastSplit && (
          <p className="mt-1 font-sans text-xs text-navy">{t.splitInto(lastSplit)}</p>
        )}
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

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(n)))
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <label className="min-w-[13rem] flex-1">
      <span className="flex items-baseline justify-between font-sans text-xs text-slate-600">
        {label}
        <span className="tabular-nums text-slate-500">
          {value} {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={max <= min}
        className="mt-1 w-full accent-navy disabled:opacity-40"
      />
    </label>
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
