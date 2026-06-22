import { apiBaseUrl } from '../config/configuration'

// Client for the synthetic Swiss market-data MCP server, mounted on the backend at
// POST /mcp (Streamable HTTP, stateless). The server speaks JSON-RPC 2.0 and may
// reply either as plain JSON or as a single Server-Sent-Events frame, so we handle both.

const mcpEndpoint = `${apiBaseUrl}/mcp`

let rpcId = 0
const nextId = () => ++rpcId

/** Parse a JSON-RPC reply that is either raw JSON or an SSE `data:` frame. */
function parseRpcBody(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed)
  }
  const dataLines = trimmed
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
  if (dataLines.length > 0) {
    return JSON.parse(dataLines.join(''))
  }
  return JSON.parse(trimmed)
}

async function rpc(method, params) {
  const res = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Streamable HTTP requires both content types in Accept.
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId(), method, params }),
  })

  const text = await res.text()
  if (!res.ok && !text) {
    throw new Error(`MCP-Server antwortete mit ${res.status}`)
  }
  const msg = parseRpcBody(text)
  if (msg.error) {
    throw new Error(msg.error.message || 'MCP-Fehler')
  }
  return msg.result
}

/** List the tools the server exposes (used for the connection check). */
export async function listMcpTools() {
  const result = await rpc('tools/list', {})
  return result.tools ?? []
}

/**
 * Call a tool. Returns its `structuredContent`. A tool that reports `isError`
 * (e.g. location outside Switzerland) throws with the server's readable message.
 */
export async function callTool(name, args) {
  const result = await rpc('tools/call', { name, arguments: args })
  if (result.isError) {
    const text = result.content?.find((c) => c.type === 'text')?.text
    throw new Error(text || 'Tool meldete einen Fehler.')
  }
  return result.structuredContent
}

export const marketGeocode = (args) => callTool('market_geocode', args)
export const marketSnapshot = (args) => callTool('market_get_snapshot', args)
export const marketListOfferings = (args) => callTool('market_list_offerings', args)
export const marketPriceTrend = (args) => callTool('market_get_price_trend', args)
