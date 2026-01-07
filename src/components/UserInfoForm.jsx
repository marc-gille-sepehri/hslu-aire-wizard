import { useState } from 'react'
import './UserInfoForm.css'

function UserInfoForm({ answers, onSubmit, onBack }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.firstName.trim()) {
      setError('Bitte geben Sie Ihren Vornamen ein.')
      return
    }
    if (!formData.lastName.trim()) {
      setError('Bitte geben Sie Ihren Nachnamen ein.')
      return
    }
    if (!formData.email.trim()) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        ...formData,
        answers,
      })
    } catch (err) {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
      console.error('Error submitting form:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="user-info-form">
      <div className="user-info-container">
        <div className="user-info-header">
          <h2 className="user-info-title">Fast geschafft!</h2>
          <p className="user-info-subtitle">
            Bitte geben Sie Ihre Kontaktdaten ein, um Ihr persönliches Ergebnis per E-Mail zu erhalten.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="user-info-form-content">
          {error && <div className="user-info-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="firstName">Vorname *</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Ihr Vorname"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Nachname *</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="Ihr Nachname"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">E-Mail-Adresse *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder="ihre.email@beispiel.ch"
            />
          </div>

          <div className="user-info-actions">
            {onBack && (
              <button
                type="button"
                className="user-info-button user-info-button-secondary"
                onClick={onBack}
                disabled={isSubmitting}
              >
                Zurück
              </button>
            )}
            <button
              type="submit"
              className="user-info-button user-info-button-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Wird gesendet...' : 'Ergebnis anfordern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserInfoForm

