import { useEffect, useState } from 'react'
import { labels } from '../labels'
import { listOrders, type Order } from './adminApi'

const t = labels.adminOrders

/** Format an ISO date as a Swiss short date (dd.mm.yyyy). */
function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Bestellungen tab: table of all orders with course, customer, period and seats. */
export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((e) => setError((e as Error).message || t.loadError))
  }, [])

  return (
    <div>
      <h2 className="mb-4 font-display text-lg font-bold text-navy">{t.heading}</h2>

      {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-mist">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-cream text-xs uppercase tracking-kicker text-slate-500">
              <th className="px-4 py-3 font-semibold">{t.colCourse}</th>
              <th className="px-4 py-3 font-semibold">{t.colCustomer}</th>
              <th className="px-4 py-3 font-semibold">{t.colPeriod}</th>
              <th className="px-4 py-3 font-semibold text-right">{t.colSeats}</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id} className="border-t border-mist">
                <td className="px-4 py-3 font-medium text-navy">{o.courseTitle ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{o.customerName ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {fmtDate(o.startDate)} – {fmtDate(o.endDate)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-navy">{o.usedSeats ?? 0} / {o.seats}</td>
              </tr>
            ))}
            {orders && orders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  {t.noOrders}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
