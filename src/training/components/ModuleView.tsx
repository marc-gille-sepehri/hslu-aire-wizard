import { useMemo, useState } from 'react'
import type { Module } from '../schema/types'
import { ResourcesProvider } from '../state/ResourcesContext'
import { LearnerStateProvider } from '../state/LearnerStateContext'
import { useLearnerState } from '../state/learnerState'
import SectionView from './SectionView'
import { labels } from '../labels'

export default function ModuleView({ module: mod }: { module: Module }) {
  const m = mod.module
  const learner = useLearnerState(m.id)
  const [sectionIndex, setSectionIndex] = useState(0)

  const sectionCount = m.sections.length
  const currentSection = m.sections[sectionIndex]

  const completedSectionCount = useMemo(() => {
    let done = 0
    for (const sec of m.sections) {
      const allDone = sec.artifacts.every((a) =>
        a.tracked === false ? true : learner.state.completed.includes(a.id)
      )
      if (allDone) done++
    }
    return done
  }, [m.sections, learner.state.completed])

  const onReset = () => {
    if (window.confirm(labels.resetConfirm)) {
      learner.reset()
      setSectionIndex(0)
    }
  }

  const canPrev = sectionIndex > 0
  const canNext = sectionIndex < sectionCount - 1

  return (
    <ResourcesProvider resources={m.resources}>
      <LearnerStateProvider value={learner}>
        <div className="max-w-prose mx-auto px-4 py-10 font-sans">
          <header className="mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{m.title}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {labels.progressOf(completedSectionCount, sectionCount)}
                </p>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="text-xs text-slate-500 hover:text-red-700 underline underline-offset-2"
              >
                {labels.resetProgress}
              </button>
            </div>
            {sectionCount > 1 && (
              <nav className="mt-5">
                <ol className="flex flex-wrap gap-2 text-xs">
                  {m.sections.map((sec, i) => (
                    <li key={sec.id}>
                      <button
                        type="button"
                        onClick={() => setSectionIndex(i)}
                        className={`px-2 py-1 rounded border ${
                          i === sectionIndex
                            ? 'border-slate-800 bg-slate-800 text-white'
                            : 'border-slate-300 text-slate-700 hover:border-slate-500'
                        }`}
                        aria-current={i === sectionIndex ? 'step' : undefined}
                      >
                        {i + 1}. {sec.title}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </header>

          <SectionView section={currentSection} />

          <footer className="mt-12 pt-6 border-t border-slate-200 flex justify-between">
            <button
              type="button"
              onClick={() => canPrev && setSectionIndex((i) => i - 1)}
              disabled={!canPrev}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← {labels.prev}
            </button>
            <button
              type="button"
              onClick={() => canNext && setSectionIndex((i) => i + 1)}
              disabled={!canNext}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {labels.next} →
            </button>
          </footer>
        </div>
      </LearnerStateProvider>
    </ResourcesProvider>
  )
}
