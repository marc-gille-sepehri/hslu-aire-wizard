import { useEffect, useMemo, useRef, useState } from 'react'
import { labels } from '../labels'
import {
  listUsers,
  createCourseInstance,
  updateCourseInstance,
  type AdminUser,
  type CourseInstance,
} from './adminApi'
import { listCourses, type CourseWithModules } from './coursesApi'

const t = labels.adminInstances

/** Local YYYY-MM-DD (avoids the UTC off-by-one of toISOString near midnight). */
function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * Create or edit a course instance: pick course, participants, trainers and a
 * start date. Pass `instance` to edit an existing one (fields are prefilled);
 * omit it to create a new one.
 */
export default function InstanceDialog({
  instance,
  onClose,
  onSaved,
}: {
  instance?: CourseInstance | null
  onClose: () => void
  onSaved: () => void
}) {
  const editing = !!instance
  const [courses, setCourses] = useState<CourseWithModules[]>([])
  const [courseId, setCourseId] = useState(instance?.courseId ?? '')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [participants, setParticipants] = useState<string[]>(instance?.participants.map((p) => p.email) ?? [])
  const [trainers, setTrainers] = useState<string[]>(instance?.trainers.map((p) => p.email) ?? [])
  const [startDate, setStartDate] = useState(instance ? ymd(new Date(instance.startDate)) : ymd(new Date()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    listCourses()
      .then((list) => {
        // Nur begleitete Kurse. Der Server weist alles andere ohnehin ab; sie
        // hier anzubieten hiesse, den Fehler erst beim Speichern zu zeigen.
        // Ein bereits bearbeiteter Kurs bleibt in der Liste, auch wenn das
        // Kennzeichen inzwischen entfernt wurde — sonst verschwindet er beim
        // Öffnen wortlos aus seiner eigenen Durchführung.
        const eligible = list.filter((c) => c.requiresInstance || c.id === instance?.courseId)
        setCourses(eligible)
        if (!editing && eligible.length > 0) setCourseId(eligible[0].id)
      })
      .catch(() => setCourses([]))
    listUsers(false)
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [])

  const canSubmit = !!(courseId && startDate)

  const submit = async () => {
    setError(null)
    if (!canSubmit) return
    setBusy(true)
    try {
      const payload = {
        courseId,
        participantEmails: participants,
        trainerEmails: trainers,
        startDate,
      }
      if (instance) {
        await updateCourseInstance(instance.id, payload)
      } else {
        await createCourseInstance(payload)
      }
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30'
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-28"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">{editing ? t.editInstance : t.newInstance}</h2>
          <button type="button" onClick={onClose} aria-label={t.cancel} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className={labelCls}>{t.fCourse}</span>
            {courses.length === 0 ? (
              <p className="text-sm text-amber-700">{t.noCourses}</p>
            ) : (
              <select className={inputCls} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {t.version(c.version)}
                  </option>
                ))}
              </select>
            )}
          </label>

          <div>
            <span className={labelCls}>{t.fTrainers}</span>
            <UserMultiSelect users={users} selected={trainers} onChange={setTrainers} />
          </div>

          <div>
            <span className={labelCls}>{t.fParticipants}</span>
            <UserMultiSelect users={users} selected={participants} onChange={setParticipants} />
          </div>

          <label className="block">
            <span className={labelCls}>{t.fStart}</span>
            <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !canSubmit}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? (editing ? t.saving : t.creating) : editing ? t.save : t.create}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Multi-select over existing users with live text filtering. Selected users show
 * as removable chips; typing filters the dropdown by name or email. Values are
 * user emails (the stable user key).
 */
function UserMultiSelect({
  users,
  selected,
  onChange,
}: {
  users: AdminUser[]
  selected: string[]
  onChange: (emails: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const nameByEmail = useMemo(
    () => new Map(users.map((u) => [u.email, `${u.firstName} ${u.lastName}`.trim()])),
    [users],
  )

  // Close the dropdown on an outside click.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selectedSet = new Set(selected)
  const q = query.trim().toLowerCase()
  const matches = users.filter((u) => {
    if (selectedSet.has(u.email)) return false
    if (!q) return true
    return u.email.toLowerCase().includes(q) || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
  })

  const add = (email: string) => {
    onChange([...selected, email])
    setQuery('')
    setOpen(true)
  }
  const remove = (email: string) => onChange(selected.filter((e) => e !== email))

  return (
    <div ref={boxRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-mist bg-white px-2 py-1.5 focus-within:border-navy focus-within:ring-4 focus-within:ring-gold/30">
        {selected.map((email) => (
          <span key={email} className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-navy">
            {nameByEmail.get(email) ?? email}
            <button
              type="button"
              onClick={() => remove(email)}
              aria-label="Entfernen"
              className="text-slate-400 hover:text-red-700"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? t.searchPlaceholder : ''}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-slate-800 outline-none"
        />
      </div>

      {open && (
        <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-mist bg-white py-1 shadow-lg">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-400">{t.noMatches}</li>
          ) : (
            matches.map((u) => (
              <li key={u.email}>
                <button
                  type="button"
                  onClick={() => add(u.email)}
                  className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-cream"
                >
                  <span className="text-sm font-medium text-navy">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="text-xs text-slate-500">{u.email}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
