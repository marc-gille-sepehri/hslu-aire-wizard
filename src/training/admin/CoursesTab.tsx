import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { labels } from '../labels'
import type { ModuleSummary } from '../lib/moduleApi'
import {
  listCourses,
  createCourse,
  deleteCourse,
  setCourseModules,
  listModuleFamilies,
  createModule,
  cloneModule,
  type CourseWithModules,
  type ModuleFamily,
} from './coursesApi'
import OrderDialog from './OrderDialog'

const t = labels.adminCourses

/**
 * Shared drag state so drop targets can read what is being dragged.
 * - 'library': a module version dragged out of the module library.
 * - 'reorder': a module row dragged within a single course to reorder it.
 */
type DragState =
  | { kind: 'library'; moduleId: string }
  | { kind: 'reorder'; courseId: string; moduleId: string; index: number }

export default function CoursesTab() {
  const [families, setFamilies] = useState<ModuleFamily[] | null>(null)
  const [courses, setCourses] = useState<CourseWithModules[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  const loadModules = async () => {
    try {
      setFamilies(await listModuleFamilies())
    } catch (e) {
      setError((e as Error).message || t.modulesLoadError)
    }
  }

  const loadCourses = async () => {
    try {
      setCourses(await listCourses())
    } catch (e) {
      setError((e as Error).message || t.coursesLoadError)
    }
  }

  useEffect(() => {
    loadModules()
    loadCourses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ModuleLibrary
          families={families}
          drag={drag}
          setDrag={setDrag}
          onChanged={loadModules}
          onError={setError}
        />
        <CoursesColumn
          courses={courses}
          drag={drag}
          setDrag={setDrag}
          onChanged={loadCourses}
          onError={setError}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Module library (left)
// ---------------------------------------------------------------------------

function ModuleLibrary({
  families,
  setDrag,
  onChanged,
  onError,
}: {
  families: ModuleFamily[] | null
  drag: DragState | null
  setDrag: (d: DragState | null) => void
  onChanged: () => void | Promise<void>
  onError: (msg: string) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [cloningId, setCloningId] = useState<string | null>(null)

  const onClone = async (id: string) => {
    setCloningId(id)
    onError('')
    try {
      await cloneModule(id)
      await onChanged()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setCloningId(null)
    }
  }

  return (
    <section className="rounded-lg border border-mist bg-white">
      <header className="flex items-center justify-between gap-4 rounded-t-lg border-b border-mist bg-cream px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">{t.modulesHeading}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t.modulesSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="shrink-0 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
        >
          + {t.createModule}
        </button>
      </header>

      <div className="space-y-4 p-5">
        {families && families.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">{t.noModules}</p>
        )}
        {families?.map((fam) => (
          <div key={fam.familyId} className="rounded-lg border border-mist">
            <div className="border-b border-mist bg-cream/60 px-4 py-2">
              <h3 className="text-sm font-semibold text-navy">{fam.title}</h3>
            </div>
            <ul className="divide-y divide-mist">
              {fam.versions.map((v) => (
                <li
                  key={v.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData('text/plain', v.id)
                    setDrag({ kind: 'library', moduleId: v.id })
                  }}
                  onDragEnd={() => setDrag(null)}
                  className="flex cursor-grab items-center justify-between gap-3 px-4 py-2.5 active:cursor-grabbing hover:bg-cream/40"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-slate-300" aria-hidden>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                        <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                        <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                      </svg>
                    </span>
                    <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white">
                      v{v.version}
                    </span>
                    {v.current && (
                      <span className="text-xs font-semibold text-emerald-700">({t.versionCurrent})</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      to={`/training/${v.id}`}
                      className="text-xs font-semibold text-navy underline-offset-2 hover:underline"
                    >
                      {t.edit}
                    </Link>
                    <button
                      type="button"
                      onClick={() => onClone(v.id)}
                      disabled={cloningId === v.id}
                      className="rounded-md border-2 border-navy px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-50"
                    >
                      {cloningId === v.id ? t.cloning : t.clone}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {dialogOpen && (
        <TitleDialog
          title={t.createModuleTitle}
          fieldLabel={t.fModuleTitle}
          onClose={() => setDialogOpen(false)}
          onSubmit={async (title) => {
            await createModule({ title })
            setDialogOpen(false)
            await onChanged()
          }}
        />
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Courses (right)
// ---------------------------------------------------------------------------

function CoursesColumn({
  courses,
  drag,
  setDrag,
  onChanged,
  onError,
}: {
  courses: CourseWithModules[] | null
  drag: DragState | null
  setDrag: (d: DragState | null) => void
  onChanged: () => void | Promise<void>
  onError: (msg: string) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <section className="rounded-lg border border-mist bg-white">
      <header className="flex items-center justify-between gap-4 rounded-t-lg border-b border-mist bg-cream px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">{t.coursesHeading}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t.coursesSubtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="shrink-0 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
        >
          + {t.createCourse}
        </button>
      </header>

      <div className="space-y-4 p-5">
        {courses && courses.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">{t.noCourses}</p>
        )}
        {courses?.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            drag={drag}
            setDrag={setDrag}
            onChanged={onChanged}
            onError={onError}
          />
        ))}
      </div>

      {dialogOpen && (
        <CourseDialog
          onClose={() => setDialogOpen(false)}
          onSubmit={async (title, description) => {
            await createCourse({ title, description: description || undefined })
            setDialogOpen(false)
            await onChanged()
          }}
        />
      )}
    </section>
  )
}

function CourseCard({
  course,
  drag,
  setDrag,
  onChanged,
  onError,
}: {
  course: CourseWithModules
  drag: DragState | null
  setDrag: (d: DragState | null) => void
  onChanged: () => void | Promise<void>
  onError: (msg: string) => void
}) {
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)

  const moduleIds = useMemo(() => course.modules.map((m) => m.id), [course.modules])

  // A course card accepts library drags (append a module).
  const acceptsLibraryDrag = drag?.kind === 'library'

  const persist = async (ids: string[]) => {
    setBusy(true)
    onError('')
    try {
      await setCourseModules(course.id, ids)
      await onChanged()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onCardDrop = async (e: DragEvent) => {
    if (drag?.kind !== 'library') return
    e.preventDefault()
    setOver(false)
    const id = drag.moduleId
    setDrag(null)
    if (moduleIds.includes(id)) return
    await persist([...moduleIds, id])
  }

  const onRemove = async (id: string) => {
    await persist(moduleIds.filter((mid) => mid !== id))
  }

  // Reorder within this course: drop a reordered row onto target index.
  const onReorderDrop = async (targetIndex: number) => {
    if (drag?.kind !== 'reorder' || drag.courseId !== course.id) return
    const from = drag.index
    setDrag(null)
    if (from === targetIndex) return
    const next = [...moduleIds]
    const [moved] = next.splice(from, 1)
    next.splice(targetIndex, 0, moved)
    await persist(next)
  }

  const onDelete = async () => {
    if (!window.confirm(t.deleteCourseConfirm)) return
    setBusy(true)
    onError('')
    try {
      await deleteCourse(course.id)
      await onChanged()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onDragOver={(e) => {
        if (!acceptsLibraryDrag) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        if (!over) setOver(true)
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the card entirely.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false)
      }}
      onDrop={onCardDrop}
      className={`rounded-lg border bg-white transition-colors ${
        over && acceptsLibraryDrag ? 'border-gold ring-4 ring-gold/30' : 'border-mist'
      } ${busy ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-mist bg-cream/60 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold text-navy">{course.title}</h3>
          {course.description && <p className="mt-0.5 text-xs text-slate-500">{course.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setOrderOpen(true)}
            className="rounded-md bg-gold px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:bg-gold-dark"
          >
            {labels.adminOrders.order}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            title={t.deleteCourse}
            aria-label={t.deleteCourse}
            className="rounded-md border border-mist px-2 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white disabled:opacity-50"
          >
            {t.deleteCourse}
          </button>
        </div>
      </div>

      {orderOpen && (
        <OrderDialog
          courseId={course.id}
          courseTitle={course.title}
          onClose={() => setOrderOpen(false)}
          onCreated={() => setOrderOpen(false)}
        />
      )}

      <div className="p-4">
        {course.modules.length === 0 ? (
          <p
            className={`rounded-md border border-dashed px-4 py-6 text-center text-sm ${
              over && acceptsLibraryDrag ? 'border-gold text-navy' : 'border-mist-strong text-slate-400'
            }`}
          >
            {over && acceptsLibraryDrag ? t.dropHere : t.emptyCourse}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {course.modules.map((m, index) => (
              <CourseModuleRow
                key={m.id}
                module={m}
                index={index}
                courseId={course.id}
                drag={drag}
                setDrag={setDrag}
                onRemove={() => onRemove(m.id)}
                onReorderDrop={() => onReorderDrop(index)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function CourseModuleRow({
  module,
  index,
  courseId,
  drag,
  setDrag,
  onRemove,
  onReorderDrop,
}: {
  module: ModuleSummary
  index: number
  courseId: string
  drag: DragState | null
  setDrag: (d: DragState | null) => void
  onRemove: () => void
  onReorderDrop: () => void
}) {
  const [over, setOver] = useState(false)
  const isReorderTarget = drag?.kind === 'reorder' && drag.courseId === courseId && drag.index !== index

  return (
    <li
      onDragOver={(e) => {
        if (!isReorderTarget) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        if (!over) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!isReorderTarget) return
        e.preventDefault()
        setOver(false)
        onReorderDrop()
      }}
      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors ${
        over && isReorderTarget ? 'border-gold bg-gold/10' : 'border-mist bg-white'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', module.id)
            setDrag({ kind: 'reorder', courseId, moduleId: module.id, index })
          }}
          onDragEnd={() => setDrag(null)}
          title={t.dragToReorder}
          aria-label={t.dragToReorder}
          className="cursor-grab text-slate-400 hover:text-navy active:cursor-grabbing"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
          </svg>
        </span>
        <span className="truncate text-sm font-medium text-navy">{module.title}</span>
        <span className="shrink-0 rounded-full bg-mist-strong px-2 py-0.5 text-xs font-semibold text-slate-600">
          v{module.version}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        title={t.removeModule}
        aria-label={t.removeModule}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-700 hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30'

function DialogShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-28"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t.cancel} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function TitleDialog({
  title,
  fieldLabel,
  onClose,
  onSubmit,
}: {
  title: string
  fieldLabel: string
  onClose: () => void
  onSubmit: (title: string) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!value.trim()) {
      setError(t.titleRequired)
      return
    }
    setBusy(true)
    try {
      await onSubmit(value.trim())
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <DialogShell title={title} onClose={onClose}>
      <div className="space-y-4 px-6 py-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">{fieldLabel}</span>
          <input
            className={inputCls}
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
          {t.cancel}
        </button>
        <button type="button" onClick={submit} disabled={busy || !value.trim()} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed">
          {busy ? t.creating : t.create}
        </button>
      </div>
    </DialogShell>
  )
}

function CourseDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (title: string, description: string) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!title.trim()) {
      setError(t.titleRequired)
      return
    }
    setBusy(true)
    try {
      await onSubmit(title.trim(), description.trim())
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <DialogShell title={t.createCourseTitle} onClose={onClose}>
      <div className="space-y-4 px-6 py-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">{t.fCourseTitle}</span>
          <input className={inputCls} value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">{t.fCourseDescription}</span>
          <textarea className={`${inputCls} min-h-[80px] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
          {t.cancel}
        </button>
        <button type="button" onClick={submit} disabled={busy || !title.trim()} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed">
          {busy ? t.creating : t.create}
        </button>
      </div>
    </DialogShell>
  )
}
