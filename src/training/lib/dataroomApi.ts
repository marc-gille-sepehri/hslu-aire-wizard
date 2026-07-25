// Client for the DATENRAUM data room (metamodel + later graph/table queries).
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface OntologyAttribute {
  name: string
  type: string
  label: string
  enum?: string[]
}
export interface OntologyReference {
  field: string
  to: string
  rel: string
  label: string
  array?: boolean
}
export interface OntologyEntity {
  name: string
  label: string
  plural: string
  icon: string
  graphAs: 'node' | 'edge'
  status: 'erp' | 'extension'
  attributes: OntologyAttribute[]
  references: OntologyReference[]
}
export interface OntologyRelationship {
  from: string
  to: string
  rel: string
  label: string
  array: boolean
}
export interface Ontology {
  db: string
  entities: OntologyEntity[]
  relationships: OntologyRelationship[]
}

export async function fetchOntology(): Promise<Ontology> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/dataroom/ontology`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Ontologie konnte nicht geladen werden (${res.status})`)
  return (await res.json()) as Ontology
}

export interface QueryResult {
  collection: string
  columns: string[]
  rows: Record<string, unknown>[]
  count: number
  limit: number
}

/** Run a read-only SQL query against DATENRAUM (translated to Mongo server-side). */
export async function runQuery(sql: string): Promise<QueryResult> {
  const token = getStoredToken()
  const res = await fetch(`${apiBaseUrl}/dataroom/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ sql }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Abfrage fehlgeschlagen (${res.status})`)
  return body as QueryResult
}

// ── Object graph ────────────────────────────────────────────────────────────
export interface GraphNode { id: string; type: string; label: string }
export interface GraphEdge { id: string; source: string; target: string; rel: string; label: string; via?: string }
export interface GraphData { nodes: GraphNode[]; edges: GraphEdge[] }

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchGraphTypes(): Promise<{ type: string; count: number }[]> {
  const res = await fetch(`${apiBaseUrl}/dataroom/graph/types`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Graph-Typen konnten nicht geladen werden (${res.status})`)
  return (await res.json()).types
}
export async function fetchGraphStart(type: string, limit = 6): Promise<GraphData> {
  const res = await fetch(`${apiBaseUrl}/dataroom/graph/start?type=${encodeURIComponent(type)}&limit=${limit}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Graph konnte nicht geladen werden (${res.status})`)
  return await res.json()
}
export async function fetchGraphNeighbors(id: string, limit = 40): Promise<GraphData> {
  const res = await fetch(`${apiBaseUrl}/dataroom/graph/neighbors/${encodeURIComponent(id)}?limit=${limit}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Nachbarn konnten nicht geladen werden (${res.status})`)
  return await res.json()
}

export interface CypherResult extends GraphData {
  rows: Record<string, unknown>[]
  columns: string[]
  matchCount: number
}

/** Run a bounded Cypher query over the in-memory graph; returns the matched subgraph. */
export async function runCypher(cypher: string): Promise<CypherResult> {
  const res = await fetch(`${apiBaseUrl}/dataroom/graph/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ cypher }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Abfrage fehlgeschlagen (${res.status})`)
  return body as CypherResult
}
