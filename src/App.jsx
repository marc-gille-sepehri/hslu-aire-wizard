import { useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import WizardPage from './pages/WizardPage'
import ResultPage from './pages/ResultPage'
import StatisticsPage from './pages/StatisticsPage'
import AwardVotePage from './pages/AwardVotePage'
import AwardResultsPage from './pages/AwardResultsPage'
import MarketTestPage from './pages/MarketTestPage'
import TrainingApp from './training/TrainingApp'
import { apiBaseUrl, contactEmail } from './config/configuration'
import './App.css'

function App() {
  const [showImprint, setShowImprint] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const location = useLocation()

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const fullName = formData.get('name')
    const email = formData.get('email')
    const subject = formData.get('subject')
    const message = formData.get('message')
    
    // Disable submit button to prevent double submission
    const submitButton = e.target.querySelector('button[type="submit"]')
    submitButton.disabled = true
    submitButton.textContent = 'Wird gesendet...'
    
    try {
      const response = await fetch(`${apiBaseUrl}/contact-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          subject,
          message
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Fehler beim Senden der Nachricht')
      }
      
      // Reset form on success
      e.target.reset()
      
      // Show success message
      alert('Vielen Dank für Ihre Nachricht! Wir werden uns bald bei Ihnen melden.')
    } catch (error) {
      console.error('Error submitting contact form:', error)
      alert('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie uns direkt per E-Mail.')
    } finally {
      // Re-enable submit button
      const submitButton = e.target.querySelector('button[type="submit"]')
      submitButton.disabled = false
      submitButton.textContent = 'Nachricht senden'
    }
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-container">
              <Link to="/" className="site-logo-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                {/* CI: Wortmarke einfarbig, das "@" ist das eine Gold-Zentrum */}
                <h1 className="site-logo"><span>AI<span className="site-logo-at">@</span>RE</span></h1>
              </Link>
              <a href="https://hub.hslu.ch/immobilienblog/category/aireal-estate/" target="_blank" rel="noopener noreferrer" className="hslu-logo-link">
                <img 
                  src="/hslu-logo.svg" 
                  alt="HSLU Logo" 
                  className="hslu-logo"
                />
              </a>
              <a href="https://www.immobilienbusiness.ch/de/" target="_blank" rel="noopener noreferrer" className="ib-logo-link">
                {/* Negativ-Version für den Navy-Header. Auf dunklem Grund ist
                    Gold der einzige Akzent — daher weiss statt Markenrot.
                    Freigabe bei IMMOBILIEN Business noch einzuholen. */}
                <img
                  src="/ib-logo-white.png"
                  alt="IMMOBILIEN Business"
                  className="ib-logo"
                />
              </a>
            </div>
            <nav className="site-nav">
              <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Home</Link>
              <Link to="/statistics">Statistiken</Link>
              <Link to="/market-test">Marktdaten</Link>
              {location.pathname === '/' && (
                <a href="#contact" onClick={(e) => { e.preventDefault(); const element = document.getElementById('contact'); if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Kontakt</a>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage onContactSubmit={handleContactSubmit} />} />
          <Route path="/check" element={<WizardPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/award" element={<AwardVotePage />} />
          <Route path="/award-results" element={<AwardResultsPage />} />
          <Route path="/market-test" element={<MarketTestPage />} />
          <Route path="/training/*" element={<TrainingApp />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>AI@RE</h3>
              <p>Künstliche Intelligenz im Immobilienwesen</p>
            </div>
            <div className="footer-section">
              <h4>Navigation</h4>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/statistics">Statistiken</Link></li>
                {location.pathname === '/' && (
                  <li><a href="#contact">Kontakt</a></li>
                )}
              </ul>
            </div>
            <div className="footer-section">
              <h4>Kontakt</h4>
              <p>Email: {contactEmail}</p>
              <p>Tel: +41 41 757 67 34</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025-2026 AI@RE. Alle Rechte vorbehalten.</p>
            <div className="footer-links">
              <button 
                className="footer-link-button" 
                onClick={() => {
                  setShowImprint(!showImprint);
                  if (!showImprint) {
                    setTimeout(() => {
                      const element = document.getElementById('imprint');
                      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }}
              >
                Impressum
              </button>
              <button 
                className="footer-link-button" 
                onClick={() => {
                  setShowPrivacy(!showPrivacy);
                  if (!showPrivacy) {
                    setTimeout(() => {
                      const element = document.getElementById('privacy');
                      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }
                }}
              >
                Datenschutz
              </button>
            </div>
          </div>
        </div>
      </footer>

      {showImprint && (
        <section id="imprint" className="imprint-section">
          <div className="container">
            <div className="imprint-header">
              <h2>Impressum</h2>
              <button 
                className="imprint-close" 
                onClick={() => setShowImprint(false)}
                aria-label="Schließen"
              >
                ×
              </button>
            </div>
            <div className="imprint-content">
            <h3>Angaben gemäß Art. 321 OR</h3>
            <p>
              AI@RE<br />
              Suurstoffi 1<br />
              6343 Rotkreuz<br />
              Schweiz
            </p>
            <h3>Kontakt</h3>
            <p>
              Telefon: +41 41 757 67 34<br />
              E-Mail: {contactEmail}
            </p>
            <h3>Verantwortlich für den Inhalt gemäß Art. 321 OR</h3>
            <p>
              Prof. Dr. Markus Schmidiger<br />
              Dr. Marc Gille-Sepehri<br />
              Suurstoffi 1<br />
              6343 Rotkreuz
            </p>
            <h3>Haftungsausschluss</h3>
            <h4>Haftung für Inhalte</h4>
            <p>
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die 
              Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch 
              keine Gewähr übernehmen.
            </p>
            <h4>Haftung für Links</h4>
            <p>
              Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte 
              wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets 
              der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
            </div>
          </div>
        </section>
      )}

      {showPrivacy && (
        <section id="privacy" className="imprint-section">
          <div className="container">
            <div className="imprint-header">
              <h2>Datenschutzerklärung</h2>
              <button 
                className="imprint-close" 
                onClick={() => setShowPrivacy(false)}
                aria-label="Schließen"
              >
                ×
              </button>
            </div>
            <div className="imprint-content">
              <h3>1. Einleitung</h3>
              <p>
                Mit dieser Datenschutzerklärung informieren wir Sie über die Verarbeitung 
                personenbezogener Daten im Rahmen unserer Website gemäß dem schweizerischen 
                Datenschutzgesetz (DSG). Wir nehmen den Schutz Ihrer persönlichen Daten sehr 
                ernst und behandeln diese vertraulich und entsprechend den gesetzlichen 
                Bestimmungen.
              </p>

              <h3>2. Verantwortliche Stelle</h3>
              <p>
                Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br />
                <br />
                AI@RE<br />
                Suurstoffi 1<br />
                6343 Rotkreuz<br />
                Schweiz<br />
                <br />
                E-Mail: {contactEmail}<br />
                Telefon: +41 41 757 67 34
              </p>

              <h3>3. Erhebung und Speicherung personenbezogener Daten</h3>
              <h4>3.1 Beim Besuch der Website</h4>
              <p>
                Beim Aufruf unserer Website werden durch den auf Ihrem Endgerät zum Einsatz 
                kommenden Browser automatisch Informationen an den Server unserer Website 
                gesendet. Diese Informationen werden temporär in einem sogenannten Logfile 
                gespeichert. Folgende Informationen werden dabei ohne Ihr Zutun erfasst und 
                bis zur automatisierten Löschung gespeichert:
              </p>
              <ul>
                <li>IP-Adresse des anfragenden Rechners</li>
                <li>Datum und Uhrzeit des Zugriffs</li>
                <li>Name und URL der abgerufenen Datei</li>
                <li>Website, von der aus der Zugriff erfolgt (Referrer-URL)</li>
                <li>verwendeter Browser und ggf. das Betriebssystem Ihres Rechners sowie der Name Ihres Access-Providers</li>
              </ul>
              <p>
                Die genannten Daten werden durch uns zu folgenden Zwecken verarbeitet:
              </p>
              <ul>
                <li>Gewährleistung eines reibungslosen Verbindungsaufbaus der Website</li>
                <li>Gewährleistung einer komfortablen Nutzung unserer Website</li>
                <li>Auswertung der Systemsicherheit und -stabilität</li>
                <li>zu weiteren administrativen Zwecken</li>
              </ul>
              <p>
                Die Rechtsgrundlage für die Datenverarbeitung folgt dem schweizerischen 
                Datenschutzgesetz (DSG). Unser berechtigtes Interesse folgt aus den zuvor 
                genannten Zwecken zur Datenerhebung. In keinem Fall verwenden wir die erhobenen 
                Daten zu dem Zweck, Rückschlüsse auf Ihre Person zu ziehen.
              </p>

              <h4>3.2 Bei Nutzung unseres Kontaktformulars</h4>
              <p>
                Bei Fragen jeglicher Art bieten wir Ihnen die Möglichkeit, mit uns über 
                ein auf der Website bereitgestelltes Formular Kontakt aufzunehmen. Dabei 
                ist die Angabe einer gültigen E-Mail-Adresse erforderlich, damit wir wissen, 
                von wem die Anfrage stammt und um diese beantworten zu können. Weitere 
                Angaben können freiwillig getätigt werden.
              </p>
              <p>
                Die Datenverarbeitung zum Zwecke der Kontaktaufnahme mit uns erfolgt auf 
                Grundlage Ihrer freiwillig erteilten Einwilligung gemäß dem schweizerischen 
                Datenschutzgesetz (DSG). Die für die Benutzung des Kontaktformulars von uns 
                erhobenen personenbezogenen Daten werden nach Erledigung der von Ihnen gestellten 
                Anfrage automatisch gelöscht.
              </p>

              <h4>3.3 Bei Nutzung des Wizards</h4>
              <p>
                Bei der Nutzung unseres interaktiven Wizards werden Ihre Antworten lokal in 
                Ihrem Browser gespeichert, um den Wizard-Fortschritt zu erhalten. Diese 
                Daten werden nur auf Ihrem Gerät gespeichert und nicht an unsere Server 
                übertragen, es sei denn, Sie senden die Ergebnisse explizit ab. Eine 
                dauerhafte Speicherung erfolgt nicht.
              </p>

              <h3>4. Weitergabe von Daten</h3>
              <p>
                Eine Übermittlung Ihrer persönlichen Daten an Dritte zu anderen als den 
                im Folgenden aufgeführten Zwecken findet nicht statt. Wir geben Ihre 
                persönlichen Daten nur an Dritte weiter, wenn:
              </p>
              <ul>
                <li>Sie Ihre ausdrückliche Einwilligung dazu erteilt haben,</li>
                <li>die Weitergabe zur Geltendmachung, Ausübung oder Verteidigung von 
                    Rechtsansprüchen erforderlich ist und kein Grund zur Annahme besteht, 
                    dass Sie ein überwiegendes schutzwürdiges Interesse an der Nichtweitergabe 
                    Ihrer Daten haben,</li>
                <li>die Weitergabe zur Erfüllung einer rechtlichen Verpflichtung erforderlich ist,</li>
                <li>dies gesetzlich zulässig und für die Abwicklung von Vertragsverhältnissen 
                    mit Ihnen erforderlich ist.</li>
              </ul>

              <h3>5. Betroffenenrechte</h3>
              <p>
                Gemäß dem schweizerischen Datenschutzgesetz (DSG) haben Sie folgende Rechte:
              </p>
              <ul>
                <li>Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu verlangen;</li>
                <li>die Berichtigung unrichtiger oder die Vervollständigung Ihrer bei uns 
                    gespeicherten personenbezogenen Daten zu verlangen;</li>
                <li>die Löschung Ihrer bei uns gespeicherten personenbezogenen Daten zu verlangen, 
                    soweit nicht gesetzliche Aufbewahrungspflichten oder ein anderer gesetzlich 
                    zulässiger Grund der Löschung entgegensteht;</li>
                <li>die Einschränkung der Verarbeitung Ihrer personenbezogenen Daten zu verlangen;</li>
                <li>der Verarbeitung Ihrer personenbezogenen Daten zu widersprechen;</li>
                <li>Ihre personenbezogenen Daten in einem strukturierten, gängigen und 
                    maschinenlesbaren Format zu erhalten oder die Übermittlung an einen anderen 
                    Verantwortlichen zu verlangen (Datenportabilität);</li>
                <li>sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten 
                    (EDÖB) zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer 
                    personenbezogenen Daten gegen das DSG verstößt.</li>
              </ul>

              <h3>6. Datensicherheit</h3>
              <p>
                Wir verwenden innerhalb des Website-Besuchs das verbreitete SSL-Verfahren 
                (Secure Socket Layer) in Verbindung mit der jeweils höchsten Verschlüsselungsstufe, 
                die von Ihrem Browser unterstützt wird. In der Regel handelt es sich dabei um 
                eine 256 Bit Verschlüsselung. Falls Ihr Browser keine 256-Bit-Verschlüsselung 
                unterstützt, greifen wir stattdessen auf 128-Bit v3 Technologie zurück. Ob eine 
                einzelne Seite unseres Internetauftritts verschlüsselt übertragen wird, erkennen 
                Sie an der geschlossenen Darstellung des Schüssel- beziehungsweise Schloss-Symbols 
                in der unteren Statusleiste Ihres Browsers.
              </p>
              <p>
                Wir bedienen uns im Übrigen geeigneter technischer und organisatorischer 
                Sicherheitsmaßnahmen, um Ihre Daten gegen zufällige oder vorsätzliche 
                Manipulationen, teilweisen oder vollständigen Verlust, Zerstörung oder gegen 
                den unbefugten Zugriff Dritter zu schützen. Unsere Sicherheitsmaßnahmen werden 
                entsprechend der technologischen Entwicklung fortlaufend verbessert.
              </p>

              <h3>7. Aktualität und Änderung dieser Datenschutzerklärung</h3>
              <p>
                Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Dezember 2025.
              </p>
              <p>
                Durch die Weiterentwicklung unserer Website und Angebote darüber oder aufgrund 
                geänderter gesetzlicher beziehungsweise behördlicher Vorgaben kann es notwendig 
                werden, diese Datenschutzerklärung zu ändern. Die jeweils aktuelle 
                Datenschutzerklärung kann jederzeit auf der Website unter dem Link 
                "Datenschutz" von Ihnen abgerufen und ausgedruckt werden.
              </p>

              <h3>8. Kontakt für Datenschutzfragen</h3>
              <p>
                Wenn Sie Fragen zum Datenschutz haben, schreiben Sie uns bitte eine E-Mail 
                oder wenden Sie sich direkt an die für den Datenschutz verantwortliche Person 
                in unserem Unternehmen:<br />
                <br />
                E-Mail: {contactEmail}<br />
                Telefon: +41 41 757 67 34
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
