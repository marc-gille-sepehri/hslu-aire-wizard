import { useState, type FormEvent } from 'react'
import { labels } from '../labels'
import { requestOtp, verifyOtp, AuthError } from './authApi'
import { useAuth } from './AuthContext'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const t = labels.auth

type Step = 'email' | 'code'

/**
 * Passwordless login screen shown when the training area is accessed without a
 * valid session. Step 1 collects the email and requests a code; step 2 verifies
 * the code and hands the token to the AuthContext.
 */
export default function LoginGate() {
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = email.trim()
    if (!EMAIL_RE.test(trimmed)) {
      setError(t.invalidEmail)
      return
    }
    setBusy(true)
    try {
      await requestOtp(trimmed)
      setStep('code')
      setCode('')
    } catch {
      setError(t.genericRequestError)
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!code.trim()) return
    setBusy(true)
    try {
      const { token, user } = await verifyOtp(email.trim(), code.trim())
      login(token, user)
    } catch (err) {
      const ae = err as AuthError
      if (ae.code === 'OTP_WRONG') {
        setError(
          typeof ae.remainingAttempts === 'number' && ae.remainingAttempts > 0
            ? t.wrongCodeRemaining(ae.remainingAttempts)
            : t.wrongCode,
        )
      } else if (ae.code === 'OTP_LOCKED') {
        setError(t.lockedCode)
      } else if (ae.code === 'NO_USER') {
        setError(t.noUser)
      } else if (ae.code === 'OTP_INVALID') {
        setError(t.expiredCode)
      } else {
        setError(t.wrongCode)
      }
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    setError(null)
    setBusy(true)
    try {
      await requestOtp(email.trim())
      setCode('')
    } catch {
      setError(t.genericRequestError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-mist bg-white shadow-md overflow-hidden">
          <div className="bg-navy px-8 py-7">
            <div className="text-white text-2xl font-bold tracking-tight">
              AI<span className="text-gold">@</span>RE
            </div>
            <div className="text-white/70 text-xs uppercase tracking-kicker mt-1">
              Training · Login
            </div>
          </div>

          <div className="px-8 py-8">
            {step === 'email' ? (
              <form onSubmit={submitEmail} noValidate>
                <h1 className="font-display text-xl font-bold text-navy mb-2">{t.heading}</h1>
                <p className="text-slate-500 text-sm mb-6">{t.intro}</p>

                <label htmlFor="login-email" className="block text-sm font-semibold text-navy mb-1">
                  {t.emailLabel}
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full rounded-md border border-mist bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30"
                />

                {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="mt-6 w-full rounded-md bg-gold px-4 py-2.5 font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60"
                >
                  {busy ? t.sending : t.requestCode}
                </button>
              </form>
            ) : (
              <form onSubmit={submitCode} noValidate>
                <h1 className="font-display text-xl font-bold text-navy mb-2">{t.codeHeading}</h1>
                <p className="text-slate-500 text-sm mb-6">{t.codeSentTo(email.trim())}</p>

                <label htmlFor="login-code" className="block text-sm font-semibold text-navy mb-1">
                  {t.codeLabel}
                </label>
                <input
                  id="login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.codePlaceholder}
                  className="w-full rounded-md border border-mist bg-white px-3 py-2.5 text-center text-2xl tracking-[0.5em] font-semibold text-navy outline-none focus:border-navy focus:ring-4 focus:ring-gold/30"
                />

                {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

                <button
                  type="submit"
                  disabled={busy || code.length === 0}
                  className="mt-6 w-full rounded-md bg-gold px-4 py-2.5 font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60"
                >
                  {busy ? t.verifying : t.verify}
                </button>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email')
                      setError(null)
                    }}
                    className="text-slate-500 hover:text-navy"
                  >
                    {t.back}
                  </button>
                  <button
                    type="button"
                    onClick={resend}
                    disabled={busy}
                    className="font-semibold text-navy hover:text-gold-dark disabled:opacity-60"
                  >
                    {t.resend}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
