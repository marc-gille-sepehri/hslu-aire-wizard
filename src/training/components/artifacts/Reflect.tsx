import { useEffect, useRef, useState } from 'react'
import type { ReflectArtifact } from '../../schema/types'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'

const SAVE_DEBOUNCE_MS = 500

export default function Reflect({ artifact }: { artifact: ReflectArtifact }) {
  const { state, updateReflect, markComplete } = useLearner()
  const stored = state.answers[artifact.id]?.text ?? ''
  const [value, setValue] = useState(stored)
  const [savedAt, setSavedAt] = useState<number | null>(stored ? Date.now() : null)
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    setValue(next)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      updateReflect(artifact.id, next)
      if (artifact.tracked !== false && next.trim().length > 0) markComplete(artifact.id)
      setSavedAt(Date.now())
    }, SAVE_DEBOUNCE_MS)
  }

  return (
    <div className="space-y-3">
      <p className="font-sans font-semibold text-slate-800">{artifact.prompt}</p>
      {artifact.guidance && <p className="text-sm text-slate-500">{artifact.guidance}</p>}
      <textarea
        value={value}
        onChange={onChange}
        rows={6}
        className="w-full rounded-md border border-slate-300 p-3 font-serif leading-relaxed text-slate-800 focus:border-slate-500 focus:outline-none"
      />
      <div className="h-4 text-xs text-slate-500">
        {savedAt && <span>{labels.savedHint}</span>}
      </div>
    </div>
  )
}
