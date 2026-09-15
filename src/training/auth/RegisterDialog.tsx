// Selbstregistrierung: Person plus Organisation in einem Schritt.
//
// Der Server entscheidet danach, ob die Organisation schon existiert. Das ist
// bewusst nicht sichtbar, solange man tippt: eine Firmensuche mit Vorschlägen
// würde verraten, welche Firmen bereits Kunden sind — und das geht niemanden
// etwas an, der gerade ein Formular ausfüllt.

import { useEffect, useState } from 'react'
import { labels } from '../labels'
import { apiBaseUrl } from '../../config/configuration'

const t = labels.register

// Die Reihenfolge ist die Wahrscheinlichkeit, nicht das Alphabet: die Plattform
// steht in der Schweiz. Die Beschriftung kommt aus dem Katalog.
const COUNTRY_CODES = ['CH', 'DE', 'AT'] as const

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Result {
  customerName: string
  customerCreated: boolean
  isCustomerAdmin: boolean
  invited: boolean
}

export default function RegisterDialog({
  onClose,
  onLogin,
}: {
  onClose: () => void
  /** „Ich habe schon einen Zugang" — führt in die Anmeldung. */
  onLogin: () => void
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [street, setStreet] = useState('')
  const [streetNumber, setStreetNumber] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('CH')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [done, setDone] = useState<Result | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    EMAIL_RE.test(email.trim()) &&
    companyName.trim() &&
    street.trim() &&
    streetNumber.trim() &&
    postalCode.trim() &&
    city.trim()

  const submit = async () => {
    setError(null)
    setAlreadyRegistered(false)
    setBusy(true)
    try {
      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          company: {
            name: companyName.trim(),
            address: {
              street: street.trim(),
              streetNumber: streetNumber.trim(),
              postalCode: postalCode.trim(),
              city: city.trim(),
              country,
            },
          },
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (body?.code === 'ALREADY_REGISTERED') setAlreadyRegistered(true)
        setError(body?.error || `Die Registrierung ist fehlgeschlagen (${res.status}).`)
        return
      }
      setDone(body as Result)
    } catch {
      setError(t.unreachable)
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30'
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-16"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">
            {done ? t.titleDone : t.title}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.close} className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="space-y-3 px-6 py-6">
            <p className="text-sm text-slate-700">
              {t.doneAccount(done.customerName)}
            </p>
            {done.customerCreated ? (
              <p className="text-sm text-slate-700">
                {t.doneCustomerCreated}
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                {t.doneCustomerExisting}
              </p>
            )}
            <p className="text-sm text-slate-600">
              {done.invited
                ? t.doneInvited
                : t.doneNotInvited}
            </p>
            <button
              type="button"
              onClick={onLogin}
              className="mt-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
            >
              {t.toLogin}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelCls}>{t.firstName}</span>
                  <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
                </label>
                <label className="block">
                  <span className={labelCls}>{t.lastName}</span>
                  <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className={labelCls}>E-Mail</span>
                <input
                  className={inputCls}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                />
              </label>

              <div className="border-t border-mist pt-4" style={{ borderTopStyle: 'solid' }}>
                <label className="block">
                  <span className={labelCls}>{t.company}</span>
                  <input className={inputCls} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block">
                  <span className={labelCls}>{t.street}</span>
                  <input className={inputCls} value={street} onChange={(e) => setStreet(e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelCls}>{t.streetNumber}</span>
                  <input className={inputCls} value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className={labelCls}>{t.postalCode}</span>
                  <input className={inputCls} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </label>
                <label className="col-span-2 block">
                  <span className={labelCls}>{t.city}</span>
                  <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
                </label>
              </div>
              <label className="block">
                <span className={labelCls}>{t.country}</span>
                <select className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRY_CODES.map((code) => (
                    <option key={code} value={code}>
                      {t.countries[code]}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-xs text-slate-500">
                Anhand von Firmenname und Adresse erkennen wir, ob deine Organisation schon erfasst
                ist. Ist sie es, wirst du ihr hinzugefügt; ist sie es nicht, wird sie angelegt und du
                verwaltest sie.
              </p>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                  {alreadyRegistered && (
                    <button type="button" onClick={onLogin} className="mt-2 block font-semibold underline">{t.toSignIn}</button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-mist px-6 py-4">
              <button type="button" onClick={onLogin} className="text-sm text-slate-500 hover:text-navy">{t.haveAccount}</button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || !canSubmit}
                className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? t.submitting : t.submit}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
