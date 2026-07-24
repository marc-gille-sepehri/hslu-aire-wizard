import { type DragEvent } from 'react'
import { BLOCK_TYPES, type BlockType } from './blockDefaults'
import { useModuleEditor } from './ModuleEditorContext'
import { labels } from '../labels'

/**
 * Side rail of draggable block types. Drag a type onto an insertion zone in the
 * training flow to add it; clicking appends it to the end of the current section
 * as a keyboard/no-drag fallback.
 */
export default function BlockPalette({
  sectionId,
  appendIndex,
}: {
  sectionId: string
  appendIndex: number
}) {
  const { setDragState, insertNewArtifact } = useModuleEditor()
  const t = labels.editor

  const onDragStart = (e: DragEvent, type: BlockType) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', `new:${type}`)
    setDragState({ kind: 'new', blockType: type })
  }

  return (
    <aside className="fixed right-4 top-1/2 z-40 hidden w-48 -translate-y-1/2 lg:block">
      <div className="rounded-xl border border-mist bg-white/95 p-3 shadow-lg backdrop-blur">
        <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-kicker text-gold">
          {t.paletteTitle}
        </p>
        <p className="mb-3 px-1 text-xs leading-snug text-slate-500">{t.paletteHint}</p>
        <ul className="list-none m-0 p-0 space-y-1.5">
          {BLOCK_TYPES.map((b) => (
            <li key={b.type}>
              <button
                type="button"
                draggable
                onDragStart={(e) => onDragStart(e, b.type)}
                onDragEnd={() => setDragState(null)}
                onClick={() => insertNewArtifact(sectionId, appendIndex, b.type)}
                title={b.hint}
                className="flex w-full cursor-grab items-center gap-2 rounded-md border border-mist bg-cream px-2.5 py-2 text-left text-sm text-navy transition-colors hover:border-navy hover:bg-white active:cursor-grabbing"
              >
                <span aria-hidden className="w-5 text-center text-base leading-none">
                  {b.icon}
                </span>
                <span className="font-medium">{b.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
