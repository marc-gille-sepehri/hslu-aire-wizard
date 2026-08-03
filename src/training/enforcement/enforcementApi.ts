// Client for the enforcement-signal coding study — the coder half of
// hslu-aire-server/src/study/routes.ts (`/api/enforcement-signal`). The bearer
// token comes from the shared training AuthContext.
//
// Contract properties that are study design, not implementation detail:
//   • GET /next hands out exactly ONE item. The client never holds a list of
//     upcoming items, so it cannot sort, group or preview them.
//   • `isAnchor` never appears in a response, so there is nothing to ignore.
//   • POST /rating returns the next item inline. Use it instead of calling
//     /next again — a second call would stamp a second delivery time and
//     inflate the server-side dwell measurement.
//   • A correction is not an update: POST /rating for an already-rated item,
//     and the server links the new record to its predecessor via revisionOf.
//     The client neither sends nor sees that field.
import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

const BASE = `${apiBaseUrl}/api/enforcement-signal`

/** Study role. Administrators reach the route too — see hasCoderAccess(). */
export const CODER_ROLE = 'enforcement-signal-coder'
const ADMIN_ROLE = 'Administrator'

/** Reserved value accepted for every attribute with `allowUndecidable`. */
export const UNDECIDABLE = 'undecidable'

/**
 * Mirrors the server's `requireAnyRole(CODER_ROLE, ADMIN_ROLE)`. An
 * Administrator on the coding route is a coder like any other: own assignment,
 * own pseudonym, own ratings in the export.
 */
export function hasCoderAccess(roles: string[] | undefined): boolean {
  return !!roles?.some((r) => r === CODER_ROLE || r === ADMIN_ROLE)
}

export type AttributeType = 'enum' | 'multi' | 'boolean' | 'integer' | 'text'

export interface AttributeOption {
  /** Keeps its JSON type — the code 0 is the number 0, and 0 !== "0" on POST. */
  value: unknown
  label: string
}

export interface AttributeDef {
  id: string
  label: string
  type: AttributeType
  scale?: 'nominal' | 'ordinal' | 'interval' | 'ratio'
  options: AttributeOption[]
  min?: number
  max?: number
  required: boolean
  help?: string
  allowUndecidable: boolean
  /** Present iff allowUndecidable; always UNDECIDABLE. */
  undecidableValue?: string
}

/**
 * Everything needed to render an item. Split out from StudyItem because the
 * public preview has no assignment and therefore no position in any order.
 */
export interface ItemContent {
  itemId: string
  instrumentShortName: string
  instrumentTitle: string
  provision: string
  /** Norm text with paragraphs and numbering intact; rendered verbatim. */
  excerpt: string
  excerptTruncated: boolean
  /** The attributes this item asks for, fully resolved. */
  attributes: AttributeDef[]
}

export interface StudyItem extends ItemContent {
  /** 1-based position in this coder's frozen order. */
  position: number
  total: number
}

export interface OwnRating {
  ratingId: string
  values: Record<string, unknown>
  lookedUpBeyondExcerpt: boolean
  comment: string
  serverReceivedAt: string
}

export interface ItemWithRating extends StudyItem {
  rating: OwnRating
  canRevise: boolean
}

export interface StudySession {
  /** True when the caller may read but not code. */
  readOnly?: boolean
  studyVersionId: string
  itemsHash: string
  totalItems: number
  completedItems: number
  submitted: boolean
  submittedAt: string | null
  attributeSchema: { version: string; attributes: AttributeDef[] }
}

export interface RatingPayload {
  itemId: string
  /** attribute id -> typed value, or UNDECIDABLE. Optional+empty is omitted. */
  values: Record<string, unknown>
  lookedUpBeyondExcerpt: boolean
  comment?: string
  /** Advisory only — the server measures dwell time itself. */
  clientStartedAt: string
  clientSubmittedAt: string
}

export interface RatingResponse {
  ok: true
  ratingId: string
  isRevision: boolean
  completedItems: number
  totalItems: number
  /** The next unanswered item, or null when everything is coded. */
  next: StudyItem | null
}

export interface SubmitResponse {
  ok: true
  submittedAt: string
  completedItems: number
  totalItems: number
  unanswered: number
}

/** Thrown on non-2xx; carries the server's `code` (NO_OPEN_STUDY, …). */
export class EnforcementError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'EnforcementError'
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
      ...((init?.headers as Record<string, string> | undefined) ?? {}),
    },
  })
  if (!res.ok) {
    let body: any = null
    try {
      body = await res.json()
    } catch {
      // no JSON body
    }
    throw new EnforcementError(
      body?.error || `Anfrage fehlgeschlagen (${res.status})`,
      res.status,
      body?.code,
    )
  }
  return (await res.json()) as T
}

export interface SampleItem {
  /** Size of the item set, for the explanatory text. */
  totalItems: number
  /** One fixed, non-anchor item — the same one for every onlooker. */
  item: ItemContent
}

/**
 * Same endpoint as fetchNextItem(), different half of its branch: without the
 * coder role the server answers with one fixed sample item instead of a
 * position in an assignment. No token is required, nothing is written, and no
 * delivery is stamped — an onlooker's page view stays out of the dwell data.
 */
export async function fetchSampleItem(): Promise<SampleItem> {
  const body = await request<Record<string, unknown>>('/next')
  const { done: _done, readOnly: _readOnly, totalItems, ...item } = body
  return { totalItems: Number(totalItems) || 0, item: item as unknown as ItemContent }
}

/** Own session state: how far this coder is, and whether the run is closed. */
export function fetchSession(): Promise<StudySession> {
  return request<StudySession>('/session')
}

/**
 * The next unanswered item, or null when every item has been rated. The server
 * spreads the item into the response body next to `done`.
 */
export async function fetchNextItem(): Promise<StudyItem | null> {
  const body = await request<Record<string, unknown>>('/next')
  if (body.done) return null
  const { done: _done, ...item } = body
  return item as unknown as StudyItem
}

/** Reopen an already-rated item. The server refuses unanswered ones (403). */
export function fetchItemForCorrection(itemId: string): Promise<ItemWithRating> {
  return request<ItemWithRating>(`/item/${encodeURIComponent(itemId)}`)
}

/** Store a rating. For an already-rated item the server files a revision. */
export function postRating(payload: RatingPayload): Promise<RatingResponse> {
  return request<RatingResponse>('/rating', { method: 'POST', body: JSON.stringify(payload) })
}

/** Close the participation. Afterwards the server rejects further ratings. */
export function postSubmit(): Promise<SubmitResponse> {
  return request<SubmitResponse>('/submit', { method: 'POST', body: '{}' })
}
