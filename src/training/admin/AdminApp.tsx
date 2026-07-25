import { useEffect, useState } from 'react'
import '../styles.css'
import { labels } from '../labels'
import { useAuth } from '../auth/AuthContext'
import LoginGate from '../auth/LoginGate'
import {
  listUsers,
  createUser,
  setDeactivated,
  listCustomers,
  AdminError,
  COUNTRIES,
  type AdminUser,
  type Customer,
  type CountryCode,
  type CustomerAddress,
} from './adminApi'
import CustomersTab from './CustomersTab'
import OrdersTab from './OrdersTab'

const t = labels.admin
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROLES = ['Administrator', 'Member'] as const

/** Guard: login required, Administrator role required; then render the panel. */
export default function AdminApp() {
  const { status, user } = useAuth()
  const isAdmin = !!user?.roles?.includes('Administrator')

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
  if (!isAdmin) {
    return (
      <div className="training-root font-sans">
        <div className="max-w-prose mx-auto px-4 py-16">
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">{t.noAccess}</div>
        </div>
      </div>
    )
  }
  return <AdminPanel />
}

function AdminPanel() {
  const [tab, setTab] = useState<'users' | 'customers' | 'orders'>('users')

  const tabCls = (active: boolean) =>
    active
      ? 'border-b-2 border-navy px-4 py-2 text-sm font-semibold text-navy'
      : 'border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:text-navy'
  return (
    <div className="training-root font-sans">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-navy mb-6">{t.title}</h1>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-mist">
          <button type="button" onClick={() => setTab('users')} className={tabCls(tab === 'users')}>
            {t.tabUsers}
          </button>
          <button type="button" onClick={() => setTab('customers')} className={tabCls(tab === 'customers')}>
            {labels.adminCustomers.tab}
          </button>
          <button type="button" onClick={() => setTab('orders')} className={tabCls(tab === 'orders')}>
            {labels.adminOrders.tab}
          </button>
        </div>

        {tab === 'users' ? (
          <UsersTab />
        ) : tab === 'customers' ? (
          <CustomersTab />
        ) : (
          <OrdersTab />
        )}
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [showDeactivated, setShowDeactivated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busyEmail, setBusyEmail] = useState<string | null>(null)

  const load = async (includeDeactivated: boolean) => {
    setError(null)
    try {
      setUsers(await listUsers(includeDeactivated))
    } catch (e) {
      setError((e as Error).message || t.loadError)
    }
  }

  useEffect(() => {
    load(showDeactivated)
  }, [showDeactivated])

  const toggleDeactivated = async (u: AdminUser) => {
    setBusyEmail(u.email)
    setError(null)
    try {
      await setDeactivated(u.email, !u.deactivated)
      await load(showDeactivated)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusyEmail(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showDeactivated}
            onChange={(e) => setShowDeactivated(e.target.checked)}
          />
          {t.showDeactivated}
        </label>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
        >
          + {t.createUser}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-mist">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-cream text-xs uppercase tracking-kicker text-slate-500">
              <th className="px-4 py-3 font-semibold">{t.colName}</th>
              <th className="px-4 py-3 font-semibold">{t.colEmail}</th>
              <th className="px-4 py-3 font-semibold">{t.colCustomer}</th>
              <th className="px-4 py-3 font-semibold">{t.colRoles}</th>
              <th className="px-4 py-3 font-semibold">{t.colStatus}</th>
              <th className="px-4 py-3 font-semibold text-right">{t.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.email} className={`border-t border-mist ${u.deactivated ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3 font-medium text-navy">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.customerName ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span key={r} className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white">
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {u.deactivated ? (
                    <span className="text-slate-500">{t.statusDeactivated}</span>
                  ) : (
                    <span className="font-semibold text-emerald-700">{t.statusActive}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleDeactivated(u)}
                    disabled={busyEmail === u.email}
                    className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                      u.deactivated
                        ? 'border-navy text-navy hover:bg-navy hover:text-white'
                        : 'border-mist text-red-700 hover:bg-red-700 hover:text-white'
                    }`}
                  >
                    {u.deactivated ? t.reactivate : t.deactivate}
                  </button>
                </td>
              </tr>
            ))}
            {users && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  {t.noUsers}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <CreateUserDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false)
            load(showDeactivated)
          }}
        />
      )}
    </div>
  )
}

const NEW_CUSTOMER = '__new__'

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<string[]>(['Member'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerChoice, setCustomerChoice] = useState<string>(NEW_CUSTOMER)
  const [custName, setCustName] = useState('')
  const [addr, setAddr] = useState<CustomerAddress>({
    street: '',
    streetNumber: '',
    postalCode: '',
    city: '',
    country: 'CH',
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Load customers; default to the first existing one if any.
  useEffect(() => {
    listCustomers()
      .then((list) => {
        setCustomers(list)
        if (list.length > 0) setCustomerChoice(list[0].id)
      })
      .catch(() => setCustomers([]))
  }, [])

  const isNewCustomer = customerChoice === NEW_CUSTOMER
  const setAddrField = (k: keyof CustomerAddress, v: string) => setAddr((a) => ({ ...a, [k]: v }))

  // Enable "Erstellen" only when every required field is populated.
  const customerOk = isNewCustomer
    ? !!(custName.trim() && addr.street.trim() && addr.streetNumber.trim() && addr.postalCode.trim() && addr.city.trim())
    : !!customerChoice
  const canSubmit = !!(firstName.trim() && lastName.trim() && EMAIL_RE.test(email.trim()) && customerOk)

  const toggleRole = (role: string) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))

  const submit = async () => {
    setError(null)
    if (!firstName.trim() || !lastName.trim()) {
      setError(t.nameRequired)
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError(t.invalidEmail)
      return
    }
    if (isNewCustomer) {
      if (!custName.trim()) {
        setError(t.customerNameRequired)
        return
      }
      if (!addr.street.trim() || !addr.streetNumber.trim() || !addr.postalCode.trim() || !addr.city.trim()) {
        setError(t.addressRequired)
        return
      }
    }
    setBusy(true)
    try {
      await createUser({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roles,
        ...(isNewCustomer
          ? { newCustomer: { name: custName.trim(), address: addr } }
          : { customerId: customerChoice }),
      })
      onCreated()
    } catch (e) {
      const ae = e as AdminError
      setError(ae.code === 'DUPLICATE' ? t.duplicate : ae.message)
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
          <h2 className="font-display text-lg font-bold text-navy">{t.dialogTitle}</h2>
          <button type="button" onClick={onClose} aria-label={t.cancel} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>{t.fFirstName}</span>
              <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
            </label>
            <label className="block">
              <span className={labelCls}>{t.fLastName}</span>
              <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
          </div>
          <label className="block">
            <span className={labelCls}>{t.fEmail}</span>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vorname.nachname@hslu.ch" />
          </label>

          {/* Customer: existing or new */}
          <label className="block">
            <span className={labelCls}>{t.fCustomer}</span>
            <select className={inputCls} value={customerChoice} onChange={(e) => setCustomerChoice(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value={NEW_CUSTOMER}>{t.newCustomerOption}</option>
            </select>
          </label>

          {isNewCustomer && (
            <div className="space-y-3 rounded-md border border-mist bg-cream/60 p-3">
              <label className="block">
                <span className={labelCls}>{t.fCustomerName}</span>
                <input className={inputCls} value={custName} onChange={(e) => setCustName(e.target.value)} />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block">
                  <span className={labelCls}>{t.fStreet}</span>
                  <input className={inputCls} value={addr.street} onChange={(e) => setAddrField('street', e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelCls}>{t.fStreetNumber}</span>
                  <input className={inputCls} value={addr.streetNumber} onChange={(e) => setAddrField('streetNumber', e.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className={labelCls}>{t.fPostalCode}</span>
                  <input className={inputCls} value={addr.postalCode} onChange={(e) => setAddrField('postalCode', e.target.value)} />
                </label>
                <label className="col-span-2 block">
                  <span className={labelCls}>{t.fCity}</span>
                  <input className={inputCls} value={addr.city} onChange={(e) => setAddrField('city', e.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className={labelCls}>{t.fCountry}</span>
                <select
                  className={inputCls}
                  value={addr.country}
                  onChange={(e) => setAddrField('country', e.target.value as CountryCode)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div>
            <span className={labelCls}>{t.fRoles}</span>
            <div className="flex gap-4">
              {ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                  {role === 'Administrator' ? t.roleAdministrator : t.roleMember}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white">
            {t.cancel}
          </button>
          <button type="button" onClick={submit} disabled={busy || !canSubmit} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? t.creating : t.create}
          </button>
        </div>
      </div>
    </div>
  )
}
