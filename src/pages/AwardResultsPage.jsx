import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaPlay } from 'react-icons/fa'
import {
  fetchAwardResultsForChart,
  fetchVotingState,
  updateVotingState,
} from '../api/awardApi'
import './AwardResultsPage.css'

const ANIM_MS = 2200
const AWARD_RESULTS_CODE = '271828'

function AwardResultsLocked() {
  return (
    <section className="award-results-page award-results-page--locked">
      <div className="container">
        <p className="award-results-locked-msg">
          Du bist ungeduldig? Komm zur{' '}
          <span className="award-results-locked-brand">AI@RE</span>
          -Kobferenz{' '}
          <span className="award-results-locked-smiley" role="img" aria-label="Smiley">
            😊
          </span>
        </p>
      </div>
    </section>
  )
}

function AwardResultsContent({ code }) {
  const [candidates, setCandidates] = useState([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statsWarning, setStatsWarning] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showWinner, setShowWinner] = useState(false)
  const [votingStopped, setVotingStopped] = useState(false)
  const [doubleCount, setDoubleCount] = useState(false)
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminError, setAdminError] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const state = await fetchVotingState()
        if (!cancelled) {
          setVotingStopped(state.votingStopped)
          setDoubleCount(state.doubleCount)
        }
      } catch {
        /* non-fatal: admin controls just start from defaults */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const applyVotingState = useCallback(
    async (patch) => {
      setAdminBusy(true)
      setAdminError(null)
      try {
        const state = await updateVotingState(patch, code)
        setVotingStopped(state.votingStopped)
        setDoubleCount(state.doubleCount)
      } catch (e) {
        setAdminError(e.message || 'Aktualisierung fehlgeschlagen.')
      } finally {
        setAdminBusy(false)
      }
    },
    [code],
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setStatsWarning(false)
        const { candidates: rows, totalVotes: sum, statsFailed } =
          await fetchAwardResultsForChart()
        if (!cancelled) {
          setCandidates(rows)
          setTotalVotes(sum)
          setStatsWarning(Boolean(statsFailed))
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Fehler beim Laden')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Silently refresh counts without touching reveal/animation state.
  const refreshCounts = useCallback(async () => {
    try {
      const { candidates: rows, totalVotes: sum, statsFailed } =
        await fetchAwardResultsForChart()
      setCandidates(rows)
      setTotalVotes(sum)
      setStatsWarning(Boolean(statsFailed))
    } catch {
      /* keep last known counts on a failed poll */
    }
  }, [])

  // Poll every 5s, but never while the reveal animation runs or the winner is
  // shown — so counts stay current in the background without exposing the result.
  useEffect(() => {
    if (loading || playing || showWinner) return undefined
    const id = setInterval(refreshCounts, 5000)
    return () => clearInterval(id)
  }, [loading, playing, showWinner, refreshCounts])

  const maxVotes = useMemo(() => {
    if (!candidates.length) return 0
    return Math.max(...candidates.map((c) => c.votes), 0)
  }, [candidates])

  const winnerIds = useMemo(() => {
    if (maxVotes <= 0 || !showWinner) return new Set()
    return new Set(candidates.filter((c) => c.votes === maxVotes).map((c) => c.id))
  }, [candidates, maxVotes, showWinner])

  const handlePlay = useCallback(() => {
    setShowWinner(false)
    setPlaying(false)
    setAnimKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (animKey === 0) return
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPlaying(true)
      })
    })
    return () => cancelAnimationFrame(id)
  }, [animKey])

  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => {
      setShowWinner(true)
      setPlaying(false)
    }, ANIM_MS)
    return () => clearTimeout(t)
  }, [playing, animKey])

  const scaleMax = maxVotes > 0 ? maxVotes : 1

  return (
    <section className="award-results-page">
      <div className="container">
        <h1 className="award-results-title">AI@RE Award · Stimmen</h1>
        <p className="award-results-sub">
          {totalVotes === 1
            ? '1 abgegebene Stimme'
            : `${totalVotes} abgegebene Stimmen`}
        </p>

        {statsWarning && (
          <p className="award-results-warn">
            Stimmenzahlen vorübergehend nicht verfügbar — Balken zeigen 0.
          </p>
        )}

        <div className="award-results-admin">
          <div className="award-results-admin-buttons">
            <button
              type="button"
              className={`award-results-admin-btn${votingStopped ? ' is-active' : ''}`}
              onClick={() => applyVotingState({ votingStopped: !votingStopped })}
              disabled={adminBusy}
            >
              {votingStopped ? 'Voting neu starten' : 'Voting stoppen'}
            </button>
            {!votingStopped && (
              <button
                type="button"
                className={`award-results-admin-btn${doubleCount ? ' is-active' : ''}`}
                onClick={() => applyVotingState({ doubleCount: !doubleCount })}
                disabled={adminBusy}
              >
                {doubleCount ? 'Doppelzählung deaktivieren' : 'Doppelzählung aktivieren'}
              </button>
            )}
          </div>
          <p className="award-results-admin-state">
            Voting: <strong>{votingStopped ? 'gestoppt' : 'aktiv'}</strong>
            {!votingStopped && (
              <>
                {' '}
                · Doppelzählung: <strong>{doubleCount ? 'an' : 'aus'}</strong>
              </>
            )}
          </p>
          {adminError && <p className="award-results-error">{adminError}</p>}
        </div>

        {loading && <p className="award-results-status">Laden …</p>}
        {error && <p className="award-results-error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="award-results-toolbar">
              <button
                type="button"
                className="award-results-play"
                onClick={handlePlay}
                disabled={!candidates.length}
                aria-label="And the winner is, animation starten"
              >
                <FaPlay className="award-results-play-icon" aria-hidden />
                And the winner is …
              </button>
            </div>

            <div className="award-results-chart" key={animKey}>
              {candidates.map((c) => {
                const pct = scaleMax > 0 ? (c.votes / scaleMax) * 100 : 0
                const isWinner = winnerIds.has(c.id)
                const growDurationSec =
                  pct > 0 ? (pct / 100) * (ANIM_MS / 1000) : 0
                return (
                  <div className="award-results-row" key={c.id}>
                    <div className="award-results-label-col">
                      <span className="award-results-solution">{c.solutionTitle}</span>
                      <span className="award-results-company">{c.companyName}</span>
                    </div>
                    <div className="award-results-bar-cell">
                      <div className="award-results-track">
                        <div
                          className={[
                            'award-results-bar',
                            playing ? 'award-results-bar--grow' : '',
                            showWinner && !playing ? 'award-results-bar--fill' : '',
                            showWinner && !playing && isWinner
                              ? 'award-results-bar--winner'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{
                            '--w': pct,
                            '--dur': `${growDurationSec}s`,
                          }}
                        />
                      </div>
                    </div>
                    <div
                      className="award-results-vote-wrap"
                      aria-live="polite"
                    >
                      {showWinner ? (
                        <span className="award-results-vote">{c.votes}</span>
                      ) : (
                        <span className="award-results-vote award-results-vote--placeholder" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="award-results-back">
          <Link to="/award" className="cta-button cta-button-secondary">
            Zur Award-Übersicht
          </Link>
        </div>
      </div>
    </section>
  )
}

function AwardResultsPage() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')
  if (code !== AWARD_RESULTS_CODE) {
    return <AwardResultsLocked />
  }
  return <AwardResultsContent code={code} />
}

export default AwardResultsPage
