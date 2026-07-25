import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Artifact, Module } from '../schema/types'
import type { BlockType } from './blockDefaults'
import { makeNewArtifact } from './blockDefaults'
import { saveModule } from '../lib/moduleApi'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/** What is currently being dragged — shared so drop zones can highlight/validate. */
export type DragState =
  | { kind: 'new'; blockType: BlockType }
  | { kind: 'move'; sectionId: string; index: number; id: string }
  | null

interface ModuleEditorState {
  mod: Module
  /** The course this module belongs to (for document uploads). */
  courseId?: string
  /** Replace an artifact in place (used by the edit dialog on save). */
  updateArtifact: (sectionId: string, artifactId: string, next: Artifact) => void
  deleteArtifact: (sectionId: string, artifactId: string) => void
  /** Insert a brand-new block of `type` at an insertion index (0..len). */
  insertNewArtifact: (sectionId: string, index: number, type: BlockType) => void
  /** Move an existing block to an insertion index (0..len) within its section. */
  moveArtifact: (sectionId: string, fromIndex: number, toInsertIndex: number) => void

  dragState: DragState
  setDragState: (d: DragState) => void

  /** Persist the working copy back to the module version (Administrator only). */
  save: () => Promise<void>
  saveStatus: SaveStatus
  saveError: string | null
}

const ModuleEditorContext = createContext<ModuleEditorState | null>(null)

function replaceSectionArtifacts(
  mod: Module,
  sectionId: string,
  updater: (artifacts: Artifact[]) => Artifact[],
): Module {
  return {
    module: {
      ...mod.module,
      sections: mod.module.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, artifacts: updater(sec.artifacts) } : sec,
      ),
    },
  }
}

export function ModuleEditorProvider({
  initialModule,
  moduleId,
  courseId,
  children,
}: {
  initialModule: Module
  moduleId: string
  courseId?: string
  children: ReactNode
}) {
  // Deep clone so edits never mutate the loaded (immutable) module object.
  const [mod, setMod] = useState<Module>(() => structuredClone(initialModule))
  const [dragState, setDragState] = useState<DragState>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const value = useMemo<ModuleEditorState>(() => {
    const updateArtifact = (sectionId: string, artifactId: string, next: Artifact) =>
      setMod((m) =>
        replaceSectionArtifacts(m, sectionId, (arts) =>
          arts.map((a) => (a.id === artifactId ? next : a)),
        ),
      )

    const deleteArtifact = (sectionId: string, artifactId: string) =>
      setMod((m) =>
        replaceSectionArtifacts(m, sectionId, (arts) => arts.filter((a) => a.id !== artifactId)),
      )

    const insertNewArtifact = (sectionId: string, index: number, type: BlockType) =>
      setMod((m) =>
        replaceSectionArtifacts(m, sectionId, (arts) => {
          const next = arts.slice()
          const at = Math.max(0, Math.min(index, next.length))
          next.splice(at, 0, makeNewArtifact(type))
          return next
        }),
      )

    const moveArtifact = (sectionId: string, fromIndex: number, toInsertIndex: number) =>
      setMod((m) =>
        replaceSectionArtifacts(m, sectionId, (arts) => {
          // No-op if dropping onto its own edges.
          if (toInsertIndex === fromIndex || toInsertIndex === fromIndex + 1) return arts
          const next = arts.slice()
          const [moved] = next.splice(fromIndex, 1)
          // After removal, indices above `fromIndex` shift down by one.
          const target = toInsertIndex > fromIndex ? toInsertIndex - 1 : toInsertIndex
          next.splice(target, 0, moved)
          return next
        }),
      )

    const save = async () => {
      setSaveStatus('saving')
      setSaveError(null)
      try {
        await saveModule(moduleId, {
          title: mod.module.title,
          lang: mod.module.lang,
          resources: mod.module.resources as Record<string, unknown>,
          sections: mod.module.sections,
        })
        setSaveStatus('saved')
      } catch (e) {
        setSaveStatus('error')
        setSaveError((e as Error).message)
      }
    }

    return {
      mod,
      courseId,
      updateArtifact,
      deleteArtifact,
      insertNewArtifact,
      moveArtifact,
      dragState,
      setDragState,
      save,
      saveStatus,
      saveError,
    }
  }, [mod, dragState, moduleId, courseId, saveStatus, saveError])

  return <ModuleEditorContext.Provider value={value}>{children}</ModuleEditorContext.Provider>
}

export function useModuleEditor(): ModuleEditorState {
  const ctx = useContext(ModuleEditorContext)
  if (!ctx) throw new Error('useModuleEditor must be used within a ModuleEditorProvider')
  return ctx
}
