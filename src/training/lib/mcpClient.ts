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
