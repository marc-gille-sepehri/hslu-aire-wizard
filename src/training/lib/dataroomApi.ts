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
