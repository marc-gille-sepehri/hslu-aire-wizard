import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

// Minimal MCP client over stateless Streamable HTTP — no SDK dependency.
//
// Our MCP servers (hslu-aire-server /mcp, /mcp/zapfloor, /mcp/salto) run
// stateless: each POST is an independent JSON-RPC request and the response is an
// SSE frame (`event: message\ndata: {json}`). `tools/list` and `tools/call` work
// without an initialize handshake; CORS is open on those servers. External MCP
// servers that don't send CORS headers can't be reached from the browser.

export interface McpProp {
  type?: string | string[]
  description?: string
  enum?: unknown[]
  minimum?: number
  maximum?: number
  default?: unknown
}
export interface McpToolDef {
  name: string
  title?: string
  description?: string
  inputSchema?: { type?: string; properties?: Record<string, McpProp>; required?: string[] } | null
}
export interface McpServerInfo {
  name?: string
  version?: string
}
export interface McpContentPart {
  type: string
  text?: string
  [k: string]: unknown
}
export interface McpCallResult {
  content?: McpContentPart[]
  isError?: boolean
  [k: string]: unknown
}

const PROTOCOL_VERSION = '2025-06-18'
let idCounter = 1

export class McpError extends Error {}

interface JsonRpcResponse {
  result?: unknown
  error?: { code?: number; message?: string }
  id?: unknown
}

/** Return the response frame from an SSE body (skips interleaved notifications). */
function parseSse(text: string): JsonRpcResponse {
  const frames = text
    .split(/\r?\n/)
    .filter((l) => l.startsWith('data:'))
    .map((l) => {
      try {
        return JSON.parse(l.slice(5).trim()) as JsonRpcResponse
      } catch {
        return null
      }
    })
    .filter((f): f is JsonRpcResponse => f != null)
  const response = frames.find((f) => f.result !== undefined || f.error !== undefined)
  if (!response) throw new McpError('Keine gültige Antwort vom MCP-Server.')
  return response
}

async function rpc<T>(url: string, method: string, params: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: idCounter++, method, params }),
      signal,
    })
  } catch (e) {
    // Network / CORS failures land here (opaque to the browser).
    throw new McpError('Verbindung fehlgeschlagen (URL erreichbar? CORS erlaubt?).')
  }
  if (!res.ok) throw new McpError(`Server antwortete mit HTTP ${res.status}.`)
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  let payload: JsonRpcResponse
  try {
    payload = ct.includes('text/event-stream') ? parseSse(text) : (JSON.parse(text) as JsonRpcResponse)
  } catch (e) {
    if (e instanceof McpError) throw e
    throw new McpError('Antwort des Servers konnte nicht gelesen werden.')
  }
  if (payload.error) throw new McpError(payload.error.message || 'MCP-Fehler.')
  return payload.result as T
}

export async function mcpInitialize(url: string, signal?: AbortSignal): Promise<McpServerInfo> {
  const result = await rpc<{ serverInfo?: McpServerInfo }>(
    url,
    'initialize',
    { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'aire-training', version: '1.0' } },
    signal,
  )
  return result?.serverInfo ?? {}
}

export async function mcpListTools(url: string, signal?: AbortSignal): Promise<McpToolDef[]> {
  const result = await rpc<{ tools?: McpToolDef[] }>(url, 'tools/list', {}, signal)
  return result?.tools ?? []
}

export async function mcpCallTool(
  url: string,
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<McpCallResult> {
  return rpc<McpCallResult>(url, 'tools/call', { name, arguments: args }, signal)
}

// ── Über unseren Server ─────────────────────────────────────────────────────
//
// Der direkte Weg oben funktioniert nur bei Servern, die CORS für unseren
// Origin öffnen — also praktisch nur bei unseren eigenen. Alles andere läuft
// über den Proxy, der nebenbei die Anmeldung erledigt: verlangt ein Server
// OAuth, führt der Server den Dance und behält das Token. Im Browser landet es
// nie, was bei einem Werkzeug, in das jemand sein echtes Konto hängt, die
// richtige Seite ist.

export type ProbeResult =
  | { state: 'connected'; authenticated: boolean; tools: McpToolDef[] }
  | { state: 'auth_required'; authorizationUrl: string; resourceMetadata?: string }
  | { state: 'error'; error: string; code?: string }

async function viaServer<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/mcp-connect${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    let message = `Der Server antwortete mit ${res.status}.`
    try {
      const b = await res.json()
      if (b?.error) message = b.error
    } catch {
      // kein JSON-Body
    }
    throw new McpError(message)
  }
  return (await res.json()) as T
}

/** URL anfassen: verbunden, Anmeldung nötig, oder Fehler. */
export function mcpProbe(url: string, signal?: AbortSignal): Promise<ProbeResult> {
  return viaServer<ProbeResult>('/probe', { url }, signal)
}

type RpcEnvelope = { state: 'ok'; result: unknown } | { state: 'auth_required' } | { state: 'error'; error: string }

async function proxyRpc<T>(url: string, method: string, params: unknown, signal?: AbortSignal): Promise<T> {
  const out = await viaServer<RpcEnvelope>('/rpc', { url, method, params }, signal)
  if (out.state === 'auth_required') throw new McpAuthRequiredError()
  if (out.state === 'error') throw new McpError(out.error)
  return out.result as T
}

/** Das Token ist abgelaufen oder wurde zurückgezogen — neu anmelden. */
export class McpAuthRequiredError extends McpError {
  constructor() {
    super('Für diesen Server ist eine Anmeldung nötig.')
    this.name = 'McpAuthRequiredError'
  }
}

export async function mcpListToolsViaServer(url: string, signal?: AbortSignal): Promise<McpToolDef[]> {
  const result = await proxyRpc<{ tools?: McpToolDef[] }>(url, 'tools/list', {}, signal)
  return result?.tools ?? []
}

export function mcpCallToolViaServer(
  url: string,
  name: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<McpCallResult> {
  return proxyRpc<McpCallResult>(url, 'tools/call', { name, arguments: args }, signal)
}

export async function mcpDisconnect(url: string): Promise<void> {
  await viaServer('/disconnect', { url })
}

/**
 * Öffnet das Anmeldefenster und wartet, bis der Callback sich meldet.
 *
 * Über `postMessage` und nicht über Polling: der Callback liegt auf unserem
 * API-Origin, das Fenster kann also zurückrufen. Der Fallback auf `closed`
 * fängt den Fall, dass jemand das Fenster einfach zumacht.
 */
export function runOAuthPopup(authorizationUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const win = window.open(authorizationUrl, 'aire-mcp-oauth', 'width=520,height=700')
    if (!win) {
      resolve(false)
      return
    }
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.removeEventListener('message', onMessage)
      clearInterval(timer)
      resolve(ok)
    }
    const onMessage = (e: MessageEvent) => {
      if (e.data?.source === 'aire-mcp-oauth') finish(Boolean(e.data.ok))
    }
    window.addEventListener('message', onMessage)
    // Zugeklappt ohne Nachricht: als Abbruch werten, aber die Verbindung
    // trotzdem prüfen lassen — manche Browser blocken die Nachricht.
    const timer = window.setInterval(() => {
      if (win.closed) finish(false)
    }, 500)
  })
}
