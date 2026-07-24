import { useState } from 'react'
import type { Artifact, Section } from '../schema/types'
import { artifactComponents } from './artifacts'
import { labels } from '../labels'
import { useEditMode } from '../editor/EditModeContext'
import EditableBlock from '../editor/EditableBlock'
import InsertionZone from '../editor/InsertionZone'
import BlockEditorDialog from '../editor/BlockEditorDialog'

function renderArtifact(artifact: Artifact) {
  const Comp = artifactComponents[artifact.type]
  if (!Comp) {
    console.warn(`[training] no renderer for artifact type: ${(artifact as any).type}`)
    return null
  }
  return <Comp artifact={artifact as any} />
}

export default function SectionView({ section }: { section: Section }) {
  const { editing } = useEditMode()
  const [editingArtifact, setEditingArtifact] = useState<Artifact | null>(null)

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="font-sans text-2xl font-bold text-slate-800">{section.title}</h2>
        {section.objectives && section.objectives.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{labels.objectives}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {section.objectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
      </header>

      {editing ? (
        // Edit mode: blocks wrapped in frames, with drop zones between them.
        <div>
          <InsertionZone sectionId={section.id} index={0} />
          {section.artifacts.map((artifact, i) => (
            <div key={artifact.id}>
              <EditableBlock
                sectionId={section.id}
                artifact={artifact}
                index={i}
                onEdit={setEditingArtifact}
              >
                {renderArtifact(artifact)}
              </EditableBlock>
              <InsertionZone sectionId={section.id} index={i + 1} />
            </div>
          ))}
          {section.artifacts.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-400">
              {labels.editor.paletteHint}
            </p>
          )}
        </div>
      ) : (
        // View mode: unchanged learner experience.
        <div className="space-y-8">
          {section.artifacts.map((artifact) => (
            <div key={artifact.id}>{renderArtifact(artifact)}</div>
          ))}
        </div>
      )}

      {editingArtifact && (
        <BlockEditorDialog
          sectionId={section.id}
          artifact={editingArtifact}
          onClose={() => setEditingArtifact(null)}
        />
      )}
    </section>
  )
}
