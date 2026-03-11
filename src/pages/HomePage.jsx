import { Link } from 'react-router-dom'
import { contactEmail } from '../config/configuration'
import './HomePage.css'

// Set to true to show PropTech Powerhouse in partner logos
const SHOW_PROPTECH_POWERHOUSE = false

function HomePage({ onContactSubmit }) {
  return (
    <>
      <section id="home" className="hero-section">
        <div className="container">
          <div className="hero-content">
            <p className="hero-eyebrow">Die erste reine AI-Konferenz für den Real Estate im DACH-Raum</p>
            <h2 className="hero-title">Reprogramming Real Estate: Wie AI die Branche neu definiert</h2>
            <p className="hero-subtitle">
              <strong>1. Juni 2026, 08:00–17:00 Uhr</strong> · IFZ Campus Zug-Rotkreuz · CHF 590.–
            </p>
            <p className="hero-subline">
              Konferenz zu KI-Wertschöpfung, Live-Solution-Labs, IFZ AI-Readiness Report 2026 und Best AI Use Case Award. Für Entscheider/innen aus Immobilien, PropTech und Beratung.
            </p>

            <div className="hero-sponsors">
              <p className="hero-sponsors-label">Partner</p>
              <div className="hero-sponsors-logos">
                <a href="https://www.gefma.de" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="GEFMA">
                  <img src="/gefma.png" alt="GEFMA" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.iz.de/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="IZ">
                  <img src="/iz.png" alt="IZ" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.immobilienbusiness.ch/de/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="IMMOBILIEN Business">
                  <img src="/s_w530_IB_Logo_2013-web.jpg" alt="IMMOBILIEN Business" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.immopac.ch/de" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="ImmoPac">
                  <img src="/immopac.jpg" alt="ImmoPac" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.lukb.ch/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="LUKB">
                  <img src="/lukb.jpg" alt="LUKB" className="hero-sponsor-logo" />
                </a>
                {SHOW_PROPTECH_POWERHOUSE && (
                  <a href="https://proptechpowerhouse.com/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="PropTech Powerhouse">
                    <img src="/proptech-powerhouse.jpg" alt="PropTech Powerhouse" className="hero-sponsor-logo" />
                  </a>
                )}
                <a href="https://pt1.vc/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="PT1">
                  <img src="/pt1.png" alt="PT1" className="hero-sponsor-logo" />
                </a>
                <a href="https://swissproptech.ch/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="SwissPropTech">
                  <img src="/swissproptech-logo.png" alt="SwissPropTech" className="hero-sponsor-logo" />
                </a>
              </div>
            </div>

            <div className="hero-award-block">
              <h3 className="hero-award-title">HSLU Best AI@RE Use Case Award 2026</h3>
              <p className="hero-award-text">
                Plattform für KI-Lösungen in Real Estate (Bewertung, Bau, Betrieb, ESG, Finanzierung, AI Agents). Voraussetzung: konkreter Business Case, lauffähiger Prototyp, Start-Up oder Unternehmensprojekt.
              </p>
              <p className="hero-award-timeline">
                Bewerbung bis 30.4.2026 · 5 Nominierte · Live-Pitch & Publikumsvoting am 1.6.2026
              </p>
              <Link to="/award" className="cta-button">
                Details zum Award
              </Link>
            </div>

            <div className="hero-cta-buttons">
              <a href="https://www.hslu.ch/de-ch/wirtschaft/agenda/veranstaltungen/2026/06/01/reprogramming-real-estate-wie-ai-die-branche-neu-definiert/" target="_blank" rel="noopener noreferrer" className="cta-button">
                Zur Konferenz anmelden
              </a>
              <Link to="/check" className="cta-button cta-button-secondary">
                Readiness Check starten
              </Link>
              <Link to="/statistics" className="cta-button cta-button-secondary">
                Statistiken ansehen
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="section-content">
            <p>
              Die Immobilienwirtschaft verändert sich schneller, als viele Unternehmen reagieren können.
            </p>
            <p>
              AI automatisiert Prozesse, verändert Rollen, verschiebt Wertschöpfung. Viele Unternehmen treiben Digitalisierung voran, ohne zu wissen, wo sie wirklich stehen.
            </p>
            <h3>Die Folge:</h3>
            <ul>
              <li>falsche Prioritäten</li>
              <li>teure Fehlentscheidungen</li>
              <li>Projekte, die scheitern. Nicht wegen AI, sondern wegen fehlender Grundlagen</li>
              <li>Teams, die überfordert sind</li>
              <li>Strategien, die nicht greifen</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="section-content">
            <h2 className="section-title">Der Readiness Check ist Ihre 7-Minuten-Standortbestimmung.</h2>
            <p>
              Er zeigt Ihnen neutral, unabhängig und evidenzbasiert:
            </p>
            <ul>
              <li>Wie gut Ihre Daten auf AI vorbereitet sind</li>
              <li>Wo Ihre Organisation blockiert – und wo sie stark ist</li>
              <li>Welche Kompetenzen fehlen</li>
              <li>Wie gross Ihr Umsetzungspotenzial wirklich ist</li>
              <li>Was Sie sofort tun können, um handlungsfähig zu sein</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="wizard" className="wizard-preview-section">
        <div className="container">
          <div className="wizard-preview-content">
            <h2 className="section-title">Was genau misst der Readiness Check?</h2>
            <p className="section-description">
              Wir analysieren den Reifegrad Ihres Unternehmens in 7 entscheidenden Dimensionen, die über Erfolg oder Scheitern von AI entscheiden:
            </p>
            <div className="dimensions-list">
              <div className="dimension-item">
                <h3>1. Strategie & Orientierung</h3>
                <p>Haben Sie klar definiert, wofür Sie AI nutzen wollen und warum?</p>
              </div>
              <div className="dimension-item">
                <h3>2. Daten & Informationsqualität</h3>
                <p>Sind Ihre Daten nutzbar, strukturiert und verlässlich?</p>
              </div>
              <div className="dimension-item">
                <h3>3. Prozesse & Systeme</h3>
                <p>Sind Ihre Abläufe digital genug für AI – oder voller manueller Brüche?</p>
              </div>
              <div className="dimension-item">
                <h3>4. Organisation & Rollen</h3>
                <p>Wer trägt Verantwortung? Wer treibt AI voran?</p>
              </div>
              <div className="dimension-item">
                <h3>5. Kompetenzen & Skills</h3>
                <p>Versteht Ihr Team AI und kann es damit arbeiten?</p>
              </div>
              <div className="dimension-item">
                <h3>6. Kultur & Veränderungsbereitschaft</h3>
                <p>Ist Innovation möglich oder dominiert Risikoangst?</p>
              </div>
              <div className="dimension-item">
                <h3>7. Governance & Risiko</h3>
                <p>Haben Sie Leitplanken, Sicherheit und Compliance im Griff?</p>
              </div>
            </div>
            <p className="section-description">
              Das Ergebnis zeigt Ihnen Ihr komplettes AI-Profil, Ihre Stärken und Ihre grössten Handlungsfelder auf einen Blick.
            </p>
            <Link to="/check" className="cta-button">
              Jetzt Readiness Check starten
            </Link>
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="container">
          <h2 className="section-title">Kontakt</h2>
          <div className="contact-content">
            <div className="contact-info">
              <h3>Lassen Sie uns gemeinsam die Zukunft gestalten</h3>
              <p>
                Haben Sie Fragen zu KI-Lösungen für die Immobilienbranche? 
                Wir beraten Sie gerne zu den Möglichkeiten und der Implementierung 
                von KI-Technologien in Ihrem Unternehmen.
              </p>
              <div className="contact-details">
                <div className="contact-detail-item">
                  <strong>E-Mail</strong>
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </div>
                <div className="contact-detail-item">
                  <strong>Telefon</strong>
                  <a href="tel:+41417576734">+41 41 757 67 34</a>
                </div>
                <div className="contact-detail-item">
                  <strong>Adresse</strong>
                  <p>Suurstoffi 1<br />6343 Rotkreuz, Schweiz</p>
                </div>
              </div>
            </div>
            <div className="contact-form">
              <form onSubmit={onContactSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Name</label>
                  <input type="text" id="name" name="name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">E-Mail</label>
                  <input type="email" id="email" name="email" required />
                </div>
                <div className="form-group">
                  <label htmlFor="subject">Betreff</label>
                  <input type="text" id="subject" name="subject" required />
                </div>
                <div className="form-group">
                  <label htmlFor="message">Nachricht</label>
                  <textarea id="message" name="message" rows="5" required></textarea>
                </div>
                <button type="submit" className="cta-button">Nachricht senden</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default HomePage
