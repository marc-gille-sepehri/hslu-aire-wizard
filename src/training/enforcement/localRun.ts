// Two pieces of run state the coder API does not keep, held in localStorage.
//
// 1. The protocol acknowledgement. Spec §6 wants the moment recorded; the
//    server has no endpoint for it, so the timestamp lives here and is NOT part
//    of the study data. If it has to be evidence rather than a gate, it needs a
//    server endpoint — this is deliberately the weaker version.
//
// 2. The list of items this coder already rated, so the correction function has
//    something to offer. The server has no /answered route, and inventing one
//    client-side from /next is impossible. Only items that were already SEEN
//    and answered are stored, so this leaks nothing about what comes next.
//    Consequence: clearing site data or switching browser loses the correction
//    list — the ratings themselves are on the server and unaffected.

const PREFIX = 'aire_es'

export interface CodedItemRef {
  itemId: string
  position: number
  instrumentShortName: string
  provision: string
  /** ISO timestamp of the most recent coding of this item on this device. */
  codedAt: string
}

/** Scope key: one run is one (study version, user) pair. */
export function runKey(studyVersionId: string, email: string): string {
  return `${studyVersionId}:${email}`
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable — the run still works, it just re-asks next time
  }
}

/** ISO timestamp of the acknowledgement, or null if the protocol is unread. */
export function protocolAcknowledgedAt(run: string): string | null {
  return read<string | null>(`${PREFIX}:ack:${run}`, null)
}

export function acknowledgeProtocol(run: string): string {
  const now = new Date().toISOString()
  write(`${PREFIX}:ack:${run}`, now)
  return now
}

/** Already-coded items, most recent first. */
export function codedItems(run: string): CodedItemRef[] {
  return read<CodedItemRef[]>(`${PREFIX}:coded:${run}`, [])
}

/** Record (or refresh) one coded item. Corrections update the existing entry. */
export function recordCodedItem(run: string, ref: Omit<CodedItemRef, 'codedAt'>): void {
  const key = `${PREFIX}:coded:${run}`
  const rest = codedItems(run).filter((c) => c.itemId !== ref.itemId)
  write(key, [{ ...ref, codedAt: new Date().toISOString() }, ...rest])
}
