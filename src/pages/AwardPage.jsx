import { Link } from 'react-router-dom'
import { FaFilePdf } from 'react-icons/fa'
import './AwardPage.css'

const REGISTRATION_URL = 'https://forms.office.com/e/DSkmSUEmBq'

function AwardPage() {
  return (
    <section className="award-page">
      <div className="container">
        <h1 className="award-page-title">HSLU Best AI@RE Use Case Award 2026</h1>

        <div className="award-page-content">
          <p className="award-intro">
            Die Hochschule Luzern vergibt den «Best AI@RE Use Case Award 2026». Ziel ist es,
            der Immobilienbranche zu zeigen, was mit AI möglich ist und wie dadurch Prozesse
            und Lösungen verändert werden. Entwicklern soll eine Plattform gegeben werden, um
            ihre AI-Produkte der Branche zu zeigen.
          </p>

          <h2>Wer kann teilnehmen?</h2>
          <p>KI-Lösungen aus allen Teilbranchen des Real Estate:</p>
          <ul>
            <li>Bewertung & Market Intelligence</li>
            <li>Bau & Planung</li>
            <li>Betrieb & Energie</li>
            <li>ESG & Portfolio</li>
            <li>Finanzierung & Transaktionen</li>
            <li>AI Agents & Automatisierung</li>
          </ul>
          <p className="award-requirement">Voraussetzung: Realer Business Case · Idealerweise erste Kunden oder Pilotprojekte · Start-Up oder Projekte von Unternehmen</p>

          <h2>Was sind die Teilnahme-Voraussetzungen?</h2>
          <ul>
            <li>Konkreter AI Use Case in der Bau- und Immobilienbranche</li>
            <li>Lauffähiger Prototyp oder fertiges Produkt</li>
            <li>Start-Up oder Projekt von etablierten Unternehmen</li>
          </ul>

          <h2>Wie ist der Ablauf?</h2>
          <ul>
            <li>Bewerbungen bis zum 30.4.2026 mit Kurzvideo über das untenstehende Formular</li>
            <li>Nominierung von 5 Kandidaten aus allen Bewerbungen durch eine Fachjury bis 10.5.2026</li>
            <li>Live-Pitch an der Konferenz vom 1.6.2026 am IFZ in Rotkreuz</li>
            <li>Publikumsvoting an der Konferenz</li>
            <li>Preisverleihung an der Konferenz vom 1.6.2026</li>
          </ul>

          <h2>Weitere Details</h2>
          <a href="/AIRE-BestUseCase-Praesentation-2026.pdf" target="_blank" rel="noopener noreferrer" className="award-details-link">
            <FaFilePdf className="award-details-icon" />
            AIRE-BestUseCase-Praesentation-2026.pdf
          </a>

          <div className="award-cta">
            <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer" className="cta-button">
              Für den Award bewerben
            </a>
            <Link to="/" className="cta-button cta-button-secondary">
              Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AwardPage
