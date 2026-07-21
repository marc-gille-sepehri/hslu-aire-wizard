import { useMemo } from 'react'
import { FiZap } from 'react-icons/fi'
import { dimensions, recommendations } from '../data/questions'
import './Result.css'

function Result({ answers, onReset, onBackToHome }) {
  const result = useMemo(() => {
    // Calculate average score per dimension
    const dimensionScores = dimensions.map((dim) => {
      const scores = dim.questions
        .map((_, index) => {
          const key = `${dim.id}-${index}`
          return answers[key] || 0
        })
        .filter((score) => score > 0)

      const average = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0

      return {
        id: dim.id,
        title: dim.title,
        score: average,
        maxScore: 5,
      }
    })

    // Calculate overall average
    const overallAverage =
      dimensionScores.reduce((sum, dim) => sum + dim.score, 0) /
      dimensionScores.length

    // Determine recommendation based on scores
    let recommendation
    if (overallAverage <= 2) {
      recommendation = recommendations[0] // seminar
    } else if (overallAverage <= 2.5) {
      recommendation = recommendations[1] // management
    } else if (overallAverage <= 3) {
      recommendation = recommendations[2] // research
    } else if (overallAverage <= 3.5) {
      recommendation = recommendations[4] // webinar
    } else if (overallAverage <= 4) {
      recommendation = recommendations[5] // workshop
    } else {
      recommendation = recommendations[3] // startup
    }

    return {
      dimensionScores,
      overallAverage,
      recommendation,
      answersData: answers,
    }
  }, [answers])

  return (
    <div className="result">
      <div className="result-container">
        <div className="result-header">
          <h1 className="result-title">Vielen Dank!</h1>
          <p className="result-subtitle">
            Ihr persönliches AI Readiness Ergebnis wurde an Ihre E-Mail-Adresse gesendet.
          </p>
          <p className="result-subtitle" style={{ marginTop: '1rem', fontSize: '1rem' }}>
            Bitte überprüfen Sie Ihr Postfach (auch den Spam-Ordner).
          </p>
        </div>

        <div className="result-content">
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text)', maxWidth: '600px', margin: '0 auto' }}>
              Ihre Ergebnisse wurden erfolgreich verarbeitet und an Ihre E-Mail-Adresse gesendet.
            </p>
          </div>
        </div>

        <div className="result-actions">
          {onBackToHome && (
            <button className="reset-button reset-button-secondary" onClick={onBackToHome}>
              Zurück zur Startseite
            </button>
          )}
          <button className="reset-button" onClick={onReset}>
            Erneut starten
          </button>
        </div>

        <div className="result-data">
          <details>
            <summary>Antwortdaten anzeigen (JSON)</summary>
            <pre>{JSON.stringify(result.answersData, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  )
}

export default Result

