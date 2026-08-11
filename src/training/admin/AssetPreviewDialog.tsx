import { useCallback, useEffect, useRef, useState } from 'react'

import { labels } from '../labels'
import { type MediaAsset, blobUrl } from './mediaApi'

const t = labels.adminMedia

const MIN_ZOOM = 0.25
const MAX_ZOOM = 8
const STEP = 1.25

/**
 * Full-screen preview for one asset: zoom, pan, Escape to close.
 *
 * Built here rather than pulled in as a lightbox library — antd is already a
 * dependency and its Image preview would have done this — because the training
 * area uses none of antd and has its own design system. A full-screen overlay
 * from another kit would be the one surface in here that looks like a different
 * product, and the behaviour needed is a hundred lines.
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

  // An SVG stays crisp at any zoom, and an <img> is a real boundary — the
  // browser blocks script and external fetches inside one — so the vector is
  // safe to show directly. Everything else gets the 1600 px derivative.
  const src =
    asset.mediaType === 'image/svg+xml'
      ? blobUrl(asset.blobKeys?.original ?? '')
      : blobUrl(asset.blobKeys?.web ?? asset.blobKeys?.original ?? '')

  const reset = useCallback(() => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const zoomBy = useCallback((factor: number) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)))
  }, [])

  useEffect(() => {
    // Same pattern the other dialogs in here use.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === '+' || e.key === '=') zoomBy(STEP)
      else if (e.key === '-') zoomBy(1 / STEP)
      else if (e.key === '0') reset()
    }
    window.addEventListener('keydown', onKey)
    // The page behind must not scroll while a full-screen overlay is open.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose, zoomBy, reset])

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    zoomBy(e.deltaY < 0 ? STEP : 1 / STEP)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    setOffset({ x: e.clientX - dragging.current.x, y: e.clientY - dragging.current.y })
  }
  const endDrag = () => {
    dragging.current = null
  }

  const Btn = ({
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
      className="rounded border border-white/25 px-2.5 py-1 text-sm font-semibold text-cream/90 hover:bg-white/10"
    >
      {children}
    </button>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={asset.descriptors?.altText ?? t.preview}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-navy/95"
    >
      {/* Toolbar. Stops propagation so a click here does not close the dialog. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2.5"
      >
        <span className="min-w-0 flex-1 truncate text-sm text-cream/90">
          {asset.descriptors?.altText ?? '—'}
        </span>
        <Btn onClick={() => zoomBy(1 / STEP)} label={t.zoomOut}>−</Btn>
        <span className="w-14 text-center font-mono text-xs text-cream/70">
          {Math.round(zoom * 100)}%
        </span>
        <Btn onClick={() => zoomBy(STEP)} label={t.zoomIn}>+</Btn>
        <Btn onClick={reset} label={t.zoomReset}>1:1</Btn>
        <a
          href={blobUrl(asset.blobKeys?.original ?? '')}
          target="_blank"
          rel="noreferrer"
          className="rounded border border-white/25 px-2.5 py-1 text-xs font-semibold text-cream/90 hover:bg-white/10"
        >
          {t.openOriginal}
        </a>
        <Btn onClick={onClose} label={t.close}>✕</Btn>
      </div>

      {/* Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className="flex flex-1 items-center justify-center overflow-hidden"
        style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
      >
        <img
          src={src}
          alt={asset.descriptors?.altText ?? ''}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transition: dragging.current ? 'none' : 'transform 120ms ease-out',
          }}
          className="max-h-full max-w-full select-none object-contain"
        />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="border-t border-white/10 px-4 py-2 text-[11px] text-cream/50"
      >
        {asset.provenance?.sourceDoc ?? '—'} · {t.slide} {asset.provenance?.locator?.slide ?? '?'} ·{' '}
        {asset.mediaType} · {t.zoomHint}
      </div>
    </div>
  )
}
