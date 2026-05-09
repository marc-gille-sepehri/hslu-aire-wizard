import { useState, useEffect } from 'react'
import { apiBaseUrl } from '../config/configuration'
import { fetchAwardCandidates } from '../api/awardApi'
import { getYoutubeEmbedSrc, getLoomEmbedSrc } from '../utils/youtubeEmbed'
import './AwardVotePage.css'

function AwardVotePage() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [email, setEmail] = useState('')
  const [wantsUpdates, setWantsUpdates] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const rows = await fetchAwardCandidates()
        if (!cancelled) {
          setCandidates(rows)
          setLoadError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'Kandidaten konnten nicht geladen werden.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openVote = (candidate) => {
    setSelected(candidate)
    setEmail('')
    setWantsUpdates(false)
    setError(null)
    setSuccess(false)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (submitting) return
    setModalOpen(false)
    setSelected(null)
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return

    const trimmed = email.trim()
    if (!trimmed) {
      setError('Bitte gib eine E-Mail-Adresse ein.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/award-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          candidateId: selected.id,
          wantsUpdates,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Stimme konnte nicht gespeichert werden.')
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Es ist ein Fehler aufgetreten.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="award-vote-page">
      <div className="container">
        <h1 className="award-vote-title">AI@RE Award 2026 · Publikumsvoting</h1>
        <p className="award-vote-intro">
          Stimme für einen der folgenden Kandidaten. Nach Eingabe deiner E-Mail erhältst du eine Bestätigung.
        </p>

        <div className="award-vote-back award-vote-back--top">
          <a
            href="https://www.hslu.ch/de-ch/wirtschaft/agenda/veranstaltungen/2026/06/01/reprogramming-real-estate-wie-ai-die-branche-neu-definiert/"
            target="_blank"
            rel="noopener noreferrer"
            className="cta-button"
          >
            Zur Konferenz anmelden
          </a>
        </div>

        {loading && <p className="award-vote-status">Laden …</p>}
        {loadError && <p className="award-vote-error">{loadError}</p>}

        {!loading && !loadError && (
          <ul className="award-vote-list">
            {candidates.map((c) => {
              const resolvedVideoUrl =
                c.videoUrl && c.videoUrl.startsWith('/')
                  ? `${apiBaseUrl}${c.videoUrl}`
                  : c.videoUrl
              const youtubeEmbedSrc = getYoutubeEmbedSrc(resolvedVideoUrl)
              const loomEmbedSrc = !youtubeEmbedSrc
                ? getLoomEmbedSrc(resolvedVideoUrl)
                : null
              const iframeEmbedSrc = youtubeEmbedSrc || loomEmbedSrc
              const externalLinkLabel = youtubeEmbedSrc
                ? 'Auf YouTube öffnen'
                : loomEmbedSrc
                ? 'Auf Loom öffnen'
                : null
              const hasFileVideo = Boolean(resolvedVideoUrl) && !iframeEmbedSrc
              return (
              <li key={c.id} className="award-vote-card">
                <div className="award-vote-card-layout">
                  {iframeEmbedSrc || hasFileVideo ? (
                    <div className="award-vote-card-media">
                      <div className="award-vote-video-frame">
                        {iframeEmbedSrc ? (
                          <iframe
                            title={`Video: ${c.companyName}`}
                            src={iframeEmbedSrc}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                          />
                        ) : (
                          <video
                            src={resolvedVideoUrl}
                            controls
                            preload="metadata"
                            playsInline
                          />
                        )}
                      </div>
                      {externalLinkLabel && (
                        <a
                          href={resolvedVideoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="award-vote-video-link"
                        >
                          {externalLinkLabel}
                        </a>
                      )}
                    </div>
                  ) : null}
                  <div className="award-vote-card-main">
                    <div className="award-vote-card-head">
                      <h2 className="award-vote-solution-title">{c.companyName}</h2>
                      {c.websiteUrl && (
                        <a
                          href={c.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="award-vote-company-link"
                        >
                          {c.websiteUrl}
                        </a>
                      )}
                    </div>
                    <div className="award-vote-actions">
                      <button
                        type="button"
                        className="award-vote-button"
                        onClick={() => openVote(c)}
                      >
                        Für diese Lösung stimmen
                      </button>
                    </div>
                  </div>
                </div>
                {c.description && (
                  <div className="award-vote-jury">
                    <h3 className="award-vote-jury-heading">Beurteilung der Jury</h3>
                    <p className="award-vote-synopsis">{c.description}</p>
                  </div>
                )}
              </li>
              )
            })}
          </ul>
        )}

      </div>

      {modalOpen && selected && (
        <div className="award-vote-modal-overlay" role="presentation" onClick={closeModal}>
          <div
            className="award-vote-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="award-vote-modal-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <button
              type="button"
              className="award-vote-modal-close"
              onClick={closeModal}
              aria-label="Schließen"
            >
              ×
            </button>

            {success ? (
              <div className="award-vote-success">
                <h2 id="award-vote-modal-title">Vielen Dank</h2>
                <p>
                  Deine Stimme wurde registriert. Du erhältst in Kürze eine Bestätigung an{' '}
                  <strong>{email.trim()}</strong>.
                </p>
                <button type="button" className="award-vote-button" onClick={closeModal}>
                  Schließen
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="award-vote-form">
                <h2 id="award-vote-modal-title">Stimme abgeben</h2>
                <p className="award-vote-modal-choice">
                  <strong>{selected.companyName}</strong>
                  {selected.description && (
                    <span className="award-vote-modal-company">{selected.description}</span>
                  )}
                </p>

                <label className="award-vote-label" htmlFor="award-vote-email">
                  E-Mail
                </label>
                <input
                  id="award-vote-email"
                  type="email"
                  className="award-vote-input"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  autoComplete="email"
                  required
                  disabled={submitting}
                />

                <p className="award-vote-privacy">
                  Deine E-Mail wird nur im Zusammenhang mit dem AI@RE Award 2026 genutzt.
                </p>

                <label className="award-vote-checkbox-row">
                  <input
                    type="checkbox"
                    checked={wantsUpdates}
                    onChange={(ev) => setWantsUpdates(ev.target.checked)}
                    disabled={submitting}
                  />
                  <span>Updates zu AI@RE erhalten.</span>
                </label>

                {error && <p className="award-vote-error">{error}</p>}

                <div className="award-vote-form-actions">
                  <button
                    type="button"
                    className="cta-button cta-button-secondary"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Abbrechen
                  </button>
                  <button type="submit" className="award-vote-button" disabled={submitting}>
                    {submitting ? 'Wird gesendet…' : 'Stimme bestätigen'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default AwardVotePage
