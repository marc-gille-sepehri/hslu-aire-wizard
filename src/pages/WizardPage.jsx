import { useNavigate } from 'react-router-dom'
import Wizard from '../components/Wizard'
import { apiBaseUrl } from '../config/configuration'

function WizardPage() {
  const navigate = useNavigate()

  const handleComplete = async (data) => {
    const { firstName, lastName, email, answers: answersData, companySize, companyBusiness, companyCountry, consentToNewsletter } = data
    
    try {
      // Send to server
      const response = await fetch(`${apiBaseUrl}/wizard-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          answers: answersData,
          companySize,
          companyBusiness,
          companyCountry,
          requestMoreMaterial: data.requestMoreMaterial || false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Senden der Daten')
      }

      const result = await response.json()
      
      // Navigate to result page with answers data
      navigate('/result', { state: { answers: answersData } })
    } catch (error) {
      console.error('Error submitting wizard result:', error)
      alert('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt.')
    }
  }

  return (
    <section className="wizard-section">
      <div className="container">
        <Wizard onComplete={handleComplete} />
      </div>
    </section>
  )
}

export default WizardPage
