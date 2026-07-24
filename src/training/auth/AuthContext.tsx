import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { fetchMe, type AuthUser } from './authApi'

const TOKEN_KEY = 'aire_training_token'

/** Read/write the token in localStorage so it survives reloads (30-day JWT). */
export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage unavailable — session stays in memory only
  }
}

interface AuthState {
  status: 'checking' | 'authenticated' | 'anonymous'
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('checking')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // On mount, validate any stored token against the server (/auth/me).
  useEffect(() => {
    let cancelled = false
    const stored = getStoredToken()
    if (!stored) {
      setStatus('anonymous')
      return
    }
    ;(async () => {
      try {
        const me = await fetchMe(stored)
        if (cancelled) return
        setUser(me)
        setToken(stored)
        setStatus('authenticated')
      } catch {
        if (cancelled) return
        storeToken(null)
        setStatus('anonymous')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = (newToken: string, newUser: AuthUser) => {
    storeToken(newToken)
    setToken(newToken)
    setUser(newUser)
    setStatus('authenticated')
  }

  const logout = () => {
    storeToken(null)
    setToken(null)
    setUser(null)
    setStatus('anonymous')
  }

  return (
    <AuthContext.Provider value={{ status, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
