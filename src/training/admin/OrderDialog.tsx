import { useEffect, useState } from 'react'
import { labels } from '../labels'
import { listCustomers, createOrder, type Customer } from './adminApi'

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

/** Create an order for a given course. Customer, seats and date range are edited here. */
export default function OrderDialog({
  courseId,
  courseTitle,
  onClose,
  onCreated,
}: {
  courseId: string
  courseTitle: string
  onClose: () => void
  onCreated: () => void
}) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [seats, setSeats] = useState('1')
  const initialDates = defaultDates()
  const [startDate, setStartDate] = useState(initialDates.start)
  const [endDate, setEndDate] = useState(initialDates.end)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    listCustomers()
      .then((list) => {
        setCustomers(list)
        if (list.length > 0) setCustomerId(list[0].id)
      })
      .catch(() => setCustomers([]))
  }, [])

  const seatsNum = Number(seats)
  const canSubmit = !!(
    customerId &&
    Number.isInteger(seatsNum) &&
    seatsNum >= 1 &&
    startDate &&
    endDate &&
    endDate >= startDate
  )

  const submit = async () => {
    setError(null)
    if (!canSubmit) return
    setBusy(true)
    try {
      await createOrder({ courseId, customerId, startDate, endDate, seats: seatsNum })
      onCreated()
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 p-4 py-10"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">{t.dialogTitle(courseTitle)}</h2>
          <button type="button" onClick={onClose} aria-label={t.cancel} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className={labelCls}>{t.fCustomer}</span>
            {customers.length === 0 ? (
              <p className="text-sm text-amber-700">{t.noCustomers}</p>
            ) : (
              <select className={inputCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </label>
          <label className="block">
            <span className={labelCls}>{t.fSeats}</span>
            <input type="number" min={1} step={1} className={inputCls} value={seats} onChange={(e) => setSeats(e.target.value)} />
          </label>
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
            {busy ? t.creating : t.create}
          </button>
        </div>
      </div>
    </div>
  )
}
