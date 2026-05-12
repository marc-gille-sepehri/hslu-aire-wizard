import { createContext, useContext, type ReactNode } from 'react'
import type { LearnerState } from './learnerState'

type LearnerStateAPI = {
  state: LearnerState
  recordAnswer: (
    artifactId: string,
    patch: Partial<{
      selectedOptionId: string
      selectedIndex: number
      correct: boolean
      text: string
    }>
  ) => void
  updateReflect: (artifactId: string, text: string) => void
  markComplete: (artifactId: string) => void
  reset: () => void
}

const Ctx = createContext<LearnerStateAPI | null>(null)

export function LearnerStateProvider({ value, children }: { value: LearnerStateAPI; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLearner() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLearner must be used within LearnerStateProvider')
  return v
}
