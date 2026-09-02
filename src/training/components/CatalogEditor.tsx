import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  listCourses,
  createCourse,
  deleteCourse,
  updateCourse,
  setCourseModules,
  createModule,
  updateModule,
  cloneCourse,
  setActiveCourseVersion,
  type CourseWithModules,
} from '../admin/coursesApi'
import type { ModuleSummary } from '../lib/moduleApi'
import { labels } from '../labels'

const t = labels.catalogEdit

/**
 * Inline course editor (catalog Bearbeiten mode). Courses are versioned at the
 * course level: versions of one family are grouped under a version dropdown.
 * Admins can add/remove courses, clone a version (deep-copies its modules),
 * activate a version, publish, edit modules and rename courses/modules.
 */
export default function CatalogEditor() {
  const [courses, setCourses] = useState<CourseWithModules[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string>>({}) // familyId -> courseId

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

  const families = useMemo(() => {
    if (!courses) return []
    const map = new Map<string, CourseWithModules[]>()
    for (const c of courses) {
      if (!map.has(c.familyId)) map.set(c.familyId, [])
      map.get(c.familyId)!.push(c)
    }
    return [...map.values()].map((vs) => vs.slice().sort((a, b) => a.version - b.version))
  }, [courses])

  const patch = (id: string, fn: (c: CourseWithModules) => CourseWithModules) =>
    setCourses((cs) => (cs ? cs.map((c) => (c.id === id ? fn(c) : c)) : cs))

  const fail = (e: unknown) => {
    console.warn('[training] catalog edit failed:', (e as Error).message)
    setError((e as Error).message || t.saveError)
    void reload()
  }

  const selectedIdFor = (fam: CourseWithModules[]) => {
    const famId = fam[0].familyId
    const sel = selected[famId]
    if (sel && fam.some((v) => v.id === sel)) return sel
    return (fam.find((v) => v.active) ?? fam[fam.length - 1]).id
  }

  const addCourse = async () => {
    try {
      const course = await createCourse({ title: t.newCourseTitle })
      setCourses((cs) => [...(cs ?? []), course])
    } catch (e) {
      fail(e)
    }
  }

  const removeCourse = async (course: CourseWithModules) => {
    if (!window.confirm(t.deleteVersionConfirm(course.title || '—', course.version))) return
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

  const describeCourse = (id: string, description: string) => {
    patch(id, (c) => ({ ...c, description }))
    updateCourse(id, { description }).catch(fail)
  }

  const togglePublished = (id: string, published: boolean) => {
    patch(id, (c) => ({ ...c, published }))
    updateCourse(id, { published }).catch(fail)
  }

  const toggleRequiresInstance = (id: string, requiresInstance: boolean) => {
    patch(id, (c) => ({ ...c, requiresInstance }))
    updateCourse(id, { requiresInstance }).catch(fail)
  }

  /** Preisangaben. Eingabe in Franken, gespeichert wird in Rappen. */
  const setPricing = (
    id: string,
    p: { pricingModel?: 'per_seat' | 'flat'; pricePerSeat?: string; flatPrice?: string; maxSeats?: string },
  ) => {
    const blank = (v?: string) => (v === undefined ? undefined : v.trim() === '' ? null : v.trim())
    updateCourse(id, {
      pricingModel: p.pricingModel,
      pricePerSeat: blank(p.pricePerSeat),
      flatPrice: blank(p.flatPrice),
      maxSeats: blank(p.maxSeats),
    })
      .then((c) => patch(id, () => c))
      .catch(fail)
  }

  const activate = async (courseId: string, familyId: string) => {
    setCourses((cs) => (cs ? cs.map((c) => (c.familyId === familyId ? { ...c, active: c.id === courseId } : c)) : cs))
    try {
      await setActiveCourseVersion(courseId)
    } catch (e) {
      fail(e)
    }
  }

  const clone = async (courseId: string) => {
    try {
      const nv = await cloneCourse(courseId)
      setCourses((cs) => [...(cs ?? []), nv])
      setSelected((s) => ({ ...s, [nv.familyId]: nv.id }))
    } catch (e) {
      fail(e)
    }
  }

  const addModule = async (courseId: string) => {
    try {
      const { id } = await createModule({ title: t.newModuleTitle })
      const course = courses?.find((c) => c.id === courseId)
      const updated = await setCourseModules(courseId, [...(course?.modules.map((m) => m.id) ?? []), id])
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

  // module ids are unique per course version (clones deep-copy), so only one course holds it.
  const patchModule = (moduleId: string, up: (m: ModuleSummary) => ModuleSummary) =>
    patch(
      courses?.find((c) => c.modules.some((m) => m.id === moduleId))?.id ?? '',
      (c) => ({ ...c, modules: c.modules.map((m) => (m.id === moduleId ? up(m) : m)) }),
    )

  const renameMod = (moduleId: string, title: string) => {
    patchModule(moduleId, (m) => ({ ...m, title }))
    updateModule(moduleId, { title }).catch(fail)
  }

  const describeMod = (moduleId: string, description: string) => {
    patchModule(moduleId, (m) => ({ ...m, description }))
    updateModule(moduleId, { description }).catch(fail)
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

      {families.map((fam) => {
        const selId = selectedIdFor(fam)
        const course = fam.find((v) => v.id === selId)!
        return (
          <FamilyCard
            key={fam[0].familyId}
            family={fam}
            course={course}
            onSelectVersion={(id) => setSelected((s) => ({ ...s, [fam[0].familyId]: id }))}
            onClone={() => clone(course.id)}
            onActivate={() => activate(course.id, course.familyId)}
            onRenameCourse={(title) => renameCourse(course.id, title)}
            onDescribeCourse={(desc) => describeCourse(course.id, desc)}
            onTogglePublished={(p) => togglePublished(course.id, p)}
            onToggleRequiresInstance={(r) => toggleRequiresInstance(course.id, r)}
            onSetPricing={(p) => setPricing(course.id, p)}
            onDeleteCourse={() => removeCourse(course)}
            onAddModule={() => addModule(course.id)}
            onRemoveModule={(mid) => removeModule(course.id, mid)}
            onReorder={(ids) => reorderModules(course.id, ids)}
            onRenameModule={renameMod}
            onDescribeModule={describeMod}
          />
        )
      })}

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

function FamilyCard({
  family,
  course,
  onSelectVersion,
  onClone,
  onActivate,
  onRenameCourse,
  onDescribeCourse,
  onTogglePublished,
  onToggleRequiresInstance,
  onSetPricing,
  onDeleteCourse,
  onAddModule,
  onRemoveModule,
  onReorder,
  onRenameModule,
  onDescribeModule,
}: {
  family: CourseWithModules[]
  course: CourseWithModules
  onSelectVersion: (id: string) => void
  onClone: () => void
  onActivate: () => void
  onRenameCourse: (title: string) => void
  onDescribeCourse: (description: string) => void
  onTogglePublished: (published: boolean) => void
  onToggleRequiresInstance: (requiresInstance: boolean) => void
  /** Preisangaben in Franken; leer löscht den jeweiligen Wert. */
  onSetPricing: (p: {
    pricingModel?: 'per_seat' | 'flat'
    pricePerSeat?: string
    flatPrice?: string
    maxSeats?: string
  }) => void
  onDeleteCourse: () => void
  onAddModule: () => void
  onRemoveModule: (moduleId: string) => void
  onReorder: (orderedIds: string[]) => void
  onRenameModule: (moduleId: string, title: string) => void
  onDescribeModule: (moduleId: string, description: string) => void
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
      {/* Version bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-mist pb-3">
        {family.length > 1 ? (
          <select
            value={course.id}
            onChange={(e) => onSelectVersion(e.target.value)}
            className="rounded-md border border-mist bg-white px-2 py-1.5 text-sm font-medium text-navy"
          >
            {family.map((v) => (
              <option key={v.id} value={v.id}>
                {t.version(v.version)}
                {v.active ? ` · ${t.activeTag}` : v.published ? '' : ` · ${t.draftTag}`}
              </option>
            ))}
          </select>
        ) : (
          <span className="rounded-md bg-cream px-2 py-1.5 text-sm font-medium text-navy">{t.version(course.version)}</span>
        )}

        {course.active ? (
          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{t.isActive}</span>
        ) : (
          <button
            type="button"
            onClick={onActivate}
            className="rounded-md border border-navy/40 px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            {t.setActive}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-mist px-2 py-1 text-xs font-medium text-navy" title={t.publishedHint}>
            <input type="checkbox" checked={course.published} onChange={(e) => onTogglePublished(e.target.checked)} className="h-4 w-4 accent-navy" />
            {t.published}
          </label>
          <label
            className="flex cursor-pointer items-center gap-1.5 rounded-md border border-mist px-2 py-1 text-xs font-medium text-navy"
            title={t.requiresInstanceHint}
          >
            <input
              type="checkbox"
              checked={course.requiresInstance}
              onChange={(e) => onToggleRequiresInstance(e.target.checked)}
              className="h-4 w-4 accent-navy"
            />
            {t.requiresInstance}
          </label>
          {/* Bepreisung. Leer heisst: dieser Kurs wird nicht fakturiert — eine
              Bestellung entsteht dann ohne Rechnung. */}
          <span
            className="flex items-center gap-1.5 rounded-md border border-mist px-2 py-1 text-xs font-medium text-navy"
            title={t.priceHint}
          >
            <select
              value={course.pricingModel ?? 'per_seat'}
              onChange={(e) => onSetPricing({ pricingModel: e.target.value as 'per_seat' | 'flat' })}
              className="rounded border border-mist bg-white px-1 py-0.5 text-xs text-navy outline-none focus:border-navy"
              style={{ borderStyle: 'solid' }}
            >
              <option value="per_seat">{t.pricePerSeatModel}</option>
              <option value="flat">{t.priceFlatModel}</option>
            </select>
            <span className="text-slate-500">CHF</span>
            {(course.pricingModel ?? 'per_seat') === 'per_seat' ? (
              <input
                type="number"
                min={0}
                step="0.05"
                defaultValue={
                  course.pricePerSeatRappen != null ? (course.pricePerSeatRappen / 100).toFixed(2) : ''
                }
                onBlur={(e) => onSetPricing({ pricePerSeat: e.target.value })}
                placeholder={t.pricePlaceholder}
                className="w-24 rounded border border-mist bg-white px-1.5 py-0.5 text-right text-xs text-navy outline-none focus:border-navy"
                style={{ borderStyle: 'solid' }}
              />
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  step="0.05"
                  defaultValue={
                    course.flatPriceRappen != null ? (course.flatPriceRappen / 100).toFixed(2) : ''
                  }
                  onBlur={(e) => onSetPricing({ flatPrice: e.target.value })}
                  placeholder={t.pricePlaceholder}
                  className="w-24 rounded border border-mist bg-white px-1.5 py-0.5 text-right text-xs text-navy outline-none focus:border-navy"
                  style={{ borderStyle: 'solid' }}
                />
                <span className="text-slate-500">{t.upToSeats}</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  defaultValue={course.maxSeats ?? ''}
                  onBlur={(e) => onSetPricing({ maxSeats: e.target.value })}
                  placeholder="—"
                  className="w-16 rounded border border-mist bg-white px-1.5 py-0.5 text-right text-xs text-navy outline-none focus:border-navy"
                  style={{ borderStyle: 'solid' }}
                />
              </>
            )}
            <span className="text-slate-500">
              {(course.pricingModel ?? 'per_seat') === 'per_seat' ? t.perSeat : t.seatsLabel}
            </span>
          </span>
          <button
            type="button"
            onClick={onClone}
            title={t.clone}
            className="rounded-md border border-mist px-2.5 py-1 text-xs font-semibold text-navy transition-colors hover:border-navy hover:bg-cream"
          >
            {t.clone}
          </button>
          <button
            type="button"
            onClick={onDeleteCourse}
            title={t.deleteVersion}
            aria-label={t.deleteVersion}
            className="rounded-md border border-mist p-1.5 text-slate-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Selected version content */}
      <DebouncedInput
        value={course.title}
        onCommit={onRenameCourse}
        placeholder={t.courseTitlePlaceholder}
        className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-lg font-semibold text-navy outline-none hover:border-mist focus:border-navy focus:bg-white"
      />
      <DebouncedInput
        multiline
        allowEmpty
        value={course.description ?? ''}
        onCommit={onDescribeCourse}
        placeholder={t.courseDescPlaceholder}
        className="mt-1 w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-slate-600 outline-none hover:border-mist focus:border-navy focus:bg-white"
      />

      <ul className="mt-3 space-y-2 list-none">
        {course.modules.length === 0 && <li className="px-2 text-sm text-slate-400">{t.noModules}</li>}
        {course.modules.map((m) => (
          <li
            key={m.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(m.id)}
            className={`flex items-start gap-2 rounded-md border border-mist bg-cream/40 px-2 py-1.5 ${dragId === m.id ? 'opacity-50' : ''}`}
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
              className="mt-1.5 shrink-0 cursor-grab px-1 text-slate-400 active:cursor-grabbing"
            >
              <GripIcon />
            </span>
            <div className="min-w-0 flex-1">
              <DebouncedInput
                value={m.title}
                onCommit={(title) => onRenameModule(m.id, title)}
                placeholder={t.moduleTitlePlaceholder}
                className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium text-navy outline-none hover:border-mist focus:border-navy focus:bg-white"
              />
              <DebouncedInput
                multiline
                allowEmpty
                value={m.description ?? ''}
                onCommit={(desc) => onDescribeModule(m.id, desc)}
                placeholder={t.moduleDescPlaceholder}
                className="w-full resize-y rounded-md border border-transparent bg-transparent px-2 py-1 text-xs text-slate-500 outline-none hover:border-mist focus:border-navy focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => onRemoveModule(m.id)}
              title={t.removeModule}
              aria-label={t.removeModule}
              className="mt-1 shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700"
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

/**
 * Text input/textarea that commits (debounced) on change and immediately on blur.
 * `allowEmpty` lets a value be cleared (for optional fields like descriptions);
 * otherwise an empty value is ignored (titles must stay non-empty).
 */
function DebouncedInput({
  value,
  onCommit,
  placeholder,
  className,
  multiline = false,
  allowEmpty = false,
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
  allowEmpty?: boolean
}) {
  const [text, setText] = useState(value)
  const timer = useRef<number | null>(null)
  useEffect(() => {
    setText(value)
  }, [value])
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const commit = (v: string) => {
    const trimmed = v.trim()
    if (trimmed === value.trim()) return
    if (!trimmed && !allowEmpty) return
    onCommit(trimmed)
  }

  const onChange = (v: string) => {
    setText(v)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(v), 700)
  }
  const onBlur = () => {
    if (timer.current) window.clearTimeout(timer.current)
    commit(text)
  }

  if (multiline) {
    return (
      <textarea
        value={text}
        placeholder={placeholder}
        className={className}
        rows={2}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    )
  }
  return (
    <input
      value={text}
      placeholder={placeholder}
      className={className}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
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
