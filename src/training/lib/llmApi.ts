// Client for the training LLM playground endpoints on hslu-aire-server.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface ParamSpec {
  key: 'temperature' | 'maxTokens'
  label: string
  min: number
  max: number
  step: number
  default: number
}

export interface ModelInfo {
  id: string
  label: string
  provider: 'anthropic' | 'apertus'
  available: boolean
  note?: string
  params: ParamSpec[]
}

export interface CompleteResult {
  text: string
  model: string
  stopReason: string | null
  refused: boolean
  usage?: { inputTokens: number; outputTokens: number }
}

export async function fetchModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${apiBaseUrl}/llm/models`)
  if (!res.ok) throw new Error(`models ${res.status}`)
  const body = await res.json()
  return body.models as ModelInfo[]
}

export interface CompleteInput {
  modelId: string
  prompt: string
  temperature?: number
  maxTokens?: number
}

export async function complete(input: CompleteInput): Promise<CompleteResult> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/llm/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    let msg = `Anfrage fehlgeschlagen (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch {
      // no JSON body
    }
    throw new Error(msg)
  }
  return res.json()
}
