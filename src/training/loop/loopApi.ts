// Client der Schleifenlektion — die andere Hälfte von hslu-aire-server/src/loop.
//
// Eigenschaften des Vertrags, die Didaktik sind und nicht Implementierung:
//   • Ein Schritt ist ein Request. Der Server führt genau einen Modellaufruf
//     aus und kehrt zurück; eine Schleife im Client gäbe es nicht zu sehen.
//   • `/config` liefert Systemprompt und Werkzeugdeklarationen wortwörtlich.
//     Sie werden angezeigt, nicht nacherzählt.
//   • Der rohe Durchlauf kommt über eine eigene Route. Die Ablaufsicht soll
//     nicht bei Durchlauf zehn das ganze Gespräch mitschleppen.

import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

const BASE = `${apiBaseUrl}/loop`

export type TurnOutcome = 'tool_use' | 'final' | 'max_turns' | 'error'
export type LoopRunStatus = 'awaiting_step' | 'running' | 'completed' | 'stopped' | 'error'

export interface ToolCall {
  toolUseId: string
  name: string
  input: Record<string, unknown>
  output: unknown
  digest: string
  say: string
  unknown?: boolean
  ms: number
}

export interface TurnSummary {
  index: number
  ms: number
  thinking: string
  text: string
  stopReason: string | null
  outcome: TurnOutcome
  tokensIn: number
  tokensOut: number
  /** Grösse des Gesprächs BEI diesem Aufruf — die Zahl, die wächst. */
  messageCount: number
  toolCalls: ToolCall[]
  error?: string
}

export interface CostPicture {
  turns: number
  tokensIn: number
  tokensOut: number
  /** Anteil des Verbrauchs, der aus wiederholt mitgeschicktem Gespräch entsteht. */
  resentShare: number | null
}

export interface Budget {
  runsThisHour: number
  runsPerHourLimit: number
  tokensToday: number
  tokensPerDayLimit: number
}

export interface LoopRun {
  runId: string
  scenarioId: ScenarioId
  task: string
  model: string
  status: LoopRunStatus
  maxTurns: number
  createdAt: string
  endedAt: string | null
  answer: string
  error: string
  turns: TurnSummary[]
  messageCount: number
  cost: CostPicture
  budget?: Budget
}

export interface ToolDeclaration {
  name: string
  description?: string
  input_schema: unknown
}

export type ScenarioId = 'scn_offerten_v1' | 'scn_rollen_cfo_v1'

export interface ScenarioInfo {
  id: ScenarioId
  label: string
  note: string
  /** Bringt der Lernende ein Dokument mit? */
  usesDocument: boolean
}

export interface LoopConfig {
  models: { id: string; label: string; note: string }[]
  defaultModel: string
  maxTurns: number
  scenarioId: ScenarioId
  scenarios: ScenarioInfo[]
  usesDocument: boolean
  defaultTask: string
  systemPrompt: string
  tools: ToolDeclaration[]
  toolCount: number
  beispiel: string
  budget: Budget
  limits: { maxDocumentChars: number; maxTaskChars: number }
}

/** Der rohe Durchlauf — nur die Protokollsicht holt ihn. */
export interface RawTurn {
  index: number
  startedAt: string
  ms: number
  request: {
    model: string
    system: string
    messages: unknown[]
    tools: ToolDeclaration[]
  }
  response: {
    thinking: string
    text: string
    stopReason: string | null
    tokensIn: number
    tokensOut: number
    content: unknown[]
  }
  outcome: TurnOutcome
  toolCalls: ToolCall[]
  error?: string
}

export class LoopApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'LoopApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    let body: any = null
    try {
      body = await res.json()
    } catch {
      // kein JSON-Körper
    }
    throw new LoopApiError(body?.error || `Anfrage fehlgeschlagen (${res.status})`, res.status, body?.code)
  }
  return (await res.json()) as T
}

export function fetchConfig(scenarioId?: string): Promise<LoopConfig> {
  const q = scenarioId ? `?scenarioId=${encodeURIComponent(scenarioId)}` : ''
  return request<LoopConfig>(`/config${q}`)
}

export function startRun(input: {
  document: string
  task: string
  model: string
  scenarioId: string
}): Promise<LoopRun> {
  return request<LoopRun>('/runs', { method: 'POST', body: JSON.stringify(input) })
}

/** Genau ein Durchlauf. Kann je nach Modell und Werkzeugen einige Sekunden dauern. */
export function stepRun(runId: string): Promise<LoopRun> {
  return request<LoopRun>(`/runs/${encodeURIComponent(runId)}/step`, { method: 'POST', body: '{}' })
}

export function fetchRun(runId: string): Promise<LoopRun> {
  return request<LoopRun>(`/runs/${encodeURIComponent(runId)}`)
}

export function fetchRawTurn(runId: string, index: number): Promise<RawTurn> {
  return request<RawTurn>(`/runs/${encodeURIComponent(runId)}/turns/${index}`)
}
