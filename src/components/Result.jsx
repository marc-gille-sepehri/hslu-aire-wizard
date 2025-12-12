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
          <h1 className="result-title">Dein AI Readiness Ergebnis</h1>
          <p className="result-subtitle">
            Basierend auf deinen Antworten haben wir eine Empfehlung für dich
          </p>
        </div>

        <div className="result-content">
          <div className="overall-score">
            <div className="score-circle">
              <div className="score-value">
                {result.overallAverage.toFixed(1)}
              </div>
              <div className="score-label">von 5.0</div>
            </div>
            <div className="score-description">
              <h3>Gesamtbewertung</h3>
              <p>
                Deine durchschnittliche Bewertung über alle Dimensionen hinweg
              </p>
            </div>
          </div>

          <div className="dimension-scores">
            <h3 className="scores-title">Bewertung nach Dimensionen</h3>
            <div className="scores-grid">
              {result.dimensionScores.map((dim) => (
                <div key={dim.id} className="score-item">
                  <div className="score-item-header">
                    <span className="score-item-title">{dim.title}</span>
                    <span className="score-item-value">
                      {dim.score.toFixed(1)} / {dim.maxScore}
                    </span>
                  </div>
                  <div className="score-item-bar">
                    <div
                      className="score-item-fill"
                      style={{
                        width: `${(dim.score / dim.maxScore) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="recommendation">
            <div className="recommendation-icon">
              <FiZap />
            </div>
            <div className="recommendation-content">
              <h3 className="recommendation-title">
                {result.recommendation.title}
              </h3>
              <p className="recommendation-message">
                {result.recommendation.message}
              </p>
            </div>
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

