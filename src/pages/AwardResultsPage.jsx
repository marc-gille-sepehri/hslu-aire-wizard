import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaPlay } from 'react-icons/fa'
import { fetchAwardResultsForChart } from '../api/awardApi'
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

function AwardResultsContent() {
  const [candidates, setCandidates] = useState([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statsWarning, setStatsWarning] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showWinner, setShowWinner] = useState(false)

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
  return <AwardResultsContent />
}

export default AwardResultsPage
