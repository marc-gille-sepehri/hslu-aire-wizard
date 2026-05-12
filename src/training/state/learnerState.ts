import { useCallback, useEffect, useState } from 'react'

export type LearnerAnswer = {
  artifactId: string
  selectedOptionId?: string
  selectedIndex?: number
  correct?: boolean
  text?: string
  attempts: number
  timestamp: number
}

export type LearnerState = {
  moduleId: string
  answers: Record<string, LearnerAnswer>
  completed: string[]
}

const storageKey = (moduleId: string) => `learner-state:${moduleId}`

function emptyState(moduleId: string): LearnerState {
  return { moduleId, answers: {}, completed: [] }
}

function loadFromStorage(moduleId: string): LearnerState {
  try {
    const raw = localStorage.getItem(storageKey(moduleId))
    if (!raw) return emptyState(moduleId)
    const parsed = JSON.parse(raw) as LearnerState
    if (!parsed || typeof parsed !== 'object' || parsed.moduleId !== moduleId) {
      return emptyState(moduleId)
    }
    return {
      moduleId,
      answers: parsed.answers ?? {},
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    }
  } catch (e) {
    console.warn('[training] failed to load learner state:', e)
    return emptyState(moduleId)
  }
}

function saveToStorage(state: LearnerState) {
  try {
    localStorage.setItem(storageKey(state.moduleId), JSON.stringify(state))
  } catch (e) {
    console.warn('[training] failed to persist learner state:', e)
  }
}

export function useLearnerState(moduleId: string) {
  const [state, setState] = useState<LearnerState>(() => loadFromStorage(moduleId))

  // Reload when switching modules.
  useEffect(() => {
    setState(loadFromStorage(moduleId))
  }, [moduleId])

  useEffect(() => {
    saveToStorage(state)
  }, [state])

  const recordAnswer = useCallback(
    (artifactId: string, patch: Partial<Omit<LearnerAnswer, 'artifactId' | 'attempts' | 'timestamp'>>) => {
      setState((prev) => {
        const prior = prev.answers[artifactId]
        const next: LearnerAnswer = {
          ...prior,
          ...patch,
          artifactId,
          attempts: (prior?.attempts ?? 0) + 1,
          timestamp: Date.now(),
        }
        return { ...prev, answers: { ...prev.answers, [artifactId]: next } }
      })
    },
    []
  )

  const updateReflect = useCallback((artifactId: string, text: string) => {
    setState((prev) => {
      const prior = prev.answers[artifactId]
      const next: LearnerAnswer = {
        ...prior,
        artifactId,
        text,
        attempts: prior?.attempts ?? 0,
        timestamp: Date.now(),
      }
      return { ...prev, answers: { ...prev.answers, [artifactId]: next } }
    })
  }, [])

  const markComplete = useCallback((artifactId: string) => {
    setState((prev) => {
      if (prev.completed.includes(artifactId)) return prev
      return { ...prev, completed: [...prev.completed, artifactId] }
    })
  }, [])

  const reset = useCallback(() => {
    setState(emptyState(moduleId))
  }, [moduleId])

  return { state, recordAnswer, updateReflect, markComplete, reset }
}
