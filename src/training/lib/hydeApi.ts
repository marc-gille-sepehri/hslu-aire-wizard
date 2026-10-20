// Client für das HyDE-Phantombild. Eingebettet wird anschliessend über
// embeddingsApi — derselbe Weg wie beim Embedding-Vergleich, damit Frage,
// Phantombild und Sammlung im selben Vektorraum liegen.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface PhantomResult {
  phantom: string
  model: string
}

export async function writePhantom(question: string, generatorPrompt?: string): Promise<PhantomResult> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/hyde/phantom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, generatorPrompt }),
  })
  if (!res.ok) {
    let message = `Phantombild fehlgeschlagen (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // no JSON body
    }
    throw new Error(message)
  }
  return (await res.json()) as PhantomResult
}
