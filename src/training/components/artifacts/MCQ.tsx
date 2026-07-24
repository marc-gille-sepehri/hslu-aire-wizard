import { useMemo, useState } from 'react'
import type { MCQArtifact } from '../../schema/types'
import { useInline } from '../../lib/inlineMedia'
import { useLearner } from '../../state/LearnerStateContext'
import { useRecordInteraction } from '../../state/ProgressContext'
import { labels } from '../../labels'

export default function MCQ({ artifact }: { artifact: MCQArtifact }) {
  const inline = useInline()
  const { state, recordAnswer, markComplete } = useLearner()
  const record = useRecordInteraction()
  const stored = state.answers[artifact.id]
  const revealAnswer = artifact.revealAnswer ?? true
  const maxAttempts = artifact.attempts ?? Infinity

  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    typeof stored?.selectedIndex === 'number' ? stored.selectedIndex : null
  )
  const [locked, setLocked] = useState<boolean>(stored !== undefined)

  const attemptsUsed = stored?.attempts ?? 0
  const canRetry = locked && attemptsUsed < maxAttempts && (revealAnswer ? true : !stored?.correct)

  const correctIndex = useMemo(
    () => artifact.options.findIndex((o) => o.correct),
    [artifact.options]
  )

  const choose = (idx: number) => {
    if (locked) return
    setSelectedIndex(idx)
    setLocked(true)
    const correct = artifact.options[idx].correct
    recordAnswer(artifact.id, { selectedIndex: idx, correct })
    record(artifact.id, { type: 'selection', selectedIndex: idx, correct })
    if (artifact.tracked !== false) markComplete(artifact.id)
  }

  const retry = () => {
    setSelectedIndex(null)
    setLocked(false)
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-5">
      <p className="font-sans text-slate-800 font-medium mb-4">{inline(artifact.stem)}</p>
      <ul className="space-y-2">
        {artifact.options.map((opt, idx) => {
          const isSelected = selectedIndex === idx
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
            <li key={idx}>
              <button
                type="button"
                onClick={() => choose(idx)}
                disabled={locked}
                className={`w-full text-left rounded-md border px-3 py-2 text-slate-800 transition-colors ${styling}`}
              >
                {inline(opt.text)}
              </button>
            </li>
          )
        })}
      </ul>

      {locked && selectedIndex !== null && (
        <div className="mt-4 space-y-2 text-sm">
          {revealAnswer && (
            <p className={selectedIndex === correctIndex ? 'text-emerald-700' : 'text-red-700'}>
              {selectedIndex === correctIndex ? labels.correct : labels.incorrect}
            </p>
          )}
          {artifact.options[selectedIndex].feedback && (
            <p className="text-slate-700">{inline(artifact.options[selectedIndex].feedback!)}</p>
          )}
          {artifact.explanation && (
            <p className="text-slate-600">{inline(artifact.explanation)}</p>
          )}
        </div>
      )}

      {canRetry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 text-sm text-indigo-700 hover:underline"
        >
          {labels.tryAgain}
        </button>
      )}
    </div>
  )
}
