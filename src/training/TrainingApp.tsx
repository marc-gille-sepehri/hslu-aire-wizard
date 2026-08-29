import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import './styles.css'
import { labels } from './labels'
import { validateModule, type ValidationFailure } from './schema/validate'
import type { Module } from './schema/types'
import SchemaError from './components/SchemaError'
import ModuleView from './components/ModuleView'
import Catalog from './components/Catalog'
import SeatErrorDialog from './components/SeatErrorDialog'
import SaveErrorBanner from './components/SaveErrorBanner'
import { ProgressProvider } from './state/ProgressContext'
import { useAuth } from './auth/AuthContext'
import LoginGate from './auth/LoginGate'
import { EditModeProvider, useEditMode } from './editor/EditModeContext'
import { ViewAsProvider, useViewAs } from './state/ViewAsContext'
import { fetchModule, type ModuleMeta } from './lib/moduleApi'
import ChatWidget from './chat/ChatWidget'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid'; failures: ValidationFailure[] }
  | { kind: 'ready'; selectedId: string; mod: Module; meta: ModuleMeta }

/**
 * Overrides let the URL contract (/courses/…) drive this component instead of
 * the legacy /training/* params. Nothing else changes: the same module view,
 * the same progress and seat handling.
 */
export interface TrainingAppProps {
  courseIdOverride?: string
  moduleIdOverride?: string
  sectionIdOverride?: string
}

export default function TrainingApp(props: TrainingAppProps = {}) {
  // AuthProvider is mounted app-wide in main.jsx.
  return (
    <EditModeProvider>
      <TrainingGate {...props} />
    </EditModeProvider>
  )
}

/** Show the login screen until a valid session exists; then the training UI. */
function TrainingGate(props: TrainingAppProps) {
  const { status } = useAuth()

  if (status === 'checking') {
    return (
      <div className="training-root font-sans">
        <div className="max-w-prose mx-auto px-4 py-10 text-slate-500">{labels.auth.checking}</div>
      </div>
    )
  }

  if (status === 'anonymous') {
    return (
      <div className="training-root font-sans">
        <LoginGate />
      </div>
    )
  }

  return (
    <ViewAsProvider>
      <TrainingHeader />
      <ViewAsBanner />
      <TrainingContent {...props} />
      <ChatWidget />
    </ViewAsProvider>
  )
}

/** Sticky notice while an admin views another learner's progress (read-only). */
function ViewAsBanner() {
  const { viewAs, setViewAs } = useViewAs()
  if (!viewAs) return null
  return (
    <div className="training-root font-sans">
      <div className="border-b border-gold-dark/40 bg-gold/90">
        <div className="max-w-prose mx-auto flex items-center justify-between gap-3 px-4 py-2 text-sm text-navy">
          <span className="min-w-0 truncate font-semibold">
            👁 {labels.viewAs.banner(viewAs.label)} · <span className="font-normal">{labels.viewAs.readOnly}</span>
          </span>
          <button
            type="button"
            onClick={() => setViewAs(null)}
            className="shrink-0 rounded-md border border-navy/40 px-3 py-1 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            {labels.viewAs.exit}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Slim bar above the training content holding the admin edit toggle.
    Name + logout now live in the main site header. */
function TrainingHeader() {
  const { isAdmin, editing, toggleEditing } = useEditMode()
  if (!isAdmin) return null
  return (
    <div className="training-root font-sans border-b border-mist bg-cream">
      <div className="max-w-prose mx-auto px-4 py-3 flex items-center justify-end gap-4">
        {/* Module editors portal their Save controls in here, next to Fertig. */}
        <div id="training-edit-toolbar" className="flex items-center gap-3" />
        <button
          type="button"
          onClick={toggleEditing}
          aria-pressed={editing}
          className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
            editing
              ? 'bg-gold text-navy hover:bg-gold-dark'
              : 'border-2 border-navy text-navy hover:bg-navy hover:text-white'
          }`}
        >
          {editing ? labels.editor.exitEditMode : labels.editor.enterEditMode}
        </button>
      </div>
    </div>
  )
}

function TrainingContent({ courseIdOverride, moduleIdOverride, sectionIdOverride }: TrainingAppProps) {
  // `/training` → catalog (offering); `/training/:courseId/:moduleId` → a module
  // with seat-consuming progress; `/training/:moduleId` → course-less preview.
  // The /courses/… contract passes the same three values in as props instead.
  const params = useParams<{ courseId?: string; moduleId?: string }>()
  const courseId = courseIdOverride ?? params.courseId
  const moduleId = moduleIdOverride ?? params.moduleId
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    if (!moduleId) return
    let cancelled = false
    setLoad({ kind: 'loading' })
    ;(async () => {
      try {
        const payload = await fetchModule(moduleId)
        const validated = validateModule({ module: payload.module })
        if (!validated.ok) {
          if (!cancelled) setLoad({ kind: 'invalid', failures: validated.failures })
          return
        }
        if (!cancelled)
          setLoad({ kind: 'ready', selectedId: moduleId, mod: validated.module, meta: payload.meta })
      } catch (e) {
        if (!cancelled) setLoad({ kind: 'error', message: (e as Error).message || labels.loadError })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [moduleId])

  // No module chosen → the offering (all courses × modules).
  if (!moduleId) {
    return (
      <div className="training-root font-sans">
        <Catalog />
      </div>
    )
  }

  if (load.kind === 'loading') {
    return (
      <div className="training-root font-sans">
        <div className="max-w-prose mx-auto px-4 py-10 text-slate-500">{labels.loading}</div>
      </div>
    )
  }
  if (load.kind === 'error') {
    return (
      <div className="training-root font-sans">
        <div className="max-w-prose mx-auto px-4 py-10">
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">{load.message}</div>
        </div>
      </div>
    )
  }
  if (load.kind === 'invalid') {
    return (
      <div className="training-root font-sans">
        <SchemaError failures={load.failures} />
      </div>
    )
  }

  // key on the module id: switching modules resets the editor working copy
  const view = (
    <ModuleView
      key={load.selectedId}
      module={load.mod}
      moduleId={load.selectedId}
      courseId={courseId}
      initialRev={load.meta.rev}
      sectionId={sectionIdOverride}
      addressable={!!courseIdOverride}
    />
  )

  // With a course, record interactions (and consume a seat) + show the seat gate.
  // Without one (legacy preview/edit), render the module as before.
  return (
    <div className="training-root font-sans">
      {courseId ? (
        <ProgressProvider courseId={courseId} moduleId={load.selectedId}>
          <div className="max-w-prose mx-auto px-4 pt-6 -mb-6">
            <Link to="/training" className="text-sm text-slate-500 hover:text-slate-800">
              {labels.catalog.backToCatalog}
            </Link>
          </div>
          {view}
          <SeatErrorDialog />
          <SaveErrorBanner />
        </ProgressProvider>
      ) : (
        view
      )}
    </div>
  )
}
