import { useMemo, useState } from 'react'
import type { LabSelectArtifact } from '../../schema/types'
import { useInline } from '../../lib/inlineMedia'
import { useLearner } from '../../state/LearnerStateContext'
import { useRecordInteraction } from '../../state/ProgressContext'
import { labels } from '../../labels'

export default function LabSelect({ artifact }: { artifact: LabSelectArtifact }) {
  const inline = useInline()
  const { state, recordAnswer, markComplete } = useLearner()
  const record = useRecordInteraction()
  const stored = state.answers[artifact.id]
  const revealAnswer = artifact.revealAnswer ?? true
  const maxAttempts = artifact.attempts ?? Infinity

  const [selectedId, setSelectedId] = useState<string | null>(stored?.selectedOptionId ?? null)
  const [locked, setLocked] = useState<boolean>(stored !== undefined)

  const attemptsUsed = stored?.attempts ?? 0
  const canRetry = locked && attemptsUsed < maxAttempts && (revealAnswer ? true : !stored?.correct)

  const selected = useMemo(
    () => (selectedId ? artifact.options.find((o) => o.id === selectedId) ?? null : null),
    [selectedId, artifact.options]
  )

  const choose = (id: string) => {
    if (locked) return
    const opt = artifact.options.find((o) => o.id === id)
    if (!opt) return
    setSelectedId(id)
    setLocked(true)
    recordAnswer(artifact.id, { selectedOptionId: id, correct: opt.correct })
    record(artifact.id, { type: 'selection', selectedOptionId: id, correct: opt.correct })
    if (artifact.tracked !== false) markComplete(artifact.id)
  }

  const retry = () => {
    setSelectedId(null)
    setLocked(false)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 font-serif leading-relaxed text-slate-800">
        {inline(artifact.scenario)}
      </div>
      <ul className="space-y-3">
        {artifact.options.map((opt) => {
          const isSelected = selectedId === opt.id
          const showResult = locked && revealAnswer
          const styling = !showResult
            ? isSelected
              ? 'border-slate-400 bg-slate-50'
              : 'border-slate-200 hover:border-slate-400'
            : opt.correct
            ? 'border-emerald-400 bg-emerald-50'
            : isSelected
            ? 'border-red-400 bg-red-50'
            : 'border-slate-200 opacity-70'
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => choose(opt.id)}
                disabled={locked}
                className={`w-full text-left rounded-md border px-4 py-3 transition-colors ${styling}`}
              >
                <span className="block font-sans font-medium text-slate-800 mb-1">{opt.label}</span>
                {locked && (isSelected || (showResult && opt.correct)) && (
                  <span className="block text-sm text-slate-700 mt-1 font-serif">{inline(opt.feedback)}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {locked && selected && (
        <div className="space-y-2 text-sm">
          {revealAnswer && (
            <p className={selected.correct ? 'text-emerald-700' : 'text-red-700'}>
              {selected.correct ? labels.correct : labels.incorrect}
            </p>
          )}
          {artifact.explanation && (
            <p className="text-slate-600 font-serif">{inline(artifact.explanation)}</p>
          )}
        </div>
      )}

      {canRetry && (
        <button
          type="button"
          onClick={retry}
          className="text-sm text-indigo-700 hover:underline"
        >
          {labels.tryAgain}
        </button>
      )}
    </div>
  )
}
