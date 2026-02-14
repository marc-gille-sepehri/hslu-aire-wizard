import { useState } from 'react'
import './CompanyInfoForm.css'

function CompanyInfoForm({ answers, onSubmit, onBack }) {
  const [formData, setFormData] = useState({
    companySize: '',
    companyBusiness: '',
    companyCountry: '',
  })
  const [error, setError] = useState('')

  const companySizeOptions = [
    { value: '1-10', label: '1-10 Mitarbeitende' },
    { value: '11-50', label: '11-50 Mitarbeitende' },
    { value: '51-250', label: '51-250 Mitarbeitende' },
    { value: '251-1000', label: '251-1000 Mitarbeitende' },
    { value: '1000+', label: 'Mehr als 1000 Mitarbeitende' },
  ]

  const companyBusinessOptions = [
    { value: 'Asset Management', label: 'Asset Management' },
    { value: 'Facility Management', label: 'Facility Management' },
    { value: 'Makler', label: 'Makler' },
    { value: 'Immobilienentwicklung', label: 'Immobilienentwicklung' },
    { value: 'Immobilienverwaltung', label: 'Immobilienverwaltung' },
    { value: 'Immobilienberatung', label: 'Immobilienberatung' },
    { value: 'Projektentwicklung', label: 'Projektentwicklung' },
    { value: 'Immobilienfinanzierung', label: 'Immobilienfinanzierung' },
    { value: 'Andere', label: 'Andere' },
  ]

  const countryOptions = [
    { value: 'DE', label: 'Deutschland' },
    { value: 'AT', label: 'Österreich' },
    { value: 'CH', label: 'Schweiz' },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.companySize) {
      setError('Bitte wählen Sie die Größe Ihres Unternehmens aus.')
      return
    }
    if (!formData.companyBusiness) {
      setError('Bitte wählen Sie die Branche aus.')
      return
    }
    if (!formData.companyCountry) {
      setError('Bitte wählen Sie das Land aus.')
      return
    }

    onSubmit({
      companySize: formData.companySize,
      companyBusiness: formData.companyBusiness,
      companyCountry: formData.companyCountry,
    })
  }

  return (
    <div className="company-info-form">
      <div className="company-info-container">
        <div className="company-info-header">
          <h2 className="company-info-title">Ihr Unternehmen</h2>
          <p className="company-info-subtitle">
            Bitte geben Sie einige Informationen zu Ihrem Unternehmen an.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="company-info-form-content">
          {error && <div className="company-info-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="companySize">Größe *</label>
            <select
              id="companySize"
              name="companySize"
              value={formData.companySize}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Bitte wählen...</option>
              {companySizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="companyBusiness">Branche *</label>
            <select
              id="companyBusiness"
              name="companyBusiness"
              value={formData.companyBusiness}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Bitte wählen...</option>
              {companyBusinessOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="companyCountry">Land *</label>
            <select
              id="companyCountry"
              name="companyCountry"
              value={formData.companyCountry}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Bitte wählen...</option>
              {countryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="company-info-actions">
            {onBack && (
              <button
                type="button"
                className="company-info-button company-info-button-secondary"
                onClick={onBack}
              >
                Zurück
              </button>
            )}
            <button
              type="submit"
              className="company-info-button company-info-button-primary"
            >
              Weiter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CompanyInfoForm
