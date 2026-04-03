import { apiBaseUrl } from '../config/configuration'

/**
 * Full nominee list from server (order and labels). No vote counts.
 */
export async function fetchAwardCandidates() {
  const res = await fetch(`${apiBaseUrl}/award-candidates`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Kandidaten konnten nicht geladen werden.')
  }
  return data.candidates ?? []
}

/**
 * Vote totals from MongoDB, keyed by candidate id in `candidates`.
 */
export async function fetchAwardVoteStats() {
  const res = await fetch(`${apiBaseUrl}/award-vote-stats`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Abstimmungsstatistik konnte nicht geladen werden.')
  }
  return {
    totalVotes: data.totalVotes ?? 0,
    candidates: data.candidates ?? [],
  }
}

/**
 * Bar chart data: list + order from GET /award-candidates; votes from GET /award-vote-stats.
 * If stats fail, still returns all nominees with votes 0.
 */
export async function fetchAwardResultsForChart() {
  const meta = await fetchAwardCandidates()

  let stats = null
  try {
    stats = await fetchAwardVoteStats()
  } catch {
    stats = null
  }

  const voteMap = {}
  let totalVotes = 0
  if (stats) {
    totalVotes = stats.totalVotes
    for (const c of stats.candidates) {
      voteMap[c.id] = c.votes
    }
  }

  const candidates = meta.map((c) => ({
    ...c,
    votes: voteMap[c.id] ?? 0,
  }))

  if (!stats) {
    totalVotes = candidates.reduce((s, x) => s + x.votes, 0)
  }

  return { candidates, totalVotes, statsFailed: !stats }
}
