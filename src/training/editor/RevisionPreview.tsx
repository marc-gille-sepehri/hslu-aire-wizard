// Read-only preview of a past revision (module-revision spec §6.1 B).
//
// Rendered through the NORMAL module renderer, so what you see is what that
// revision looked like — not a JSON dump. A persistent banner and a fresh
// EditModeProvider (whose editing flag starts off and has no toggle in here)
// make sure the preview can never be edited by accident.
import { useEffect, useState } from 'react'
import type { Module } from '../schema/types'
import { ResourcesProvider } from '../state/ResourcesContext'
import { LearnerStateProvider } from '../state/LearnerStateContext'
import { useLearnerState } from '../state/learnerState'
import SectionView from '../components/SectionView'
import { labels } from '../labels'
import { EditModeProvider } from './EditModeContext'
import { ModuleEditorProvider } from './ModuleEditorContext'
import { loadRevision, type RevisionSnapshot } from '../lib/revisionApi'

export default function RevisionPreview({
  moduleId,
  rev,
  onClose,
}: {
  moduleId: string
  rev: number
  onClose: () => void
}) {
  const [snapshot, setSnapshot] = useState<RevisionSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setSnapshot(null)
    setError(null)
    loadRevision(moduleId, rev)
      .then((s) => alive && setSnapshot(s))
      .catch((e) => alive && setError((e as Error).message))
    return () => {
      alive = false
    }
  }, [moduleId, rev])

  const date = snapshot ? new Date(snapshot.ts).toLocaleDateString('de-CH', { day: 'numeric', month: 'long' }) : ''

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b-2 border-amber-400 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-900">
          {snapshot ? labels.history.previewBanner(rev, date) : labels.history.loading}
          {snapshot?.note ? <span className="ml-2 font-normal italic">„{snapshot.note}“</span> : null}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-amber-500 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          {labels.history.previewExit}
        </button>
      </div>

      {error && <p className="m-6 rounded bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {snapshot && <PreviewBody snapshot={snapshot} moduleId={moduleId} />}
    </div>
  )
}

function PreviewBody({ snapshot, moduleId }: { snapshot: RevisionSnapshot; moduleId: string }) {
  const mod: Module = {
    module: {
      id: moduleId,
      title: snapshot.title,
      lang: snapshot.lang,
      resources: snapshot.resources ?? {},
      sections: snapshot.sections ?? [],
    },
  }
  const learner = useLearnerState(moduleId)

  return (
    <EditModeProvider>
      <ModuleEditorProvider initialModule={mod} moduleId={moduleId} initialRev={snapshot.rev}>
        <ResourcesProvider resources={mod.module.resources}>
          <LearnerStateProvider value={learner}>
            <div className="max-w-prose mx-auto px-4 py-10 font-sans">
              <header className="mb-8 border-b border-slate-200 pb-6">
                <h1 className="text-3xl font-bold text-slate-800">{mod.module.title}</h1>
              </header>
              <div className="space-y-16">
                {mod.module.sections.map((sec, i) => (
                  <div key={sec.id}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {i + 1}. {sec.title}
                    </p>
                    <SectionView section={sec} />
                  </div>
                ))}
              </div>
            </div>
          </LearnerStateProvider>
        </ResourcesProvider>
      </ModuleEditorProvider>
    </EditModeProvider>
  )
}
