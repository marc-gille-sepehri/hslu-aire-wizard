import './QuestionSlide.css'

function QuestionSlide({ dimension, questionIndex, question, responseOptions, answer, onAnswer }) {
  return (
    <div className="question-slide">
      <div className="question-content">
        <div className="question-number">
          Dimension {dimension.id} • Frage {questionIndex + 1}
        </div>
        <h3 className="question-text">{question}</h3>
      </div>

      <div className="response-options">
        {responseOptions.map((option) => (
          <button
            key={option.value}
            className={`response-button ${answer === option.value ? 'selected' : ''}`}
            onClick={() => onAnswer(option.value)}
          >
            <div className="response-value">{option.value}</div>
            <div className="response-label">{option.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default QuestionSlide

