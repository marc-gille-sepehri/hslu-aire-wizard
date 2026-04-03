import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiBaseUrl } from '../config/configuration'
import { awardVoteCandidates } from '../data/awardVoteCandidates'
import { getYoutubeEmbedSrc } from '../utils/youtubeEmbed'
import './AwardVotePage.css'

function AwardVotePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [email, setEmail] = useState('')
  const [wantsUpdates, setWantsUpdates] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

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
        <p className="award-vote-discrete">
          Interne Vorschau — nicht in der Navigation verlinkt.
        </p>
        <h1 className="award-vote-title">AI@RE Award 2026 · Publikumsvoting (Demo)</h1>
        <p className="award-vote-intro">
          Stimme für einen der folgenden Beispiel-Kandidaten. Nach Eingabe deiner E-Mail erhältst du eine Bestätigung.
        </p>

        <ul className="award-vote-list">
          {awardVoteCandidates.map((c) => {
            const youtubeEmbedSrc = getYoutubeEmbedSrc(c.videoUrl)
            return (
            <li key={c.id} className="award-vote-card">
              <div className="award-vote-card-layout">
                {youtubeEmbedSrc ? (
                  <div className="award-vote-card-media">
                    <div className="award-vote-video-frame">
                      <iframe
                        title={`Video: ${c.solutionTitle}`}
                        src={youtubeEmbedSrc}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    </div>
                    <a
                      href={c.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="award-vote-video-link"
                    >
                      Auf YouTube öffnen
                    </a>
                  </div>
                ) : null}
                <div className="award-vote-card-main">
                  <div className="award-vote-card-head">
                    <h2 className="award-vote-solution-title">{c.solutionTitle}</h2>
                    <a
                      href={c.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="award-vote-company-link"
                    >
                      {c.companyName}
                    </a>
                  </div>
                  <p className="award-vote-synopsis">{c.synopsis}</p>
                  {!youtubeEmbedSrc && c.videoUrl ? (
                    <div className="award-vote-video-fallback">
                      <a
                        href={c.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="award-vote-video-link"
                      >
                        Video ansehen
                      </a>
                    </div>
                  ) : null}
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
            </li>
            )
          })}
        </ul>

        <div className="award-vote-back">
          <Link to="/award" className="cta-button cta-button-secondary">
            Zur Award-Übersicht
          </Link>
        </div>
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
                  <strong>{selected.solutionTitle}</strong>
                  <span className="award-vote-modal-company">{selected.companyName}</span>
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
