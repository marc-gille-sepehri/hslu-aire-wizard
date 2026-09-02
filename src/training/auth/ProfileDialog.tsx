// Das eigene Profil.
//
// Bewusst schmal: Vor- und Nachname, sonst nichts. Rollen und Organisation sind
// nichts, was jemand an sich selbst verstellen können darf; die E-Mail-Adresse
// ist der Anmeldeschlüssel und zieht sich durch Fortschritt, Durchführungen und
// Bestellungen — ihre Änderung bleibt der Plattformadministration. Beides steht
// hier trotzdem lesbar, damit man sieht, wer man ist und wozu man gehört.

import { useEffect, useState } from 'react'
import { apiBaseUrl } from '../../config/configuration'
import { useAuth, getStoredToken } from './AuthContext'

const ROLE_LABELS: Record<string, string> = {
  Administrator: 'Administrator',
  Kundenadministrator: 'Kundenadministrator',
  Member: 'Member',
  'enforcement-signal-coder': 'Kodierer (Enforcement-Signal)',
  'enforcement-signal-admin': 'Studienadministration (Enforcement-Signal)',
}

export default function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, login } = useAuth()
  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const dirty = firstName !== (user?.firstName ?? '') || lastName !== (user?.lastName ?? '')
  const canSubmit = firstName.trim() && lastName.trim() && dirty

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const token = getStoredToken()
      const res = await fetch(`${apiBaseUrl}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error || `Speichern fehlgeschlagen (${res.status}).`)
        return
      }
      // Der Kopfbereich zeigt den Namen — ohne diese Aktualisierung stünde dort
      // bis zum nächsten Laden der alte.
      if (token && body?.user) login(token, body.user)
      setSaved(true)
    } catch {
      setError('Der Server ist nicht erreichbar.')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30 disabled:bg-cream disabled:text-slate-500'
  const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-24"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">Mein Profil</h2>
          <button type="button" onClick={onClose} aria-label="Schliessen" className="text-slate-400 hover:text-navy">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelCls}>Vorname</span>
              <input className={inputCls} value={firstName} onChange={(e) => { setFirstName(e.target.value); setSaved(false) }} autoFocus />
            </label>
            <label className="block">
              <span className={labelCls}>Nachname</span>
              <input className={inputCls} value={lastName} onChange={(e) => { setLastName(e.target.value); setSaved(false) }} />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>E-Mail</span>
            <input className={inputCls} value={user?.email ?? ''} disabled />
            <span className="mt-1 block text-xs text-slate-500">
              Die Adresse ist dein Anmeldeschlüssel. Änderungen nimmt die Administration vor.
            </span>
          </label>

          <div>
            <span className={labelCls}>Rollen</span>
            <div className="flex flex-wrap gap-1">
              {(user?.roles ?? []).length === 0 ? (
                <span className="text-sm text-slate-400">—</span>
              ) : (
                (user?.roles ?? []).map((r) => (
                  <span key={r} className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-white">
                    {ROLE_LABELS[r] ?? r}
                  </span>
                ))
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {saved && !error && <p className="text-sm font-semibold text-emerald-700">Gespeichert.</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-mist px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
          >
            Schliessen
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !canSubmit}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Wird gespeichert …' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
