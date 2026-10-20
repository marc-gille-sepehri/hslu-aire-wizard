// Client für den Entscheidungsmodell-Baustein. Ob Jev antwortet oder ein
// nachgestelltes LLM, entscheidet der Server — und sagt es in `engine`.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'
import type { DecisionQuestion } from '../schema/types'

export type Engine = 'jev' | 'simulated'

export interface EngineInfo {
  engine: Engine
  model: string
}

export interface DecisionAnswer {
  id: string
  kind: DecisionQuestion['kind']
  /** In der Reihenfolge der Optionen bzw. Stufen; noul: [wahr, falsch]. */
  probabilities: { label: string; p: number }[]
  top: string
  confidence: number | null
  noul?: number
}

export interface DecisionResult {
  engine: Engine
  model: string
  answers: DecisionAnswer[]
  usage?: { inputTokens: number; outputTokens: number }
}

function headers(): Record<string, string> {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function failure(res: Response, fallback: string): Promise<Error> {
  let message = `${fallback} (${res.status})`
  try {
    const body = await res.json()
    if (body?.error) message = body.error
  } catch {
    // no JSON body
  }
  return new Error(message)
}

export async function fetchEngine(): Promise<EngineInfo> {
  const res = await fetch(`${apiBaseUrl}/decision/engine`, { headers: headers() })
  if (!res.ok) throw await failure(res, 'Modellinfo nicht verfügbar')
  return (await res.json()) as EngineInfo
}

export async function evaluateDecision(
  situation: string,
  questions: (DecisionQuestion & { id: string })[],
): Promise<DecisionResult> {
  const res = await fetch(`${apiBaseUrl}/decision/evaluate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ situation, questions }),
  })
  if (!res.ok) throw await failure(res, 'Auswertung fehlgeschlagen')
  return (await res.json()) as DecisionResult
}
