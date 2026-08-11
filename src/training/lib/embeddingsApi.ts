// Client for the embeddings proxy. The provider key lives on the server; the
// browser only ever sends texts and receives vectors.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface EmbeddingResponse {
  vectors: number[][]
  model: string
  dimensions: number
}

/**
 * The server accepts twelve texts per request.
 *
 * That was a fine ceiling while the block held a handful of hand-written
 * samples. Chunking a pasted page produces dozens, so the request is split and
 * the vectors joined. Each text is embedded independently, so batching changes
 * nothing about the result — only how many round trips it takes.
 */
const MAX_PER_REQUEST = 12

export async function embedTexts(texts: string[]): Promise<EmbeddingResponse> {
  if (texts.length <= MAX_PER_REQUEST) return embedBatch(texts)

  const batches: string[][] = []
  for (let i = 0; i < texts.length; i += MAX_PER_REQUEST) {
    batches.push(texts.slice(i, i + MAX_PER_REQUEST))
  }
  // Sequential on purpose: a learner who pasted a long document should not fire
  // ten parallel requests at a shared embedding key.
  const results: EmbeddingResponse[] = []
  for (const batch of batches) results.push(await embedBatch(batch))

  return {
    vectors: results.flatMap((r) => r.vectors),
    model: results[0].model,
    dimensions: results[0].dimensions,
  }
}

async function embedBatch(texts: string[]): Promise<EmbeddingResponse> {
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
