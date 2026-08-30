import { useEffect, useMemo, useState } from 'react'
import { labels } from '../labels'
import {
  listCustomersWithUsers,
  createOrder,
  updateOrder,
  AdminError,
  type CustomerWithUsers,
  type Order,
} from './adminApi'
import { listCourses, type CourseWithModules } from './coursesApi'

const t = labels.adminOrders

/** Local YYYY-MM-DD (avoids the UTC off-by-one of toISOString near midnight). */
function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function defaultDates(): { start: string; end: string } {
  const start = new Date()
  const end = new Date()
  end.setFullYear(end.getFullYear() + 1)
  return { start: ymd(start), end: ymd(end) }
}

/**
 * Bestellung anlegen oder ändern.
 *
 * Das Neue sind die namentlich gebundenen Plätze. Wer benannt ist, kann den
 * Kurs jederzeit durchführen — auch ausserhalb des Bestellzeitraums —, und sein
 * Platz ist aus dem freien Pool heraus, ob er ihn benutzt oder nicht. Die
 * übrigen Plätze stehen allen Nutzern des Kunden offen.
 *
 * Kunde und Kurs sind beim Ändern gesperrt: sie zu tauschen wäre eine andere
 * Bestellung, und die daran hängenden Fortschritte zeigten ins Leere.
 */
export default function OrderDialog({
  order,
  onClose,
  onCreated,
}: {
  /** Gesetzt: ändern. Leer: neu anlegen. */
  order?: Order | null
  onClose: () => void
  onCreated: () => void
}) {
  const editing = Boolean(order)

  const [customers, setCustomers] = useState<CustomerWithUsers[]>([])
  const [customerId, setCustomerId] = useState(order?.customerId ?? '')
  const [courses, setCourses] = useState<CourseWithModules[]>([])
  const [courseId, setCourseId] = useState(order?.courseId ?? '')
  const [seats, setSeats] = useState(String(order?.seats ?? 1))
  const [named, setNamed] = useState<string[]>(order?.namedUsers ?? [])
  const initialDates = defaultDates()
  const [startDate, setStartDate] = useState(order ? order.startDate.slice(0, 10) : initialDates.start)
  const [endDate, setEndDate] = useState(order ? order.endDate.slice(0, 10) : initialDates.end)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Gesetzt, wenn mehr Personen benannt wurden als Plätze da sind. */
  const [seatShortfall, setSeatShortfall] = useState<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    listCustomersWithUsers()
      .then((list) => {
        setCustomers(list)
        if (!editing && list.length > 0) setCustomerId((prev) => prev || list[0].id)
      })
      .catch(() => setCustomers([]))
    listCourses()
      .then((list) => {
        setCourses(list)
        if (!editing && list.length > 0) setCourseId((prev) => prev || list[0].id)
      })
      .catch(() => setCourses([]))
  }, [editing])

  const seatsNum = Number(seats)
  const customer = customers.find((c) => c.id === customerId)
  // Nur aktive Nutzer des bestellenden Kunden — ein Platz gehört diesem Kunden.
  const candidates = useMemo(
    () => (customer?.users ?? []).filter((u) => !u.deactivated),
    [customer],
  )

  // Kundenwechsel beim Anlegen: die bisherige Auswahl gehört zu einer anderen
  // Organisation und wäre serverseitig ohnehin abgelehnt.
  useEffect(() => {
    if (editing) return
    setNamed((prev) => prev.filter((e) => candidates.some((u) => u.email === e)))
  }, [customerId, candidates, editing])

  const toggle = (email: string) =>
    setNamed((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]))

  const overBooked = Number.isInteger(seatsNum) && named.length > seatsNum
  const canSubmit = !!(
    courseId &&
    customerId &&
    Number.isInteger(seatsNum) &&
    seatsNum >= 1 &&
    startDate &&
    endDate &&
    endDate >= startDate &&
    !overBooked
  )

  const submit = async () => {
    setError(null)
    setSeatShortfall(null)
    if (!canSubmit) return
    setBusy(true)
    try {
      if (order) {
        await updateOrder(order.id, { startDate, endDate, seats: seatsNum, namedUsers: named })
      } else {
        await createOrder({ courseId, customerId, startDate, endDate, seats: seatsNum, namedUsers: named })
      }
      onCreated()
    } catch (e) {
      const ae = e as AdminError
      // Der Server rechnet dasselbe nach. Kommt er auf zu wenige Plätze, bietet
      // der Dialog das Aufstocken an, statt nur zu meckern.
      if (ae.code === 'TOO_MANY_NAMED' && typeof ae.details?.named === 'number') {
        setSeatShortfall(ae.details.named as number)
      }
      setError(ae.message)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30 disabled:bg-cream disabled:text-slate-500'
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500'

  const shortfall = seatShortfall ?? (overBooked ? named.length : null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-20"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">
            {editing ? t.editOrder : t.newOrder}
          </h2>
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
              <p className="text-sm text-amber-700">{t.noCoursesForOrder}</p>
            ) : (
              <select
                className={inputCls}
                value={courseId}
                disabled={editing}
                onChange={(e) => setCourseId(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </label>
          <label className="block">
            <span className={labelCls}>{t.fCustomer}</span>
            {customers.length === 0 ? (
              <p className="text-sm text-amber-700">{t.noCustomers}</p>
            ) : (
              <select
                className={inputCls}
                value={customerId}
                disabled={editing}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </label>
          {editing && <p className="-mt-2 text-xs text-slate-400">{t.lockedHint}</p>}

          <label className="block">
            <span className={labelCls}>{t.fSeats}</span>
            <input
              type="number"
              min={1}
              step={1}
              className={inputCls}
              value={seats}
              onChange={(e) => {
                setSeats(e.target.value)
                setSeatShortfall(null)
              }}
            />
          </label>

          {/* Namentlich gebundene Plätze */}
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className={labelCls}>{t.fNamedUsers}</span>
              <span className={`text-xs ${overBooked ? 'font-semibold text-red-700' : 'text-slate-400'}`}>
                {t.namedCount(named.length, Number.isInteger(seatsNum) ? seatsNum : 0)}
              </span>
            </div>
            <p className="mb-2 text-xs text-slate-500">{t.namedHint}</p>

            {candidates.length === 0 ? (
              <p className="text-sm text-slate-400">{t.noUsersForCustomer}</p>
            ) : (
              <div className="max-h-48 overflow-auto rounded-md border border-mist">
                <ul className="divide-y divide-mist">
                  {candidates.map((u) => (
                    <li key={u.email}>
                      <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-cream">
                        <input
                          type="checkbox"
                          checked={named.includes(u.email)}
                          onChange={() => {
                            toggle(u.email)
                            setSeatShortfall(null)
                          }}
                          className="h-4 w-4 accent-navy"
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-800">
                          {u.firstName} {u.lastName}
                        </span>
                        <span className="shrink-0 truncate text-xs text-slate-500">{u.email}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Statt nur zu meckern: das Aufstocken anbieten. */}
            {shortfall !== null && (
              <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm text-amber-900">{t.tooManyNamed(shortfall, seatsNum || 0)}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSeats(String(shortfall))
                    setSeatShortfall(null)
                    setError(null)
                  }}
                  className="mt-2 rounded-md border-2 border-navy px-3 py-1 text-xs font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
                >
                  {t.raiseSeats(shortfall)}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>{t.fStart}</span>
              <input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>{t.fEnd}</span>
              <input type="date" className={inputCls} min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          <p className="-mt-2 text-xs text-slate-400">{t.datesHint}</p>

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
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (editing ? t.saving : t.creating) : editing ? t.save : t.create}
          </button>
        </div>
      </div>
    </div>
  )
}
