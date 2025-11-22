import { useState } from 'react'
import Wizard from './components/Wizard'
import Result from './components/Result'
import './App.css'

function App() {
  const [answers, setAnswers] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const handleComplete = (answersData) => {
    setAnswers(answersData)
    setShowResult(true)
  }

  const handleReset = () => {
    setAnswers(null)
    setShowResult(false)
  }

  return (
    <div className="app">
      {!showResult ? (
        <Wizard onComplete={handleComplete} />
      ) : (
        <Result answers={answers} onReset={handleReset} />
      )}
    </div>
  )
}

export default App

