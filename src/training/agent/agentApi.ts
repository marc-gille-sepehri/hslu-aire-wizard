// Client for the agent-trace widget.
//
// The workspace belongs to the user, so every instance of the block — in any
// module, in any course — talks to the same endpoints and follows the same
// stream. There is no per-block state worth keeping here.

import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export type StepVerb = 'see' | 'think' | 'would_do'
export type WorkspaceState = 'idle' | 'running' | 'queued' | 'halted'

export interface Influence {
  path: string
  span?: [number, number]
  quote?: string
  verified: boolean
}

export interface RunStep {
  n: number
  kind: 'tool' | 'model'
  verb: StepVerb
  say: string
  tool?: string
  args?: Record<string, unknown>
  resultDigest?: string
  stopReason?: string
  ms: number
  influencedBy?: Influence[]
  intentId?: string
  at: string
}

export interface IntentPreviewField {
  label: string
  value: string
  emphasis?: boolean
}

export interface IntentPreview {
  kind: 'mail' | 'file' | 'task' | 'meeting'
  title: string
  fields: IntentPreviewField[]
  before?: string
  after?: string
}

export interface RunIntent {
  intentId: string
  tool: string
  payload: Record<string, unknown>
  preview: IntentPreview
  atStep: number
  approved: boolean | null
  approvedAt?: string
  rejectedReason?: string
  unattended: boolean
}

export interface Run {
  runId: string
  workspaceId: string
  agentId: string
  agentName: string
  scenarioId: string
  trigger: { type: string; detail: string; at: string }
  startedAt: string
  endedAt: string | null
  steps: RunStep[]
  intents: RunIntent[]
  tokens: { in: number; out: number }
  stoppedBy: string | null
  stopMessage?: string
  payloadsDropped?: boolean
}

export interface AgentDef {
  agentId: string
  name: string
  description: string
  trigger: {
    type: 'file' | 'message' | 'timer'
    match: { folder?: string; pattern?: string; subjectContains?: string; everyMinutes?: number }
  }
  tools: string[]
  instruction: string
  model: string
  maxSteps: number
  enabled: boolean
  lastFiredAt?: string
}

export interface QueuedEvent {
  eventId: string
  agentId: string
  trigger: { type: string; detail: string; at: string }
  queuedAt: string
}

export interface Workspace {
  workspaceId: string
  scenarioId: string
  state: WorkspaceState
  activeRunId: string | null
  agents: AgentDef[]
  queue: QueuedEvent[]
  budget: {
    runsThisHour: number
    runsPerHourLimit: number
    tokensToday: number
    tokensPerDayLimit: number
  }
  contentsExpired?: boolean
  contentsExpireAt: string
}

export interface ScenarioFile {
  path: string
  mime: string
  pages?: number
  size: number
  body: string
}

export interface ScenarioMail {
  id: string
  from: string
  to?: string
  subject: string
  receivedAt: string
  body: string
  unread?: boolean
}

export interface LoadedScenario {
  scenarioId: string
  title: string
  brief: string
  moduleHint?: string
  files: ScenarioFile[]
  mailbox: ScenarioMail[]
}

export interface ToolInfo {
  name: string
  display: string
  description: string
  side: 'read' | 'record'
}

export interface AgentState {
  workspace: Workspace
  scenario: LoadedScenario | null
  scenarios: { scenarioId: string; title: string; brief: string; moduleHint?: string; files: number; mails: number }[]
  run: Run | null
  models: { id: string; label: string; note?: string }[]
  tools: { read: ToolInfo[]; record: ToolInfo[] }
  limits: { maxSteps: number; minTimerMinutes: number }
}

export type AgentEvent =
  | { type: 'snapshot'; workspace: Workspace; run: Run | null }
  | { type: 'workspace'; workspace: Workspace }
  | { type: 'run_started'; run: Run }
  | { type: 'step'; runId: string; step: RunStep }
  | { type: 'intent'; runId: string; intent: RunIntent }
  | { type: 'intent_resolved'; runId: string; intent: RunIntent }
  | { type: 'run_ended'; run: Run }
  | { type: 'queue'; queue: QueuedEvent[] }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/agent${path}`, {
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
      // no JSON body
    }
    throw new Error(message)
  }
  return (await res.json()) as T
}

export const fetchState = () => call<AgentState>('/state')

export const startRun = (agentId: string) =>
  call<{ runId?: string; queued?: boolean }>('/run', {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  })

export const haltRun = () => call<{ ok: true }>('/halt', { method: 'POST' })

export const decideIntent = (runId: string, intentId: string, approved: boolean, reason?: string) =>
  call<{ ok: true }>(`/runs/${runId}/intents/${intentId}`, {
    method: 'POST',
    body: JSON.stringify({ approved, reason }),
  })

export const saveAgent = (agent: Partial<AgentDef> & { agentId?: string }) =>
  agent.agentId
    ? call<{ agent: AgentDef }>(`/agents/${agent.agentId}`, {
        method: 'PUT',
        body: JSON.stringify(agent),
      })
    : call<{ agent: AgentDef }>('/agents', { method: 'POST', body: JSON.stringify(agent) })

export const removeAgent = (agentId: string) =>
  call<{ ok: true }>(`/agents/${agentId}`, { method: 'DELETE' })

export const loadScenario = (scenarioId: string) =>
  call<{ workspace: Workspace; scenario: LoadedScenario }>('/scenario', {
    method: 'POST',
    body: JSON.stringify({ scenarioId }),
  })

export const fetchRun = (runId: string) => call<{ run: Run }>(`/runs/${runId}`)

export const fetchRuns = () =>
  call<{ runs: { runId: string; agentName: string; startedAt: string; endedAt: string | null; steps: number; unapproved: number; stoppedBy: string | null; trigger: { detail: string } }[] }>(
    '/runs',
  )

export const deleteEverything = () => call<{ ok: true }>('/data', { method: 'DELETE' })

/**
 * Subscribe to the workspace stream.
 *
 * Read through `fetch` rather than `EventSource` for one reason: EventSource
 * cannot set an Authorization header, and the alternative — putting the JWT in
 * the query string — writes a credential into logs and history. The parsing
 * cost is a dozen lines.
 */
export function streamWorkspace(
  onEvent: (event: AgentEvent) => void,
  onError: (message: string) => void,
): () => void {
  const controller = new AbortController()
  let stopped = false
  let retry = 0

  const connect = async (): Promise<void> => {
    while (!stopped) {
      try {
        const token = getStoredToken()
        const res = await fetch(`${apiBaseUrl}/agent/stream`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal,
        })
        if (!res.ok || !res.body) throw new Error(`Stream ${res.status}`)
        retry = 0

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let cut = buffer.indexOf('\n\n')
          while (cut !== -1) {
            const frame = buffer.slice(0, cut)
            buffer = buffer.slice(cut + 2)
            for (const line of frame.split('\n')) {
              if (!line.startsWith('data:')) continue // ": ping" heartbeats
              try {
                onEvent(JSON.parse(line.slice(5).trim()) as AgentEvent)
              } catch {
                // a truncated frame is not worth surfacing to a learner
              }
            }
            cut = buffer.indexOf('\n\n')
          }
        }
      } catch (err) {
        if (stopped || controller.signal.aborted) return
        if (retry === 0) onError('Verbindung zum Arbeitsbereich unterbrochen — versuche erneut …')
      }
      if (stopped) return
      // Back off, but stay well under the point where a learner gives up on a
      // widget whose whole promise is that it streams.
      retry = Math.min(retry + 1, 5)
      await new Promise((r) => setTimeout(r, retry * 1000))
    }
  }

  void connect()
  return () => {
    stopped = true
    controller.abort()
  }
}
