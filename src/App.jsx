import { useState } from 'react'
import Wizard from './components/Wizard'
import Result from './components/Result'
import './App.css'

function App() {
  const [answers, setAnswers] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showImprint, setShowImprint] = useState(false)

  const handleComplete = (answersData) => {
    setAnswers(answersData)
    setShowResult(true)
    setShowWizard(false)
  }

  const handleReset = () => {
    setAnswers(null)
    setShowResult(false)
    setShowWizard(false)
  }

  const handleStartWizard = () => {
    setShowWizard(true)
    setShowResult(false)
    setAnswers(null)
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="container">
          <div className="header-content">
            <div className="logo-container">
              <h1 className="site-logo"><span>AI@RE</span></h1>
              <a href="https://www.hslu.ch" target="_blank" rel="noopener noreferrer" className="hslu-logo-link">
                <img 
                  src="https://www.hslu.ch/-/media/campus/common/images/header/hslu-logo.svg?sc_lang=de-ch" 
                  alt="HSLU Logo" 
                  className="hslu-logo"
                />
              </a>
            </div>
            <nav className="site-nav">
              <a href="#home" onClick={(e) => { e.preventDefault(); setShowWizard(false); setShowResult(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Home</a>
              <a href="#about" onClick={(e) => { e.preventDefault(); setShowWizard(false); setShowResult(false); const element = document.getElementById('about'); if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Über uns</a>
              <a href="#wizard" onClick={(e) => { e.preventDefault(); handleStartWizard(); }}>Wizard</a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); setShowWizard(false); setShowResult(false); const element = document.getElementById('contact'); if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Kontakt</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="site-main">
        {!showWizard && !showResult ? (
          <>
            <section id="home" className="hero-section">
              <div className="container">
                <div className="hero-content">
                  <h2 className="hero-title">Künstliche Intelligenz im Immobilienwesen</h2>
                  <p className="hero-subtitle">
                    Entdecken Sie das Potenzial von KI für Ihre Immobilienprojekte. 
                    Bewerten Sie Ihre KI-Bereitschaft und erhalten Sie personalisierte Empfehlungen.
                  </p>
                  <button className="cta-button" onClick={handleStartWizard}>
                    KI-Bereitschaft testen
                  </button>
                </div>
              </div>
            </section>

            <section id="about" className="content-section">
              <div className="container">
                <div className="section-intro">
                  <h2 className="section-title">Die Zukunft der Immobilienbranche</h2>
                  <p className="section-description">
                    Künstliche Intelligenz revolutioniert die Immobilienbranche und schafft 
                    neue Möglichkeiten für Effizienz, Präzision und Kundenerlebnis. Entdecken 
                    Sie, wie KI-Technologien bereits heute den Markt transformieren.
                  </p>
                </div>
                <div className="content-grid">
                  <div className="content-card">
                    <div className="card-icon">📊</div>
                    <h3>Automatisierte Bewertungen</h3>
                    <p>
                      KI-gestützte Systeme analysieren Marktdaten, Standortfaktoren und 
                      Immobilienmerkmale in Echtzeit, um präzise Bewertungen zu erstellen. 
                      Diese Technologie reduziert Bewertungszeiten von Wochen auf Stunden 
                      und erhöht gleichzeitig die Genauigkeit durch Berücksichtigung 
                      hunderter Variablen simultan.
                    </p>
                  </div>
                  <div className="content-card">
                    <div className="card-icon">🔮</div>
                    <h3>Predictive Analytics</h3>
                    <p>
                      Vorhersagemodelle unterstützen Investitionsentscheidungen durch 
                      Analyse historischer Trends, Marktentwicklungen und externer Faktoren. 
                      Identifizieren Sie Chancen, bevor sie sichtbar werden, und minimieren 
                      Sie Risiken durch datenbasierte Prognosen.
                    </p>
                  </div>
                  <div className="content-card">
                    <div className="card-icon">📄</div>
                    <h3>Intelligente Dokumentenverarbeitung</h3>
                    <p>
                      Automatisierte Extraktion und Analyse von Verträgen, Gutachten und 
                      Dokumenten beschleunigt Due-Diligence-Prozesse erheblich und minimiert 
                      menschliche Fehler. KI erkennt relevante Informationen, 
                      Klauseln und Risiken in Sekunden.
                    </p>
                  </div>
                  <div className="content-card">
                    <div className="card-icon">🏠</div>
                    <h3>Virtuelle Immobilienbesichtigungen</h3>
                    <p>
                      VR- und AR-Technologien ermöglichen immersive Besichtigungserlebnisse 
                      aus der Ferne. KI optimiert diese Erfahrungen durch personalisierte 
                      Präsentationen basierend auf Kundenpräferenzen und erzeugt 
                      realistische 3D-Modelle aus Grundrissen.
                    </p>
                  </div>
                  <div className="content-card">
                    <div className="card-icon">⚡</div>
                    <h3>Energieeffizienz-Optimierung</h3>
                    <p>
                      KI-Systeme analysieren Energieverbrauchsmuster und schlagen 
                      Optimierungsmaßnahmen vor. Dies reduziert Betriebskosten und 
                      verbessert die Nachhaltigkeit von Immobilienportfolios erheblich, 
                      während gleichzeitig der CO₂-Fußabdruck minimiert wird.
                    </p>
                  </div>
                  <div className="content-card">
                    <div className="card-icon">🏢</div>
                    <h3>Smart Building Management</h3>
                    <p>
                      Intelligente Gebäudeverwaltungssysteme nutzen IoT-Sensoren und KI, 
                      um Wartungsbedarf vorherzusagen, Komfort zu optimieren und 
                      Ressourcenverbrauch zu minimieren. Proaktive Instandhaltung 
                      reduziert Ausfallzeiten und Kosten.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="benefits-section">
              <div className="container">
                <h2 className="section-title">Warum KI in der Immobilienbranche?</h2>
                <div className="benefits-grid">
                  <div className="benefit-item">
                    <h3>Kosteneinsparungen</h3>
                    <p>
                      Automatisierung reduziert manuelle Arbeitsprozesse um bis zu 70%, 
                      was erhebliche Kosteneinsparungen ermöglicht und Ressourcen für 
                      strategische Aufgaben freisetzt.
                    </p>
                  </div>
                  <div className="benefit-item">
                    <h3>Präzision & Genauigkeit</h3>
                    <p>
                      KI-basierte Analysen eliminieren menschliche Fehlerquellen und 
                      liefern konsistente, objektive Ergebnisse auf Basis umfassender 
                      Datenauswertung.
                    </p>
                  </div>
                  <div className="benefit-item">
                    <h3>Zeitersparnis</h3>
                    <p>
                      Prozesse, die früher Tage oder Wochen dauerten, werden auf Stunden 
                      oder Minuten reduziert, was schnelleres Reagieren auf Marktchancen 
                      ermöglicht.
                    </p>
                  </div>
                  <div className="benefit-item">
                    <h3>Skalierbarkeit</h3>
                    <p>
                      KI-Systeme können problemlos große Datenmengen und mehrere Projekte 
                      gleichzeitig bearbeiten, ohne dass zusätzliche personelle Ressourcen 
                      erforderlich sind.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section id="wizard" className="wizard-preview-section">
              <div className="container">
                <div className="wizard-preview-content">
                  <h2 className="section-title">Bewerten Sie Ihre KI-Bereitschaft</h2>
                  <p className="section-description">
                    Unser interaktiver Wizard hilft Ihnen, den aktuellen Stand Ihrer 
                    KI-Integration zu verstehen und zeigt auf, wo Potenziale liegen. 
                    Die Bewertung umfasst fünf zentrale Dimensionen und liefert Ihnen 
                    personalisierte Handlungsempfehlungen.
                  </p>
                  <button className="cta-button" onClick={handleStartWizard}>
                    Wizard starten
                  </button>
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
                        <a href="mailto:info@ai-in-real-estate.ch">info@ai-in-real-estate.ch</a>
                      </div>
                      <div className="contact-detail-item">
                        <strong>Telefon</strong>
                        <a href="tel:+41XXXXXXXXX">+41 XX XXX XX XX</a>
                      </div>
                      <div className="contact-detail-item">
                        <strong>Adresse</strong>
                        <p>Suurstoffi 1<br />6343 Rotkreuz, Schweiz</p>
                      </div>
                    </div>
                  </div>
                  <div className="contact-form">
                    <form onSubmit={(e) => { e.preventDefault(); alert('Vielen Dank für Ihre Nachricht!'); }}>
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
        ) : showWizard ? (
          <section className="wizard-section">
            <div className="container">
        <Wizard onComplete={handleComplete} />
            </div>
          </section>
        ) : (
          <section className="result-section">
            <div className="container">
              <Result 
                answers={answers} 
                onReset={() => {
                  setAnswers(null)
                  setShowResult(false)
                  setShowWizard(true)
                }}
                onBackToHome={handleReset}
              />
            </div>
          </section>
        )}
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
                <li><a href="#home">Home</a></li>
                <li><a href="#about">Über uns</a></li>
                <li><a href="#wizard">Wizard</a></li>
                <li><a href="#contact">Kontakt</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Kontakt</h4>
              <p>Email: info@ai-in-real-estate.ch</p>
              <p>Tel: +41 XX XXX XX XX</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} AI@RE. Alle Rechte vorbehalten.</p>
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
              <a href="#privacy" className="footer-link">Datenschutz</a>
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
            <h3>Angaben gemäß § 5 TMG</h3>
            <p>
              AI@RE<br />
              Suurstoffi 1<br />
              6343 Rotkreuz<br />
              Schweiz
            </p>
            <h3>Kontakt</h3>
            <p>
              Telefon: +41 XX XXX XX XX<br />
              E-Mail: info@ai-in-real-estate.ch
            </p>
            <h3>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
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
    </div>
  )
}

export default App
