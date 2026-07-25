import { useEffect, useRef, useState, type DragEvent } from 'react'
import {
  listCourses,
  createCourse,
  deleteCourse,
  updateCourse,
  setCourseModules,
  createModule,
  renameModule,
  type CourseWithModules,
} from '../admin/coursesApi'
import type { ModuleSummary } from '../lib/moduleApi'
import { labels } from '../labels'

const t = labels.catalogEdit

/**
 * Inline course/module editor shown in the catalog's Bearbeiten mode. Admins can
 * add/remove courses, add/remove/reorder modules within a course (drag handles),
 * and rename courses and modules via editable inputs.
 */
export default function CatalogEditor() {
  const [courses, setCourses] = useState<CourseWithModules[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = async () => {
    try {
      setCourses(await listCourses())
      setError(null)
    } catch (e) {
      setError((e as Error).message || t.loadError)
    }
  }
  useEffect(() => {
    void reload()
  }, [])

  const patch = (id: string, fn: (c: CourseWithModules) => CourseWithModules) =>
    setCourses((cs) => (cs ? cs.map((c) => (c.id === id ? fn(c) : c)) : cs))

  const fail = (e: unknown) => {
    console.warn('[training] catalog edit failed:', (e as Error).message)
    setError((e as Error).message || t.saveError)
    void reload()
  }

  const addCourse = async () => {
    try {
      const course = await createCourse({ title: t.newCourseTitle })
      setCourses((cs) => (cs ? [...cs, course] : [course]))
    } catch (e) {
      fail(e)
    }
  }

  const removeCourse = async (course: CourseWithModules) => {
    if (!window.confirm(t.deleteCourseConfirm(course.title || '—'))) return
    setCourses((cs) => (cs ? cs.filter((c) => c.id !== course.id) : cs))
    try {
      await deleteCourse(course.id)
    } catch (e) {
      fail(e)
    }
  }

  const renameCourse = (id: string, title: string) => {
    patch(id, (c) => ({ ...c, title }))
    updateCourse(id, { title }).catch(fail)
  }

  const togglePublished = (id: string, published: boolean) => {
    patch(id, (c) => ({ ...c, published }))
    updateCourse(id, { published }).catch(fail)
  }

  const addModule = async (courseId: string) => {
    try {
      const { id } = await createModule({ title: t.newModuleTitle })
      const course = courses?.find((c) => c.id === courseId)
      const ids = [...(course?.modules.map((m) => m.id) ?? []), id]
      const updated = await setCourseModules(courseId, ids)
      patch(courseId, () => updated)
    } catch (e) {
      fail(e)
    }
  }

  const removeModule = (courseId: string, moduleId: string) => {
    const course = courses?.find((c) => c.id === courseId)
    if (!course) return
    const nextMods = course.modules.filter((m) => m.id !== moduleId)
    patch(courseId, (c) => ({ ...c, modules: nextMods }))
    setCourseModules(courseId, nextMods.map((m) => m.id)).catch(fail)
  }

  const reorderModules = (courseId: string, orderedIds: string[]) => {
    const course = courses?.find((c) => c.id === courseId)
    if (!course) return
    const byId = new Map(course.modules.map((m) => [m.id, m]))
    const nextMods = orderedIds.map((id) => byId.get(id)).filter((m): m is ModuleSummary => !!m)
    patch(courseId, (c) => ({ ...c, modules: nextMods }))
    setCourseModules(courseId, orderedIds).catch(fail)
  }

  const renameMod = (moduleId: string, title: string) => {
    // A module can appear in several courses — reflect the rename everywhere.
    setCourses((cs) =>
      cs
        ? cs.map((c) => ({ ...c, modules: c.modules.map((m) => (m.id === moduleId ? { ...m, title } : m)) }))
        : cs,
    )
    renameModule(moduleId, title).catch(fail)
  }

  if (error && !courses) {
    return <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
  }
  if (!courses) {
    return <p className="text-slate-500">{labels.loading}</p>
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onRenameCourse={(title) => renameCourse(course.id, title)}
          onTogglePublished={(p) => togglePublished(course.id, p)}
          onDeleteCourse={() => removeCourse(course)}
          onAddModule={() => addModule(course.id)}
          onRemoveModule={(mid) => removeModule(course.id, mid)}
          onReorder={(ids) => reorderModules(course.id, ids)}
          onRenameModule={renameMod}
        />
      ))}

      <button
        type="button"
        onClick={addCourse}
        className="rounded-md border-2 border-dashed border-mist px-4 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy hover:bg-cream"
      >
        + {t.addCourse}
      </button>
    </div>
  )
}

function CourseCard({
  course,
  onRenameCourse,
  onTogglePublished,
  onDeleteCourse,
  onAddModule,
  onRemoveModule,
  onReorder,
  onRenameModule,
}: {
  course: CourseWithModules
  onRenameCourse: (title: string) => void
  onTogglePublished: (published: boolean) => void
  onDeleteCourse: () => void
  onAddModule: () => void
  onRemoveModule: (moduleId: string) => void
  onReorder: (orderedIds: string[]) => void
  onRenameModule: (moduleId: string, title: string) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    const ids = course.modules.map((m) => m.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    onReorder(ids)
    setDragId(null)
  }

  return (
    <section className="rounded-xl border border-mist bg-white p-4">
      <div className="flex items-center gap-2">
        <DebouncedInput
          value={course.title}
          onCommit={onRenameCourse}
          placeholder={t.courseTitlePlaceholder}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-lg font-semibold text-navy outline-none hover:border-mist focus:border-navy focus:bg-white"
        />
        <label
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-mist px-2 py-1.5 text-xs font-medium text-navy"
          title={t.publishedHint}
        >
          <input
            type="checkbox"
            checked={course.published}
            onChange={(e) => onTogglePublished(e.target.checked)}
            className="h-4 w-4 accent-navy"
          />
          {t.published}
        </label>
        <button
          type="button"
          onClick={onDeleteCourse}
          title={t.deleteCourse}
          aria-label={t.deleteCourse}
          className="shrink-0 rounded-md border border-mist p-1.5 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
        >
          <TrashIcon />
        </button>
      </div>

      <ul className="mt-3 space-y-2 list-none">
        {course.modules.length === 0 && <li className="px-2 text-sm text-slate-400">{t.noModules}</li>}
        {course.modules.map((m) => (
          <li
            key={m.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(m.id)}
            className={`flex items-center gap-2 rounded-md border border-mist bg-cream/40 px-2 py-1.5 ${
              dragId === m.id ? 'opacity-50' : ''
            }`}
          >
            <span
              draggable
              onDragStart={(e: DragEvent) => {
                setDragId(m.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', m.id)
              }}
              onDragEnd={() => setDragId(null)}
              title={t.dragToReorder}
              aria-label={t.dragToReorder}
              className="shrink-0 cursor-grab px-1 text-slate-400 active:cursor-grabbing"
            >
              <GripIcon />
            </span>
            <DebouncedInput
              value={m.title}
              onCommit={(title) => onRenameModule(m.id, title)}
              placeholder={t.moduleTitlePlaceholder}
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-navy outline-none hover:border-mist focus:border-navy focus:bg-white"
            />
            <button
              type="button"
              onClick={() => onRemoveModule(m.id)}
              title={t.removeModule}
              aria-label={t.removeModule}
              className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAddModule}
        className="mt-3 rounded-md border border-dashed border-mist px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-navy hover:bg-cream"
      >
        + {t.addModule}
      </button>
    </section>
  )
}

/** Text input that commits (debounced) on change and immediately on blur. */
function DebouncedInput({
  value,
  onCommit,
  placeholder,
  className,
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [text, setText] = useState(value)
  const timer = useRef<number | null>(null)
  // Keep in sync if the value changes from outside (e.g. reload) while not focused.
  useEffect(() => {
    setText(value)
  }, [value])
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const commit = (v: string) => {
    const trimmed = v.trim()
    if (trimmed && trimmed !== value.trim()) onCommit(trimmed)
  }

  return (
    <input
      value={text}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        const v = e.target.value
        setText(v)
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => commit(v), 700)
      }}
      onBlur={() => {
        if (timer.current) window.clearTimeout(timer.current)
        commit(text)
      }}
    />
  )
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
