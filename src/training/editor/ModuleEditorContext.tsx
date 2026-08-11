import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Artifact, Module } from '../schema/types'
import type { BlockType } from './blockDefaults'
import { makeNewArtifact } from './blockDefaults'
import {
  ApiError,
  commitDraft,
  discardDraft,
  loadDraft,
  saveDraft,
  saveDraftOnUnload,
  type ModuleDraft,
  type StaleInfo,
} from '../lib/revisionApi'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
export type DraftStatus = 'idle' | 'saving' | 'saved' | 'error'

/** How long the "Gespeichert als Revision N — Rückgängig" bar stays up. */
export const UNDO_WINDOW_MS = 30_000
/** Autosave triggers (spec §3): debounce, plus a ceiling while typing continues. */
const DRAFT_DEBOUNCE_MS = 2_000
const DRAFT_MAX_INTERVAL_MS = 30_000

/** What a commit attempt reports back, so the UI can react per case. */
export type CommitOutcome =
  | { ok: true; rev: number }
  | { ok: false; kind: 'note'; message: string }
  | { ok: false; kind: 'stale'; stale: StaleInfo }
  | { ok: false; kind: 'noDraft' }
  | { ok: false; kind: 'error'; message: string }

/** What is currently being dragged — shared so drop zones can highlight/validate. */
export type DragState =
  | { kind: 'new'; blockType: BlockType }
  | { kind: 'move'; sectionId: string; index: number; id: string }
  // A figure dragged out of the media rail. Carries what a media block needs, so
  // the drop can build a filled-in artifact instead of an empty one the author
  // then has to configure.
  | { kind: 'media'; url: string; altText: string; filename: string; bytes: number }
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
  /** Insert an already-built artifact — used when a drop carries its content. */
  insertArtifact: (sectionId: string, index: number, artifact: Artifact) => void
  /** Move an existing block to an insertion index (0..len) within its section. */
  moveArtifact: (sectionId: string, fromIndex: number, toInsertIndex: number) => void

  /** Append a new empty section. */
  addSection: () => void
  /** Rename a section. */
  renameSection: (sectionId: string, title: string) => void
  /** Remove a section (and its blocks). */
  removeSection: (sectionId: string) => void

  dragState: DragState
  setDragState: (d: DragState) => void

  /**
   * Commit the draft as a new revision: flush the autosave, then commit. `note`
   * is required and lands in the history — an explicit act, never an autosave.
   */
  save: (note: string, opts?: { override?: boolean }) => Promise<CommitOutcome>
  saveStatus: SaveStatus
  saveError: string | null
  /** True when the working copy differs from the last saved state. */
  dirty: boolean

  /** Current revision of the module as last seen by this editor. */
  rev: number
  /** Set right after a successful save; drives the undo bar. */
  lastSavedRev: number | null
  clearLastSavedRev: () => void
  /** Set when the server refused the write because someone else saved first. */
  conflictRev: number | null
  clearConflict: () => void

  /** Autosaved draft state — no revision, no rev bump. */
  draftStatus: DraftStatus
  draftSavedAt: Date | null
  /** Write the draft now if there is anything to write. */
  flushDraft: () => Promise<boolean>
  /** A draft found on open that differs from the committed content. */
  pendingDraft: ModuleDraft | null
  /** Adopt the pending draft into the working copy. */
  resumeDraft: () => void
  /** Throw the pending draft (or the current one) away. */
  dropDraft: () => Promise<void>
  /** Set while the draft is based on an older revision than the module (§5). */
  staleInfo: StaleInfo | null
  clearStale: () => void
  /** Replace the working copy wholesale (used after a restore). */
  replaceModule: (next: Module, rev: number) => void
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
  initialRev = 0,
  children,
}: {
  initialModule: Module
  moduleId: string
  courseId?: string
  initialRev?: number
  children: ReactNode
}) {
  // Deep clone so edits never mutate the loaded (immutable) module object.
  const [mod, setMod] = useState<Module>(() => structuredClone(initialModule))
  const [dragState, setDragState] = useState<DragState>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  // JSON of the last persisted state; the working copy is "dirty" when it differs.
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(initialModule))
  const [rev, setRev] = useState<number>(initialRev)
  const [lastSavedRev, setLastSavedRev] = useState<number | null>(null)
  const [conflictRev, setConflictRev] = useState<number | null>(null)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle')
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [pendingDraft, setPendingDraft] = useState<ModuleDraft | null>(null)
  const [staleInfo, setStaleInfo] = useState<StaleInfo | null>(null)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Serialised content of the last draft write — the dirty check (spec §3). */
  const lastDraftSent = useRef<string | null>(null)
  /** When the last draft write happened, for the 30 s ceiling while typing. */
  const lastDraftAt = useRef<number>(0)
  /** Live mirror of the working copy, so unload handlers see the current state. */
  const latest = useRef({ mod, rev })

  const dirty = JSON.stringify(mod) !== savedSnapshot

  const draftPayload = (m: Module, baseRev: number) => ({
    baseRev,
    title: m.module.title,
    lang: m.module.lang,
    resources: m.module.resources,
    sections: m.module.sections,
  })

  useEffect(() => {
    latest.current = { mod, rev }
  }, [mod, rev])

  /** One draft write, unless the content is byte-identical to the last one. */
  const writeDraft = useCallback(async (): Promise<boolean> => {
    const { mod: m, rev: baseRev } = latest.current
    const payload = draftPayload(m, baseRev)
    const serialised = JSON.stringify(payload)
    if (serialised === lastDraftSent.current) return true
    setDraftStatus('saving')
    try {
      const res = await saveDraft(moduleId, payload)
      lastDraftSent.current = serialised
      lastDraftAt.current = Date.now()
      setDraftStatus('saved')
      setDraftSavedAt(new Date(res.updatedAt))
      setStaleInfo(res.stale ?? null)
      return true
    } catch {
      // Never claim a save that did not happen — the UI shows the warning state.
      setDraftStatus('error')
      return false
    }
  }, [moduleId])

  // On open: a draft that differs from the committed content is offered, never
  // resurrected silently. The server drops an identical one for us.
  useEffect(() => {
    let alive = true
    loadDraft(moduleId)
      .then((state) => {
        if (!alive) return
        setStaleInfo(state.stale ?? null)
        if (state.draft) setPendingDraft(state.draft)
      })
      .catch(() => {
        // No draft is the normal case; never bother the author with it.
      })
    return () => {
      alive = false
    }
  }, [moduleId])

  // Debounced autosave, with a ceiling so continuous typing still gets written.
  useEffect(() => {
    if (!dirty || pendingDraft) return
    const sinceLast = Date.now() - lastDraftAt.current
    const delay = lastDraftAt.current && sinceLast >= DRAFT_MAX_INTERVAL_MS ? 0 : DRAFT_DEBOUNCE_MS
    if (draftTimer.current) clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => void writeDraft(), delay)
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
    }
  }, [mod, dirty, pendingDraft, writeDraft])

  // Ceiling during uninterrupted typing: the debounce above keeps resetting, so
  // an interval is what actually guarantees a write every 30 s.
  useEffect(() => {
    if (!dirty || pendingDraft) return
    const t = setInterval(() => void writeDraft(), DRAFT_MAX_INTERVAL_MS)
    return () => clearInterval(t)
  }, [dirty, pendingDraft, writeDraft])

  // Tab switch and unload. `keepalive` on unload, because the page is going away
  // and sendBeacon cannot carry the Authorization header.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && dirty && !pendingDraft) void writeDraft()
    }
    const onBeforeUnload = () => {
      if (!dirty || pendingDraft) return
      const { mod: m, rev: baseRev } = latest.current
      const payload = draftPayload(m, baseRev)
      if (JSON.stringify(payload) === lastDraftSent.current) return
      saveDraftOnUnload(moduleId, payload)
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [dirty, pendingDraft, writeDraft, moduleId])

  // The undo bar is a short-lived offer, not a permanent control.
  useEffect(() => {
    if (lastSavedRev === null) return
    const t = setTimeout(() => setLastSavedRev(null), UNDO_WINDOW_MS)
    return () => clearTimeout(t)
  }, [lastSavedRev])

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

    const insertArtifact = (sectionId: string, index: number, artifact: Artifact) =>
      setMod((m) =>
        replaceSectionArtifacts(m, sectionId, (arts) => {
          const next = arts.slice()
          next.splice(Math.max(0, Math.min(index, next.length)), 0, artifact)
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

    const addSection = () =>
      setMod((m) => {
        const id = `sec-${Date.now().toString(36)}`
        return {
          module: {
            ...m.module,
            sections: [...m.module.sections, { id, title: `Abschnitt ${m.module.sections.length + 1}`, artifacts: [] }],
          },
        }
      })

    const renameSection = (sectionId: string, title: string) =>
      setMod((m) => ({
        module: { ...m.module, sections: m.module.sections.map((s) => (s.id === sectionId ? { ...s, title } : s)) },
      }))

    const removeSection = (sectionId: string) =>
      setMod((m) => ({
        module: { ...m.module, sections: m.module.sections.filter((s) => s.id !== sectionId) },
      }))

    const flushDraft = () => writeDraft()

    /**
     * Flush the draft, then commit it. Commit reads the DRAFT on the server, so
     * an unflushed keystroke would otherwise be left out of the revision.
     */
    const save = async (note: string, opts?: { override?: boolean }): Promise<CommitOutcome> => {
      setSaveStatus('saving')
      setSaveError(null)
      setConflictRev(null)
      if (!(await writeDraft())) {
        setSaveStatus('error')
        setSaveError(null)
        return { ok: false, kind: 'error', message: 'draft' }
      }
      try {
        const res = await commitDraft(moduleId, { note, expectedRev: rev, override: opts?.override })
        setSavedSnapshot(JSON.stringify(mod))
        setSaveStatus('saved')
        setRev(res.rev)
        setLastSavedRev(res.rev)
        // The commit deleted the draft server-side; forget our local traces.
        if (draftTimer.current) clearTimeout(draftTimer.current)
        lastDraftSent.current = null
        lastDraftAt.current = 0
        setDraftStatus('idle')
        setDraftSavedAt(null)
        setStaleInfo(null)
        return { ok: true, rev: res.rev }
      } catch (e) {
        setSaveStatus('error')
        const err = e as ApiError
        if (err instanceof ApiError && err.code === 'STALE_DRAFT' && err.stale) {
          setStaleInfo(err.stale)
          return { ok: false, kind: 'stale', stale: err.stale }
        }
        if (err instanceof ApiError && err.code === 'NOTE_REQUIRED') {
          return { ok: false, kind: 'note', message: err.message }
        }
        if (err instanceof ApiError && err.code === 'NO_DRAFT') {
          return { ok: false, kind: 'noDraft' }
        }
        if (err instanceof ApiError && err.code === 'REV_CONFLICT') {
          setConflictRev(err.currentRev ?? null)
        }
        setSaveError((e as Error).message)
        return { ok: false, kind: 'error', message: (e as Error).message }
      }
    }

    const resumeDraft = () => {
      if (!pendingDraft) return
      setMod((m) => ({
        module: {
          ...m.module,
          title: pendingDraft.title ?? m.module.title,
          lang: pendingDraft.lang ?? m.module.lang,
          resources: (pendingDraft.resources ?? m.module.resources) as Module['module']['resources'],
          sections: (pendingDraft.sections ?? m.module.sections) as Module['module']['sections'],
        },
      }))
      // Adopting it makes it the current draft — no need to rewrite it.
      lastDraftSent.current = null
      setPendingDraft(null)
    }

    const dropDraft = async () => {
      if (draftTimer.current) clearTimeout(draftTimer.current)
      setPendingDraft(null)
      setDraftStatus('idle')
      setDraftSavedAt(null)
      setStaleInfo(null)
      lastDraftSent.current = null
      lastDraftAt.current = 0
      try {
        await discardDraft(moduleId)
      } catch {
        // Nothing to discard is fine.
      }
      // Back to the last committed state, exactly.
      setMod(structuredClone(initialModule))
      setSavedSnapshot(JSON.stringify(initialModule))
    }

    const replaceModule = (next: Module, nextRev: number) => {
      const clone = structuredClone(next)
      setMod(clone)
      setSavedSnapshot(JSON.stringify(clone))
      setRev(nextRev)
      setSaveStatus('idle')
      setSaveError(null)
    }

    return {
      mod,
      courseId,
      dirty,
      rev,
      lastSavedRev,
      clearLastSavedRev: () => setLastSavedRev(null),
      conflictRev,
      clearConflict: () => setConflictRev(null),
      draftStatus,
      draftSavedAt,
      flushDraft,
      pendingDraft,
      resumeDraft,
      dropDraft,
      staleInfo,
      clearStale: () => setStaleInfo(null),
      replaceModule,
      updateArtifact,
      deleteArtifact,
      insertNewArtifact,
      insertArtifact,
      moveArtifact,
      addSection,
      renameSection,
      removeSection,
      dragState,
      setDragState,
      save,
      saveStatus,
      saveError,
    }
  }, [
    mod, dragState, moduleId, courseId, saveStatus, saveError, savedSnapshot,
    rev, lastSavedRev, conflictRev, draftStatus, draftSavedAt, pendingDraft, dirty,
    staleInfo, writeDraft, initialModule,
  ])

  return <ModuleEditorContext.Provider value={value}>{children}</ModuleEditorContext.Provider>
}

export function useModuleEditor(): ModuleEditorState {
  const ctx = useContext(ModuleEditorContext)
  if (!ctx) throw new Error('useModuleEditor must be used within a ModuleEditorProvider')
  return ctx
}
