// Bulk user import: drop a participant list, let the model read it, check what
// it found, assign a customer, write.
//
// The review step is not a formality. The file format is deliberately open, so
// the model is doing interpretation — which column was the surname, whether row
// three was a heading. Every recognised person is therefore editable here, and
// the rows the server refused are listed with the reason rather than silently
// dropped. An import that quietly loses two of thirty participants is worse
// than one that fails.

import { useEffect, useState } from 'react'
import { labels } from '../labels'
import { convertDocument } from '../lib/convertApi'
import {
  importUsers,
  listCustomers,
  parseUserImport,
  AdminError,
  COUNTRIES,
  type Customer,
  type CustomerAddress,
  type CountryCode,
  type ExtractedUser,
  type ImportRowResult,
  type SkippedRow,
} from './adminApi'

const t = labels.admin
const ti = labels.admin.import
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NEW_CUSTOMER = '__new__'

const inputCls =
  'w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30'
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500'

/** Spreadsheets go through the conversion service; everything else is text. */
const SPREADSHEET = /\.(xlsx?|xlsm|ods)$/i
const PLAIN = /\.(csv|tsv|txt|md)$/i

export interface Row extends ExtractedUser {
  /** Rows can be unticked rather than deleted — the list stays comparable. */
  include: boolean
}

type Stage = 'reading' | 'review' | 'writing' | 'done'

export default function UserImportDialog({
  file,
  roles,
  onClose,
  onImported,
}: {
  file: File
  /** Roles the tab currently offers; the dialog applies one set to everyone. */
  roles: readonly { value: string; label: string }[]
  onClose: () => void
  onImported: () => void
}) {
  const [stage, setStage] = useState<Stage>('reading')
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [skipped, setSkipped] = useState<SkippedRow[]>([])
  const [results, setResults] = useState<ImportRowResult[] | null>(null)

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
  const [chosenRoles, setChosenRoles] = useState<string[]>(['Member'])
  const [invite, setInvite] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && stage !== 'writing' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, stage])

  useEffect(() => {
    listCustomers()
      .then((list) => {
        setCustomers(list)
        if (list.length > 0) setCustomerChoice(list[0].id)
      })
      .catch(() => setCustomers([]))
  }, [])

  // Read the file, then have the model pull the people out of it.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const text = await readAsText(file)
        if (cancelled) return
        const parsed = await parseUserImport(text)
        if (cancelled) return
        setRows(parsed.users.map((u) => ({ ...u, include: true })))
        setSkipped(parsed.skipped)
        setStage('review')
      } catch (e) {
        if (cancelled) return
        setError((e as Error).message || ti.readFailed)
        setStage('review')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [file])

  const isNewCustomer = customerChoice === NEW_CUSTOMER
  const setAddrField = (k: keyof CustomerAddress, v: string) => setAddr((a) => ({ ...a, [k]: v }))
  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const selected = rows.filter((r) => r.include)
  const customerOk = isNewCustomer
    ? Boolean(
        custName.trim() &&
          addr.street.trim() &&
          addr.streetNumber.trim() &&
          addr.postalCode.trim() &&
          addr.city.trim(),
      )
    : Boolean(customerChoice)
  const rowsOk = selected.length > 0 && selected.every((r) => EMAIL_RE.test(r.email.trim()) && (r.firstName.trim() || r.lastName.trim()))
  const canSubmit = stage === 'review' && customerOk && rowsOk

  const submit = async () => {
    setError(null)
    setStage('writing')
    try {
      const result = await importUsers({
        users: selected.map((r) => ({
          firstName: r.firstName.trim(),
          lastName: r.lastName.trim(),
          email: r.email.trim().toLowerCase(),
        })),
        roles: chosenRoles,
        invite,
        ...(isNewCustomer
          ? { newCustomer: { name: custName.trim(), address: addr } }
          : { customerId: customerChoice }),
      })
      setResults(result.results)
      setStage('done')
      onImported()
    } catch (e) {
      setError((e as AdminError).message)
      setStage('review')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-20"
      onMouseDown={(e) => e.target === e.currentTarget && stage !== 'writing' && onClose()}
    >
      <div className="w-full max-w-3xl rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-navy">{ti.title}</h2>
            <p className="text-xs text-slate-500">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={stage === 'writing'}
            aria-label={t.cancel}
            className="text-slate-400 hover:text-navy disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {stage === 'reading' && <p className="text-sm text-slate-500">{ti.reading}</p>}

          {error && <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          {stage === 'done' && results ? (
            <ResultList results={results} invited={invite} />
          ) : (
            stage !== 'reading' && (
              <>
                {rows.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className={labelCls}>{ti.recognised(rows.length)}</span>
                      <span className="text-xs text-slate-400">{ti.editHint}</span>
                    </div>
                    <div className="max-h-72 overflow-auto rounded-lg border border-mist">
                      <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-cream text-xs uppercase tracking-kicker text-slate-500">
                          <tr>
                            <th className="w-10 px-3 py-2" />
                            <th className="px-3 py-2 font-semibold">{t.fFirstName}</th>
                            <th className="px-3 py-2 font-semibold">{t.fLastName}</th>
                            <th className="px-3 py-2 font-semibold">{t.colEmail}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => {
                            const bad = !EMAIL_RE.test(row.email.trim())
                            return (
                              <tr key={i} className={`border-t border-mist ${row.include ? '' : 'opacity-40'}`}>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="checkbox"
                                    checked={row.include}
                                    onChange={(e) => setRow(i, { include: e.target.checked })}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-800 hover:border-mist focus:border-navy focus:bg-white focus:outline-none"
                                    value={row.firstName}
                                    onChange={(e) => setRow(i, { firstName: e.target.value })}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm text-slate-800 hover:border-mist focus:border-navy focus:bg-white focus:outline-none"
                                    value={row.lastName}
                                    onChange={(e) => setRow(i, { lastName: e.target.value })}
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    className={`w-full rounded border bg-transparent px-1 py-0.5 text-sm hover:border-mist focus:border-navy focus:bg-white focus:outline-none ${
                                      bad && row.include ? 'border-red-300 text-red-800' : 'border-transparent text-slate-600'
                                    }`}
                                    value={row.email}
                                    onChange={(e) => setRow(i, { email: e.target.value })}
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {rows.length === 0 && !error && (
                  <p className="rounded-md border border-mist bg-cream p-3 text-sm text-slate-600">{ti.nothingFound}</p>
                )}

                {skipped.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-kicker text-amber-900">
                      {ti.skipped(skipped.length)}
                    </p>
                    <ul className="space-y-0.5 text-xs text-amber-900">
                      {skipped.map((s, i) => (
                        <li key={i}>
                          <span className="font-semibold">{s.value}</span> — {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {rows.length > 0 && (
                  <>
                    <label className="block">
                      <span className={labelCls}>{ti.customerForAll}</span>
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

                    <label className="flex items-start gap-2 rounded-md border border-mist bg-cream/60 p-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={invite}
                        onChange={(e) => setInvite(e.target.checked)}
                      />
                      <span>
                        {t.invite.checkboxBulk(selected.length)}
                        <span className="mt-0.5 block text-xs text-slate-500">{t.invite.hint}</span>
                      </span>
                    </label>

                    <div>
                      <span className={labelCls}>{ti.rolesForAll}</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {roles.map(({ value, label }) => (
                          <label key={value} className="flex items-start gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={chosenRoles.includes(value)}
                              onChange={() =>
                                setChosenRoles((prev) =>
                                  prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value],
                                )
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-mist px-6 py-4">
          <span className="text-xs text-slate-400">
            {stage === 'review' && rows.length > 0
              ? invite
                ? ti.willCreateAndInvite(selected.length)
                : ti.willCreate(selected.length)
              : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={stage === 'writing'}
              className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:opacity-50"
            >
              {stage === 'done' ? ti.close : t.cancel}
            </button>
            {stage !== 'done' && (
              <button
                type="button"
                onClick={submit}
                /* `canSubmit` already requires stage 'review', so it covers the write in flight. */
                disabled={!canSubmit}
                className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {stage === 'writing' ? ti.writing : ti.confirm}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResultList({ results, invited }: { results: ImportRowResult[]; invited: boolean }) {
  const created = results.filter((r) => r.status === 'created')
  const rest = results.filter((r) => r.status !== 'created')
  // Accounts exist; a mail that bounced is a separate, smaller problem, and it
  // is named separately so nobody assumes thirty people were notified.
  const notInvited = invited ? created.filter((r) => !r.invited) : []
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-emerald-700">{ti.createdCount(created.length)}</p>
      {invited && (
        <p className="text-sm text-slate-700">
          {ti.invitedCount(created.length - notInvited.length)}
        </p>
      )}
      {notInvited.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-kicker text-amber-900">
            {ti.inviteFailed(notInvited.length)}
          </p>
          <ul className="space-y-0.5 text-xs text-amber-900">
            {notInvited.map((r) => (
              <li key={r.email}>{r.email}</li>
            ))}
          </ul>
        </div>
      )}
      {rest.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-kicker text-amber-900">
            {ti.notCreated(rest.length)}
          </p>
          <ul className="space-y-0.5 text-xs text-amber-900">
            {rest.map((r) => (
              <li key={r.email}>
                <span className="font-semibold">{r.email}</span> — {r.message ?? r.status}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Spreadsheets are converted server-side (the same Docling service the
 * doc_convert block uses) and arrive as a Markdown table, which the model reads
 * as happily as a CSV. Text files are read in the browser — sending a 4 kB CSV
 * through a conversion service would be a round trip for nothing.
 */
async function readAsText(file: File): Promise<string> {
  if (SPREADSHEET.test(file.name)) {
    const result = await convertDocument(file)
    const text = result.excel?.markdown ?? result.markdown ?? ''
    if (!text.trim()) throw new Error(ti.emptyAfterConvert)
    return text
  }
  if (!PLAIN.test(file.name)) {
    // Anything else is tried as text rather than refused: an export named .dat
    // is still usually a CSV, and the model will say if it is not.
    console.warn('user import: unknown extension, reading as text', file.name)
  }
  return file.text()
}
