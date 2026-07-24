import { useRef, type DragEvent, type ReactNode } from 'react'
import type { Artifact } from '../schema/types'
import { useModuleEditor } from './ModuleEditorContext'
import { BLOCK_TYPE_LABEL } from './blockDefaults'
import { labels } from '../labels'

/**
 * Editing frame around a single training block. Adds a type badge, a drag handle
 * for reordering, and edit/delete controls. The block's own content is rendered
 * as children and made inert (no learner interaction) while editing.
 */
export default function EditableBlock({
  sectionId,
  artifact,
  index,
  onEdit,
  children,
}: {
  sectionId: string
  artifact: Artifact
  index: number
  onEdit: (artifact: Artifact) => void
  children: ReactNode
}) {
  const { deleteArtifact, setDragState, dragState } = useModuleEditor()
  const frameRef = useRef<HTMLDivElement>(null)

  const isDragging =
    dragState?.kind === 'move' && dragState.id === artifact.id && dragState.sectionId === sectionId

  const onHandleDragStart = (e: DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    // Some browsers require data to be set for a drag to begin.
    e.dataTransfer.setData('text/plain', artifact.id)
    if (frameRef.current) e.dataTransfer.setDragImage(frameRef.current, 12, 12)
    setDragState({ kind: 'move', sectionId, index, id: artifact.id })
  }

  const onHandleDragEnd = () => setDragState(null)

  const t = labels.editor

  return (
    <div
      ref={frameRef}
      className={`group relative rounded-lg border-2 border-dashed border-mist-strong bg-white/60 px-4 py-4 transition-colors hover:border-navy/40 ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      {/* Type badge (top-left) */}
      <span className="pointer-events-none absolute -top-2.5 left-3 rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold uppercase tracking-kicker text-white">
        {BLOCK_TYPE_LABEL[artifact.type] ?? artifact.type}
      </span>

      {/* Controls (top-right): edit + delete */}
      <div className="absolute -top-3 right-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(artifact)}
          title={t.edit}
          aria-label={t.edit}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-mist bg-white text-navy shadow-sm transition-colors hover:bg-navy hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => deleteArtifact(sectionId, artifact.id)}
          title={t.delete}
          aria-label={t.delete}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-mist bg-white text-red-700 shadow-sm transition-colors hover:bg-red-700 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>

      {/* Drag handle (left edge) */}
      <div
        draggable
        onDragStart={onHandleDragStart}
        onDragEnd={onHandleDragEnd}
        title={t.dragToReorder}
        aria-label={t.dragToReorder}
        className="absolute -left-3 top-1/2 flex h-8 w-6 -translate-y-1/2 cursor-grab items-center justify-center rounded-md border border-mist bg-white text-slate-400 shadow-sm hover:text-navy active:cursor-grabbing"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
        </svg>
      </div>

      {/* Inert block content — editing changes structure, not learner answers. */}
      <div className="pointer-events-none select-none">{children}</div>
    </div>
  )
}
