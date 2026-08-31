import { useEffect, useState } from 'react'
import { labels } from '../labels'
import { matchesSearch } from './search'
import {
  listCustomersWithUsers,
  createCustomer,
  updateCustomer,
  COUNTRIES,
  countryLabel,
  type Customer,
  type CustomerWithUsers,
  type CustomerAddress,
  type CountryCode,
} from './adminApi'

const t = labels.adminCustomers

/** Kunden tab: table of customers with their address and associated users. */
export default function CustomersTab() {
  const [customers, setCustomers] = useState<CustomerWithUsers[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerWithUsers | null>(null)
  const [search, setSearch] = useState('')

  const load = async () => {
    setError(null)
    try {
      setCustomers(await listCustomersWithUsers())
    } catch (e) {
      setError((e as Error).message || t.loadError)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const shown = (customers ?? []).filter((c) =>
    matchesSearch(search, [
      c.name,
      c.address.street,
      c.address.streetNumber,
      c.address.postalCode,
      c.address.city,
    ]),
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <h2 className="font-display text-lg font-bold text-navy">{t.heading}</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchCustomers}
          className="min-w-0 flex-1 rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/20"
        />
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
        >
          + {t.createCustomer}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-mist">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-cream text-xs uppercase tracking-kicker text-slate-500">
              <th className="px-4 py-3 font-semibold">{t.colName}</th>
              <th className="px-4 py-3 font-semibold">{t.colAddress}</th>
              <th className="px-4 py-3 font-semibold">{t.colUsers}</th>
              <th className="px-4 py-3 font-semibold text-right">{t.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="border-t border-mist align-top">
                <td className="px-4 py-3 font-medium text-navy">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.address.street} {c.address.streetNumber}
                  <br />
                  {c.address.postalCode} {c.address.city}
                  <br />
                  {countryLabel(c.address.country)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {c.users.length === 0 ? (
                    <span className="text-slate-400">{t.noUsers}</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      {c.users.map((u) => (
                        <span key={u.email} className={u.deactivated ? 'text-slate-400 line-through' : ''}>
                          {u.firstName} {u.lastName}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="rounded-md border border-mist px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-navy hover:bg-cream"
                  >
                    {t.edit}
                  </button>
                </td>
              </tr>
            ))}
            {customers && shown.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  {search.trim() ? t.noSearchMatch(customers.length) : t.noCustomers}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <CustomerDialog
          onClose={() => setDialogOpen(false)}
          onSaved={() => {
            setDialogOpen(false)
            load()
          }}
        />
      )}
      {editing && (
        <CustomerDialog
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

const tu = labels.admin

function CustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!customer
  const [name, setName] = useState(customer?.name ?? '')
  const [addr, setAddr] = useState<CustomerAddress>(
    customer?.address ?? {
      street: '',
      streetNumber: '',
      postalCode: '',
      city: '',
      country: 'CH',
    },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const setAddrField = (k: keyof CustomerAddress, v: string) => setAddr((a) => ({ ...a, [k]: v }))

  const canSubmit = !!(
    name.trim() &&
    addr.street.trim() &&
    addr.streetNumber.trim() &&
    addr.postalCode.trim() &&
    addr.city.trim()
  )

  const submit = async () => {
    setError(null)
    if (!name.trim()) {
      setError(tu.customerNameRequired)
      return
    }
    if (!addr.street.trim() || !addr.streetNumber.trim() || !addr.postalCode.trim() || !addr.city.trim()) {
      setError(tu.addressRequired)
      return
    }
    setBusy(true)
    try {
      if (isEdit) await updateCustomer(customer!.id, name.trim(), addr)
      else await createCustomer(name.trim(), addr)
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
          <h2 className="font-display text-lg font-bold text-navy">{isEdit ? t.editCustomerTitle : t.createCustomerTitle}</h2>
          <button type="button" onClick={onClose} aria-label={tu.cancel} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="block">
            <span className={labelCls}>{tu.fCustomerName}</span>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 block">
              <span className={labelCls}>{tu.fStreet}</span>
              <input className={inputCls} value={addr.street} onChange={(e) => setAddrField('street', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>{tu.fStreetNumber}</span>
              <input className={inputCls} value={addr.streetNumber} onChange={(e) => setAddrField('streetNumber', e.target.value)} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className={labelCls}>{tu.fPostalCode}</span>
              <input className={inputCls} value={addr.postalCode} onChange={(e) => setAddrField('postalCode', e.target.value)} />
            </label>
            <label className="col-span-2 block">
              <span className={labelCls}>{tu.fCity}</span>
              <input className={inputCls} value={addr.city} onChange={(e) => setAddrField('city', e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>{tu.fCountry}</span>
            <select className={inputCls} value={addr.country} onChange={(e) => setAddrField('country', e.target.value as CountryCode)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
            {tu.cancel}
          </button>
          <button type="button" onClick={submit} disabled={busy || !canSubmit} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? (isEdit ? t.saving : tu.creating) : isEdit ? t.save : tu.create}
          </button>
        </div>
      </div>
    </div>
  )
}
