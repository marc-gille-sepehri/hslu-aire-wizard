// Client für die agentische Orchestrierung.
//
// Der Werkzeugkasten gehört der Person, nicht dem Block — wie der Arbeitsbereich
// in `agent_trace`. Jede Instanz des Widgets, in jedem Modul, arbeitet mit
// derselben Liste.

import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export type ParamType = 'string' | 'number' | 'boolean' | 'date' | 'list'

export interface ToolParam {
  name: string
  type: ParamType
  description: string
  required: boolean
}

export interface ToolSpec {
  toolId: string
  name: string
  description: string
  params: ToolParam[]
}

export type ArgumentSource = 'literal' | 'user' | 'step' | 'unknown'

export interface PlanArgument {
  name: string
  source: ArgumentSource
  value?: string
  fromStep?: number
  /** Der Parameter ist im Werkzeug gar nicht deklariert. */
  undeclared?: boolean
}

export interface PlanStep {
  n: number
  tool: string
  purpose: string
  arguments: PlanArgument[]
  dependsOn: number[]
  /** Stufe im Ablauf — gleiche Stufe heisst: könnte gleichzeitig laufen. */
  wave: number
}

export interface Plan {
  summary: string
  steps: PlanStep[]
  rejected: { tool: string; purpose: string; reason: string }[]
  gaps: { need: string; why: string }[]
  assumptions: string[]
  missingRequired: { step: number; tool: string; params: string[] }[]
  waves: number
  model: string
}

export interface Limits {
  maxTools: number
  maxParams: number
  maxPromptChars: number
}

export interface ToolboxResponse {
  tools: ToolSpec[]
  updatedAt: string
  limits?: Limits
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/orchestration${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    let message = `Der Server antwortete mit ${res.status}.`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      // kein JSON-Body
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export const fetchToolbox = () => call<ToolboxResponse>('/toolbox')

export const saveToolbox = (tools: ToolSpec[]) =>
  call<ToolboxResponse>('/toolbox', { method: 'PUT', body: JSON.stringify({ tools }) })

export const resetToolbox = () => call<ToolboxResponse>('/reset', { method: 'POST' })

export const requestPlan = (request: string) =>
  call<{ plan: Plan }>('/plan', { method: 'POST', body: JSON.stringify({ request }) })

/** Neues, leeres Werkzeug für den Editor. Die Id vergibt der Server endgültig. */
export function blankTool(): ToolSpec {
  return {
    toolId: `neu_${Math.random().toString(36).slice(2, 10)}`,
    name: '',
    description: '',
    params: [],
  }
}

export const PARAM_TYPES: { value: ParamType; label: string }[] = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'boolean', label: 'Ja/Nein' },
  { value: 'date', label: 'Datum' },
  { value: 'list', label: 'Liste' },
]
