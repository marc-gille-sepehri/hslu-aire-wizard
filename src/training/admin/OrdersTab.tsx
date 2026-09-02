import { useCallback, useEffect, useState } from 'react'
import { labels } from '../labels'
import { listOrders, type Order } from './adminApi'
import OrderDialog from './OrderDialog'

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
  // null = zu; { order: null } = neu; { order } = ändern.
  const [dialog, setDialog] = useState<{ order: Order | null } | null>(null)
  /** Rückmeldung zur entstandenen Rechnung. */
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(() => {
    listOrders()
      .then(setOrders)
      .catch((e) => setError((e as Error).message || t.loadError))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-navy">{t.heading}</h2>
        <button
          type="button"
          onClick={() => setDialog({ order: null })}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
        >
          {t.order}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {notice && (
        <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          {notice}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-mist">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-cream text-xs uppercase tracking-kicker text-slate-500">
              <th className="px-4 py-3 font-semibold">{t.colCourse}</th>
              <th className="px-4 py-3 font-semibold">{t.colCustomer}</th>
              <th className="px-4 py-3 font-semibold">{t.colPeriod}</th>
              <th className="px-4 py-3 font-semibold">{t.colNamed}</th>
              <th className="px-4 py-3 font-semibold text-right">{t.colSeats}</th>
              <th className="px-4 py-3 font-semibold text-right">{t.colInvoices}</th>
              <th className="px-4 py-3" />
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
                <td className="px-4 py-3 text-slate-600">
                  {o.namedUsers?.length ? (
                    <span title={o.namedUsers.join('\n')}>
                      {o.namedUsers.length}
                      {/* Der freie Rest ist die Zahl, die im Alltag zählt: so viele
                          beliebige Nutzer des Kunden können noch starten. */}
                      <span className="ml-1 text-xs text-slate-400">
                        (+{o.freeUnnamed ?? 0} frei)
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium text-navy">{o.usedSeats ?? 0} / {o.seats}</td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {o.invoices ? o.invoices : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setDialog({ order: o })}
                    aria-label={t.edit}
                    title={t.edit}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-cream hover:text-navy"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {orders && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                  {t.noOrders}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <OrderDialog
          order={dialog.order}
          onClose={() => setDialog(null)}
          onCreated={(msg) => {
            setDialog(null)
            reload()
            setNotice(msg ?? null)
          }}
        />
      )}
    </div>
  )
}
