import { useCallback, useEffect, useRef, useState } from 'react'

import { labels } from '../labels'
import { type MediaAsset, blobUrl, formatBytes } from './mediaApi'

const t = labels.adminMedia

const MIN_ZOOM = 0.25
const MAX_ZOOM = 8
const STEP = 1.25

/**
 * Preview one asset: zoom, pan, Escape to close.
 *
 * Built here rather than pulled in as a lightbox library — antd is already a
 * dependency and its Image preview would have done this — because the training
 * area uses none of antd and has its own design system. An overlay from another
 * kit would be the one surface in here that looks like a different product.
 */
export default function AssetPreviewDialog({
  asset,
  onClose,
}: {
  asset: MediaAsset
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragging = useRef<{ x: number; y: number } | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  // The raster derivative, deliberately, even for SVG assets.
  //
  // An SVG names its fonts and cannot load them: inside an <img> it may only use
  // what is installed on the viewing machine. The deck's house font is Lato,
  // which the render host now has but a Mac generally does not — so the vector
  // renders with substituted metrics here and the labels sit wrong, while the
  // PNG was rendered server-side with the right fonts and is faithful.
  //
  // Crispness is the trade. "Original öffnen" still gives the vector.
  const src = blobUrl(asset.blobKeys?.web ?? asset.blobKeys?.original ?? '')

  const reset = useCallback(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const zoomBy = useCallback((factor: number) => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor))
      if (next === 1) setOffset({ x: 0, y: 0 })
      return next
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') zoomBy(STEP)
      else if (e.key === '-') zoomBy(1 / STEP)
      else if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, zoomBy, reset])

  useEffect(() => {
    // React attaches onWheel passively, so preventDefault() inside a JSX handler
    // is silently ignored and the wheel keeps acting on the page behind. The
    // listener has to be registered explicitly as non-passive.
    const stage = stageRef.current
    if (!stage) return undefined
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomBy(e.deltaY < 0 ? STEP : 1 / STEP)
    }
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => stage.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return
    dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    setOffset({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y })
  }
  const endDrag = () => {
    dragging.current = null
  }

  const Tool = ({
    onClick,
    label,
    children,
  }: {
    onClick: () => void
    label: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-md border border-mist bg-white px-2.5 py-1 text-sm font-semibold text-navy hover:bg-cream"
    >
      {children}
    </button>
  )

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4 sm:p-8"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={asset.descriptors?.altText ?? t.preview}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-mist bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-mist bg-cream px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display font-bold text-navy">
              {asset.descriptors?.altText ?? '—'}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {asset.provenance?.sourceDoc ?? '—'} · {t.slide}{' '}
              {asset.provenance?.locator?.slide ?? '?'} · {asset.mediaType} ·{' '}
              {formatBytes(asset.bytes ?? 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t.close}
            aria-label={t.close}
            className="shrink-0 rounded-md border border-mist bg-white p-1.5 text-slate-500 hover:border-navy hover:text-navy"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stage */}
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#f1f0ec_0%_25%,#ffffff_0%_50%)] bg-[length:20px_20px] p-2"
          style={{ cursor: zoom > 1 ? (dragging.current ? 'grabbing' : 'grab') : 'default' }}
        >
          <img
            src={src}
            alt={asset.descriptors?.altText ?? ''}
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transition: dragging.current ? 'none' : 'transform 120ms ease-out',
            }}
            className="max-h-[65vh] max-w-full select-none object-contain"
          />
        </div>

        {/* Footer / controls */}
        <div className="flex flex-wrap items-center gap-2 border-t border-mist bg-cream px-4 py-2.5">
          <Tool onClick={() => zoomBy(1 / STEP)} label={t.zoomOut}>−</Tool>
          <span className="w-14 text-center font-mono text-xs text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <Tool onClick={() => zoomBy(STEP)} label={t.zoomIn}>+</Tool>
          <Tool onClick={reset} label={t.zoomReset}>1:1</Tool>
          <a
            href={blobUrl(asset.blobKeys?.original ?? '')}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-mist bg-white px-2.5 py-1 text-xs font-semibold text-navy hover:bg-cream"
          >
            {t.openOriginal}
          </a>
          <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">{t.zoomHint}</span>
        </div>
      </div>
    </div>
  )
}
