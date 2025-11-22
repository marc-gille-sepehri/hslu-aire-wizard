import { useState } from 'react'
import { dimensions, responseOptions } from '../data/questions'
import QuestionSlide from './QuestionSlide'
import DimensionOverview from './DimensionOverview'
import './Wizard.css'

function Wizard({ onComplete }) {
  const [currentDimension, setCurrentDimension] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})

  const currentDim = dimensions[currentDimension]
  const totalQuestions = dimensions.reduce((sum, dim) => sum + dim.questions.length, 0)
  const answeredQuestions = Object.keys(answers).length
  const progress = (answeredQuestions / totalQuestions) * 100

  const handleAnswer = (dimensionId, questionIndex, value) => {
    const key = `${dimensionId}-${questionIndex}`
    setAnswers((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleNext = () => {
    if (currentQuestion < currentDim.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else if (currentDimension < dimensions.length - 1) {
      setCurrentDimension(currentDimension + 1)
      setCurrentQuestion(0)
    } else {
      // All questions answered
      onComplete(answers)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    } else if (currentDimension > 0) {
      setCurrentDimension(currentDimension - 1)
      setCurrentQuestion(dimensions[currentDimension - 1].questions.length - 1)
    }
  }

  const handleDimensionClick = (dimIndex) => {
    setCurrentDimension(dimIndex)
    setCurrentQuestion(0)
  }

  const canProceed = () => {
    const key = `${currentDim.id}-${currentQuestion}`
    return answers[key] !== undefined
  }

  const isLastQuestion = currentDimension === dimensions.length - 1 && 
                         currentQuestion === currentDim.questions.length - 1

  return (
    <div className="wizard">
      <div className="wizard-header">
        <div className="wizard-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-text">
            {answeredQuestions} / {totalQuestions} Fragen beantwortet
          </div>
        </div>
      </div>

      <div className="wizard-content">
        <div className="wizard-sidebar">
          <DimensionOverview
            dimensions={dimensions}
            currentDimension={currentDimension}
            answers={answers}
            onDimensionClick={handleDimensionClick}
          />
        </div>

        <div className="wizard-main">
          <div className="dimension-header">
            <div className="dimension-icon">
              {currentDim.icon && (() => {
                const IconComponent = currentDim.icon
                return <IconComponent />
              })()}
            </div>
            <div className="dimension-info">
              <h2 className="dimension-title">{currentDim.title}</h2>
              <p className="dimension-subtitle">{currentDim.subtitle}</p>
            </div>
          </div>

          <QuestionSlide
            dimension={currentDim}
            questionIndex={currentQuestion}
            question={currentDim.questions[currentQuestion]}
            responseOptions={responseOptions}
            answer={answers[`${currentDim.id}-${currentQuestion}`]}
            onAnswer={(value) => handleAnswer(currentDim.id, currentQuestion, value)}
          />

          <div className="wizard-navigation">
            <button
              className="nav-button nav-button-prev"
              onClick={handlePrevious}
              disabled={currentDimension === 0 && currentQuestion === 0}
            >
              ← Zurück
            </button>
            <div className="question-counter">
              Frage {currentQuestion + 1} von {currentDim.questions.length}
            </div>
            <button
              className="nav-button nav-button-next"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {isLastQuestion ? 'Ergebnis anzeigen →' : 'Weiter →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Wizard

