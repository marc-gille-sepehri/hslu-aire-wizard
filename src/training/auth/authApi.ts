// Auth API client for the training-area login (passwordless email OTP).
// Talks to the hslu-aire-server /auth/* endpoints; base URL comes from the
// shared app config (test -> localhost:9011, production -> App Runner).
import { apiBaseUrl } from '../../config/configuration'

export interface AuthUser {
  email: string
  firstName: string
  lastName: string
  roles: string[]
}

export interface VerifyResult {
  token: string
  user: AuthUser
}

/** Thrown on non-2xx responses; carries the server's error `code` when present. */
export class AuthError extends Error {
  code?: string
  status: number
  remainingAttempts?: number
  constructor(message: string, status: number, code?: string, remainingAttempts?: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
    this.code = code
    this.remainingAttempts = remainingAttempts
  }
}

async function parseError(res: Response): Promise<AuthError> {
  let body: any = null
  try {
    body = await res.json()
  } catch {
    // no JSON body
  }
  return new AuthError(
    body?.error || `Request failed (${res.status})`,
    res.status,
    body?.code,
    body?.remainingAttempts,
  )
}

/** Request a one-time code by email. Always resolves for known+unknown addresses. */
export async function requestOtp(email: string): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  })
  if (!res.ok) throw await parseError(res)
}

/** Exchange an email + code for a JWT and the user profile. */
export async function verifyOtp(email: string, code: string): Promise<VerifyResult> {
  const res = await fetch(`${apiBaseUrl}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  })
  if (!res.ok) throw await parseError(res)
  return res.json()
}

/** Validate a stored token and return the current profile, or throw AuthError(401). */
export async function fetchMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw await parseError(res)
  const body = await res.json()
  return body.user
}
