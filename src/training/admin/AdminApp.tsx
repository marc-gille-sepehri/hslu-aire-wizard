import { useEffect, useState } from 'react'
import '../styles.css'
import { labels } from '../labels'
import { useAuth } from '../auth/AuthContext'
import LoginGate from '../auth/LoginGate'
import {
  listUsers,
  createUser,
  updateUser,
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
import InstancesTab from './InstancesTab'
import SkillTab from './SkillTab'

const t = labels.admin
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Mirrors ALLOWED_ROLES on the server. The study roles are listed here so the
// coding route can be staffed from this panel instead of by hand in the DB.
const ROLES = ['Administrator', 'Member', 'enforcement-signal-coder', 'enforcement-signal-admin'] as const

const ROLE_LABELS: Record<string, string> = {
  Administrator: t.roleAdministrator,
  Member: t.roleMember,
  'enforcement-signal-coder': t.roleCoder,
  'enforcement-signal-admin': t.roleStudyAdmin,
}

/** Short form for the table chips; the dialog spells the roles out in full. */
const ROLE_SHORT: Record<string, string> = {
  'enforcement-signal-coder': t.roleCoderShort,
  'enforcement-signal-admin': t.roleStudyAdminShort,
}

const roleLabel = (role: string) => ROLE_LABELS[role] ?? role
const roleChip = (role: string) => ROLE_SHORT[role] ?? roleLabel(role)

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
  const [tab, setTab] = useState<'users' | 'customers' | 'orders' | 'instances' | 'skill'>('users')

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
          <button type="button" onClick={() => setTab('instances')} className={tabCls(tab === 'instances')}>
            {labels.adminInstances.tab}
          </button>
          <button type="button" onClick={() => setTab('skill')} className={tabCls(tab === 'skill')}>
            {labels.adminSkill.tab}
          </button>
        </div>

        {tab === 'users' ? (
          <UsersTab />
        ) : tab === 'customers' ? (
          <CustomersTab />
        ) : tab === 'orders' ? (
          <OrdersTab />
        ) : tab === 'instances' ? (
          <InstancesTab />
        ) : (
          <SkillTab />
        )}
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [showDeactivated, setShowDeactivated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // null = closed; { user: null } = create; { user } = edit.
  const [dialog, setDialog] = useState<{ user: AdminUser | null } | null>(null)
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
          onClick={() => setDialog({ user: null })}
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
                      <span key={r} title={r} className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white">
                        {roleChip(r)}
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
                  <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDialog({ user: u })}
                    aria-label={t.edit}
                    title={t.edit}
                    className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-cream hover:text-navy"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
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
                  </div>
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

      {dialog && (
        <UserDialog
          user={dialog.user}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            load(showDeactivated)
          }}
        />
      )}
    </div>
  )
}

const NEW_CUSTOMER = '__new__'

/**
 * Create or edit a user. In edit mode the email is shown but not editable: it
 * is the login handle and the key that course progress and course instances
 * reference, so changing it is a migration rather than a field edit. A new
 * customer can only be attached while creating — afterwards the Kunden tab is
 * the place for that.
 */
function UserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = user !== null
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [roles, setRoles] = useState<string[]>(user?.roles ?? ['Member'])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerChoice, setCustomerChoice] = useState<string>(user?.customerId ?? NEW_CUSTOMER)
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
        // Editing keeps the user's own customer; creating falls back to the first.
        if (!isEdit && list.length > 0) setCustomerChoice(list[0].id)
      })
      .catch(() => setCustomers([]))
  }, [isEdit])

  const isNewCustomer = !isEdit && customerChoice === NEW_CUSTOMER
  // A rename cascades through progress and instances — worth naming explicitly.
  const emailChanged = isEdit && email.trim().toLowerCase() !== user!.email.toLowerCase()
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
    // A rename is not undoable from this dialog, so it gets an explicit yes.
    if (emailChanged && !window.confirm(t.emailRenameConfirm(user!.email, email.trim().toLowerCase()))) {
      return
    }
    setBusy(true)
    try {
      if (isEdit) {
        await updateUser(user!.email, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          roles,
          customerId: customerChoice,
          ...(emailChanged ? { email: email.trim() } : {}),
        })
      } else {
        await createUser({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          roles,
          ...(isNewCustomer
            ? { newCustomer: { name: custName.trim(), address: addr } }
            : { customerId: customerChoice }),
        })
      }
      onSaved()
    } catch (e) {
      const ae = e as AdminError
      setError(
        ae.code === 'DUPLICATE'
          ? t.duplicate
          : ae.code === 'SELF_DEMOTE'
            ? t.selfDemote
            : ae.code === 'SELF_RENAME'
              ? t.selfRename
              : ae.message,
      )
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
          <h2 className="font-display text-lg font-bold text-navy">{isEdit ? t.editTitle : t.dialogTitle}</h2>
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
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vorname.nachname@hslu.ch"
            />
            {isEdit && emailChanged && (
              <span className="mt-1 block text-xs text-slate-500">{t.emailRenameHint}</span>
            )}
          </label>

          {/* Customer: existing or new */}
          <label className="block">
            <span className={labelCls}>{t.fCustomer}</span>
            <select className={inputCls} value={customerChoice} onChange={(e) => setCustomerChoice(e.target.value)}>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {!isEdit && <option value={NEW_CUSTOMER}>{t.newCustomerOption}</option>}
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
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {ROLES.map((role) => (
                <label key={role} className="flex items-start gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={roles.includes(role)} onChange={() => toggleRole(role)} />
                  {roleLabel(role)}
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
            {busy ? (isEdit ? t.saving : t.creating) : isEdit ? t.save : t.create}
          </button>
        </div>
      </div>
    </div>
  )
}
