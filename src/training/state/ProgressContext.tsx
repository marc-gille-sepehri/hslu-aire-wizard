import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchUserProgress,
  recordInteraction,
  ProgressRejectedError,
  SeatError,
  type Interaction,
} from '../lib/progressApi'
import { useViewAs } from './ViewAsContext'

interface ProgressContextValue {
  courseId: string
  moduleId: string
  /** Best-effort: record one block's input to the server (fire-and-forget). */
  record: (artifactId: string, interaction: Interaction) => void
  /** Set when the seat gate refuses (no order / no seats). */
  seatError: SeatError | null
  dismissSeatError: () => void
  /**
   * Set when the server refused an interaction outright — a platform defect,
   * not a hiccup. Kept separate from `seatError` because the remedy is
   * different: a seat problem is the learner's organisation, this one is ours.
   */
  saveError: { artifactId: string; message: string; code?: string } | null
  dismissSaveError: () => void
  /** Server-saved interactions for this module, keyed by artifact id. */
  saved: Record<string, unknown>
  /** True once the server progress has been fetched (blocks may restore then). */
  savedLoaded: boolean
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

/**
 * Records learner interactions to the server for one (course × module). Recording
 * is best-effort — the local LearnerState already drives the UI — but a seat-gate
 * refusal (no order / no free seats) is surfaced via `seatError` so the caller can
 * show the access dialog. Absent (no provider) ⇒ `record` is a no-op, so artifacts
 * work unchanged on the course-less preview/edit path.
 */
export function ProgressProvider({
  courseId,
  moduleId,
  children,
}: {
  courseId: string
  moduleId: string
  children: ReactNode
}) {
  const { viewAs } = useViewAs()
  const viewAsEmail = viewAs?.email ?? null
  const [seatError, setSeatError] = useState<SeatError | null>(null)
  const [saveError, setSaveError] = useState<ProgressContextValue['saveError']>(null)
  const [saved, setSaved] = useState<Record<string, unknown>>({})
  const [savedLoaded, setSavedLoaded] = useState(false)

  // Load the (viewed) learner's saved interactions for the module so blocks can
  // restore their input. In Teilnehmeransicht this loads the selected student's
  // work (server-restoring blocks like BPMN / MCP reflect it read-only).
  useEffect(() => {
    let cancelled = false
    setSaved({})
    setSavedLoaded(false)
    fetchUserProgress(viewAsEmail ?? undefined)
      .then((records) => {
        if (cancelled) return
        const rec = records.find((r) => r.courseId === courseId)
        setSaved(rec?.modules?.[moduleId]?.interactions ?? {})
      })
      .catch(() => {
        // Best-effort: on failure blocks just start from their defaults.
      })
      .finally(() => {
        if (!cancelled) setSavedLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [moduleId, courseId, viewAsEmail])

  const record = useCallback(
    (artifactId: string, interaction: Interaction) => {
      // Teilnehmeransicht is read-only: never record as the viewed learner.
      if (viewAsEmail) return
      void recordInteraction({ courseId, moduleId, artifactId, interaction }).catch((e) => {
        if (e instanceof SeatError) {
          setSeatError(e)
        } else if (e instanceof ProgressRejectedError) {
          // Dauerhaft abgelehnt: erneutes Versuchen ändert nichts, und die
          // Person verliert genau die Arbeit, die sie gerade gemacht hat. Das
          // muss sichtbar sein — nicht als Konsolenzeile, die niemand liest.
          console.error(
            `[training] progress rejected for ${artifactId} (${e.code ?? e.status}):`,
            e.message,
            interaction,
          )
          setSaveError({ artifactId, message: e.message, code: e.code })
        } else {
          // Vorübergehend (offline, 5xx): niemanden damit aufhalten.
          console.warn('[training] progress record failed:', (e as Error).message)
        }
      })
    },
    [courseId, moduleId, viewAsEmail],
  )

  const value = useMemo<ProgressContextValue>(
    () => ({
      courseId,
      moduleId,
      record,
      seatError,
      dismissSeatError: () => setSeatError(null),
      saveError,
      dismissSaveError: () => setSaveError(null),
      saved,
      savedLoaded,
    }),
    [courseId, moduleId, record, seatError, saveError, saved, savedLoaded],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

/** Full context (throws if used outside a provider). */
export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider')
  return ctx
}

/**
 * A safe `record` for artifacts: works with or without a provider (no-op when
 * absent, so the course-less edit/preview path keeps working).
 */
export function useRecordInteraction(): (artifactId: string, interaction: Interaction) => void {
  const ctx = useContext(ProgressContext)
  return useCallback(
    (artifactId: string, interaction: Interaction) => ctx?.record(artifactId, interaction),
    [ctx],
  )
}

/**
 * A block's server-saved interaction (or undefined), plus whether the load has
 * settled. Safe without a provider (the course-less preview path): returns
 * `{ interaction: undefined, loaded: true }` so blocks start from their default.
 */
export function useSavedInteraction(artifactId: string): { interaction: unknown; loaded: boolean } {
  const ctx = useContext(ProgressContext)
  if (!ctx) return { interaction: undefined, loaded: true }
  return { interaction: ctx.saved[artifactId], loaded: ctx.savedLoaded }
}
