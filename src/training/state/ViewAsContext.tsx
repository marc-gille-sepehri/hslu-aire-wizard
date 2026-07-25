import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export interface ViewAsTarget {
  email: string
  label: string
}

interface ViewAsValue {
  /** The learner an admin is currently viewing, or null for the admin's own view. */
  viewAs: ViewAsTarget | null
  setViewAs: (target: ViewAsTarget | null) => void
}

const ViewAsContext = createContext<ViewAsValue | null>(null)

/**
 * Teilnehmeransicht: an Administrator can switch the whole training area to
 * read another learner's progress/work (global for now). Null = own view.
 */
export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAs, setViewAs] = useState<ViewAsTarget | null>(null)
  const value = useMemo<ViewAsValue>(() => ({ viewAs, setViewAs }), [viewAs])
  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>
}

/** Safe outside a provider: returns own-view + a no-op setter. */
export function useViewAs(): ViewAsValue {
  return useContext(ViewAsContext) ?? { viewAs: null, setViewAs: () => {} }
}
