// Client for the embeddings proxy. The provider key lives on the server; the
// browser only ever sends texts and receives vectors.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface EmbeddingResponse {
  vectors: number[][]
  model: string
  dimensions: number
}

export async function embedTexts(texts: string[]): Promise<EmbeddingResponse> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ texts }),
  })
  if (!res.ok) {
    let message = `Embeddings fehlgeschlagen (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // no JSON body
    }
    throw new Error(message)
  }
  return (await res.json()) as EmbeddingResponse
}
