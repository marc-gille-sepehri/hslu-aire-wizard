import { createContext, useContext, type ReactNode } from 'react'
import type { Resource } from '../schema/types'

const ResourcesContext = createContext<Record<string, Resource>>({})

export function ResourcesProvider({
  resources,
  children,
}: {
  resources: Record<string, Resource>
  children: ReactNode
}) {
  return <ResourcesContext.Provider value={resources}>{children}</ResourcesContext.Provider>
}

export function useResources() {
  return useContext(ResourcesContext)
}

export function useResource(id: string): Resource | undefined {
  const all = useResources()
  return all[id]
}
