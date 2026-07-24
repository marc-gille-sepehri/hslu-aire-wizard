import { useState, type DragEvent } from 'react'
import { useModuleEditor } from './ModuleEditorContext'

/**
 * A drop target between two blocks (insertion index 0..len). Accepts both a new
 * block dragged from the palette and an existing block being reordered. Stays a
 * thin, unobtrusive gap until something is dragged over it.
 */
export default function InsertionZone({
  sectionId,
  index,
}: {
  sectionId: string
  index: number
}) {
  const { dragState, setDragState, insertNewArtifact, moveArtifact } = useModuleEditor()
  const [over, setOver] = useState(false)

  // Whether the current drag can drop here. A move within the same section is a
  // no-op onto its own edges; hide the indicator in that case.
  const active = (() => {
    if (!dragState) return false
    if (dragState.kind === 'new') return true
    if (dragState.sectionId !== sectionId) return false
    return !(index === dragState.index || index === dragState.index + 1)
  })()

  const onDragOver = (e: DragEvent) => {
    if (!active) return
    e.preventDefault()
    e.dataTransfer.dropEffect = dragState?.kind === 'new' ? 'copy' : 'move'
    if (!over) setOver(true)
  }

  const onDrop = (e: DragEvent) => {
    if (!active || !dragState) return
    e.preventDefault()
    if (dragState.kind === 'new') {
      insertNewArtifact(sectionId, index, dragState.blockType)
    } else {
      moveArtifact(sectionId, dragState.index, index)
    }
    setOver(false)
    setDragState(null)
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`transition-all ${active ? 'py-2' : 'py-1'}`}
      aria-hidden
    >
      <div
        className={`rounded-full transition-all ${
          over
            ? 'h-2 bg-gold'
            : active
              ? 'h-1 bg-gold/40'
              : 'h-px bg-transparent'
        }`}
      />
    </div>
  )
}
