import { useNavigate, useLocation } from 'react-router-dom'
import Result from '../components/Result'

function ResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const answers = location.state?.answers || null

  const handleReset = () => {
    navigate('/check')
  }

  const handleBackToHome = () => {
    navigate('/')
  }

  if (!answers) {
    // If no answers in state, redirect to home
    navigate('/')
    return null
  }

  return (
    <section className="result-section">
      <div className="container">
        <Result 
          answers={answers} 
          onReset={handleReset}
          onBackToHome={handleBackToHome}
        />
      </div>
    </section>
  )
}

export default ResultPage
