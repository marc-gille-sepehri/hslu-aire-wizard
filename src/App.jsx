import { useState } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import WizardPage from './pages/WizardPage'
import ResultPage from './pages/ResultPage'
import StatisticsPage from './pages/StatisticsPage'
import AwardVotePage from './pages/AwardVotePage'
import AwardResultsPage from './pages/AwardResultsPage'
import MarketTestPage from './pages/MarketTestPage'
import TrainingApp from './training/TrainingApp'
import AdminApp from './training/admin/AdminApp'
import EnforcementSignalApp from './training/enforcement/EnforcementSignalApp'
import CourseRouter, { NotFound as CourseNotFound } from './training/routing/CourseRouter'
import { hasCoderAccess } from './training/enforcement/enforcementApi'
import { useAuth } from './training/auth/AuthContext'
import RegisterDialog from './training/auth/RegisterDialog'
import ProfileDialog from './training/auth/ProfileDialog'
import { apiBaseUrl, contactEmail } from './config/configuration'
import './App.css'
import LocaleSwitcher from './training/components/LocaleSwitcher'
import { labels, useLocale } from './training/labels'

function App() {
  // Der Katalog ist eine lebende Sicht, aber React muss davon erfahren: ohne
  // diesen Aufruf bleibt die Kopfzeile nach dem Sprachwechsel stehen, waehrend
  // der Lernbereich darunter schon umgestellt hat — und genau so ist es
  // aufgefallen.
  useLocale()
  const [showImprint, setShowImprint] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { status, user, logout } = useAuth()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  // Der Kundenadministrator kommt ebenfalls in den Administrationsbereich —
  // sieht dort aber nur die eigene Organisation (der Server schneidet zu).
  const isAdmin = !!user?.roles?.some((r) => r === 'Administrator' || r === 'Kundenadministrator')
  // Same gate as the server: coders and Administrators reach the coding route.
  const isCoder = hasCoderAccess(user?.roles)

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
    submitButton.textContent = labels.home.formSending
    
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
      alert(labels.home.formThanks)
    } catch (error) {
      console.error('Error submitting contact form:', error)
      alert(labels.home.formError)
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
              <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{labels.site.navHome}</Link>
              <Link to="/statistics">{labels.site.navStatistics}</Link>
              {status === 'authenticated' && user && (
                <Link to="/market-test">{labels.site.navMarketData}</Link>
              )}
              {status === 'authenticated' && user && <Link to="/training">{labels.site.navTraining}</Link>}
              {isCoder && <Link to="/enforcement-signal">{labels.site.navCoding}</Link>}
              {isAdmin && <Link to="/admin">{labels.site.navAdmin}</Link>}
              {location.pathname === '/' && (
                <a href="#contact" onClick={(e) => { e.preventDefault(); const element = document.getElementById('contact'); if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{labels.site.navContact}</a>
              )}
              {status === 'authenticated' && user ? (
                <span className="nav-auth">
                  <button
                    type="button"
                    className="nav-user nav-user-btn"
                    onClick={() => setProfileOpen(true)}
                    title={labels.site.myProfile}
                  >
                    {`${user.firstName} ${user.lastName}`.trim()}
                  </button>
                  <button type="button" className="nav-auth-btn" onClick={logout}>{labels.site.signOut}</button>
                </span>
              ) : status === 'anonymous' ? (
                <span className="nav-auth">
                  <button type="button" className="nav-auth-btn nav-auth-btn--primary" onClick={() => setRegisterOpen(true)}>{labels.site.register}</button>
                  <button type="button" className="nav-auth-btn" onClick={() => navigate('/training')}>{labels.site.signIn}</button>
                </span>
              ) : null}
              {/* Ganz rechts: wer die Sprache sucht, sucht sie am Rand der
                  Kopfzeile — und zwar auch ohne Anmeldung. */}
              <LocaleSwitcher className="nav-locale" />
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
          <Route path="/training" element={<TrainingApp />} />
          <Route path="/training/:moduleId" element={<TrainingApp />} />
          <Route path="/training/:courseId/:moduleId" element={<TrainingApp />} />
          <Route path="/admin" element={<AdminApp />} />
          <Route path="/enforcement-signal" element={<EnforcementSignalApp />} />

          {/* Course navigation by URL. The canonical path is redundant on
              purpose — a URL read off a slide should say what it points at —
              and every segment is checked, so a mismatch is a dead address
              rather than a silent redirect to the place we guess was meant.
              Short forms and /active resolve to the canonical path. */}
          <Route path="/courses/:courseId" element={<CourseRouter mode="course" />} />
          <Route path="/courses/:familyId/active" element={<CourseRouter mode="active" />} />
          <Route path="/courses/:courseId/modules/:moduleId" element={<CourseRouter mode="module" />} />
          <Route
            path="/courses/:courseId/modules/:moduleId/sections/:sectionId"
            element={<CourseRouter mode="section" />}
          />
          <Route path="/m/:moduleId" element={<CourseRouter mode="short-module" />} />
          <Route path="/s/:moduleId/:sectionId" element={<CourseRouter mode="short-section" />} />
          <Route path="*" element={<CourseNotFound />} />
        </Routes>
      </main>

      {profileOpen && <ProfileDialog onClose={() => setProfileOpen(false)} />}

      {registerOpen && (
        <RegisterDialog
          onClose={() => setRegisterOpen(false)}
          onLogin={() => {
            setRegisterOpen(false)
            navigate('/training')
          }}
        />
      )}

      <footer className="site-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>AI@RE</h3>
              <p>{labels.site.tagline}</p>
            </div>
            <div className="footer-section">
              <h4>{labels.site.navigation}</h4>
              <ul>
                <li><Link to="/">{labels.site.navHome}</Link></li>
                <li><Link to="/statistics">{labels.site.navStatistics}</Link></li>
                {location.pathname === '/' && (
                  <li><a href="#contact">{labels.site.navContact}</a></li>
                )}
              </ul>
            </div>
            <div className="footer-section">
              <h4>{labels.site.navContact}</h4>
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
                {labels.site.imprint}
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
                {labels.site.privacy}
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
                aria-label={labels.site.close}
              >
                ×
              </button>
            </div>
              <p className="legal-language-note">{labels.site.legalGermanOnly}</p>
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
                aria-label={labels.site.close}
              >
                ×
              </button>
            </div>
              <p className="legal-language-note">{labels.site.legalGermanOnly}</p>
            <div className="imprint-content">
              <h3>1. Einleitung</h3>
              <p>
                Mit dieser Datenschutzerklärung informieren wir Sie über die Verarbeitung 
                personenbezogener Daten im Rahmen unserer Website gemäß dem schweizerischen 
                Datenschutzgesetz (DSG). Wir nehmen den Schutz Ihrer persönlichen Daten sehr 
                ernst und behandeln diese vertraulich und entsprechend den gesetzlichen 
                Bestimmungen.
              </p>
              <p>
                Unser Angebot besteht aus einem öffentlichen Teil (Informationsseiten, 
                Readiness-Check, Award-Abstimmung) und einem passwortgeschützten Lernbereich 
                unter <em>/training</em>. Im Lernbereich kommen interaktive Bausteine zum 
                Einsatz, die Eingaben an KI-Dienste Dritter übermitteln. Was dabei genau 
                übertragen wird, steht in Abschnitt 4.
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

              <h4>3.3 Beim Readiness-Check und beim Transformation Check</h4>
              <p>
                Der Readiness-Check führt Sie durch einen Fragebogen. Während der Bearbeitung 
                bleiben Ihre Antworten in Ihrem Browser. Erst wenn Sie den Check absenden, 
                übermitteln Sie uns Vor- und Nachname, E-Mail-Adresse, Angaben zu Ihrem 
                Unternehmen (Grösse, Land, Tätigkeitsfeld) sowie Ihre Antworten. Wir 
                speichern diese Angaben zusammen mit dem berechneten Ergebnis in unserer 
                Datenbank, um Ihnen die Auswertung zuzustellen und die Ergebnisse in 
                anonymisierter Form auszuwerten. Ohne Absenden verlassen die Antworten Ihr 
                Gerät nicht. Für den Transformation Check gilt dasselbe; zusätzlich geht bei 
                jedem abgeschlossenen Check eine Benachrichtigung an unsere eigene 
                Info-Adresse.
              </p>
              <p>
                Das Feld für den Newsletter ist getrennt und freiwillig. Setzen Sie das 
                Häkchen, erhalten Sie zunächst eine Bestätigungsmail; erst nach Ihrer 
                Bestätigung (Double Opt-in) legen wir einen Kontakt bei unserem 
                Newsletter-Dienstleister an (siehe Abschnitt 5). Ohne Bestätigung geschieht 
                das nicht. Sie können den Newsletter jederzeit über den Link in jeder 
                Aussendung oder per E-Mail an uns abbestellen.
              </p>

              <h4>3.4 Bei der Award-Abstimmung</h4>
              <p>
                Bei der Abstimmung speichern wir Ihre E-Mail-Adresse, die gewählte
                Kandidatur und den Zeitpunkt der Stimmabgabe. Die E-Mail-Adresse dient dazu,
                dass jede Person nur einmal abstimmen kann; sie wird für kein anderes Ziel
                verwendet. Möchten Sie zusätzlich über das Ergebnis informiert werden,
                vermerken wir das gesondert. Die veröffentlichten Ergebnisse sind aggregiert
                und lassen keinen Rückschluss auf einzelne Teilnehmende zu.
              </p>

              <h4>3.5 Konto und Anmeldung im Lernbereich</h4>
              <p>
                Der Lernbereich ist nur angemeldeten Personen zugänglich. Die Anmeldung 
                erfolgt ohne Passwort: Sie geben Ihre E-Mail-Adresse an und erhalten einen 
                Einmalcode, der zehn Minuten gültig und einmal verwendbar ist. Zu Ihrem 
                Konto speichern wir Vor- und Nachname, E-Mail-Adresse, Ihre Rolle 
                (z. B. Teilnehmende, Trainerin, Administrator), die Zuordnung zu einer 
                Organisation sowie den Zeitpunkt der letzten Anmeldung.
              </p>
              <p>
                Nach erfolgreicher Anmeldung legt der Browser ein Sitzungsmerkmal (JSON Web 
                Token, 30 Tage gültig) im lokalen Speicher Ihres Geräts ab, damit Sie sich 
                nicht bei jedem Seitenaufruf neu anmelden müssen. Es handelt sich nicht um 
                ein Cookie zu Werbe- oder Analysezwecken; siehe Abschnitt 9.
              </p>
              <p>
                Führen wir eine Schulung für ein Unternehmen durch, kann uns dessen 
                Ansprechperson eine Teilnehmerliste übergeben, aus der wir die Konten 
                anlegen. Zur Auswertung solcher Listen setzen wir ein KI-Modell ein — dabei 
                werden Namen und E-Mail-Adressen an einen Dienstleister in den USA 
                übermittelt (Abschnitt 4.2).
              </p>

              <h4>3.6 Lernfortschritt und Eingaben im Lernbereich</h4>
              <p>
                Damit Sie Ihren Fortschritt wiederfinden und wir Schulungen auswerten und 
                abrechnen können, speichern wir zu Ihrem Konto, welche Bausteine Sie 
                bearbeitet haben. Je nach Baustein gehört dazu auch der Inhalt Ihrer 
                Eingabe:
              </p>
              <ul>
                <li>bei Auswahlaufgaben die gewählte Antwort und ob sie richtig war;</li>
                <li>bei Prompt-Bausteinen der von Ihnen abgeschickte Text und das gewählte Modell;</li>
                <li>bei Reflexionsaufgaben Ihr freier Text;</li>
                <li>bei Modellierungsaufgaben das von Ihnen erstellte Diagramm;</li>
                <li>bei Werkzeug-Bausteinen die von Ihnen eingegebene Server-Adresse und das aufgerufene Werkzeug;</li>
                <li>bei den Agenten-Bausteinen der vollständige Verlauf des Laufs — Ihre Aufgabenstellung, ein von Ihnen eingefügtes Dokument, die Werkzeugaufrufe sowie Anfragen und Antworten des Modells.</li>
              </ul>
              <p>
                Diese Inhalte sind Ihrem Konto zugeordnet. Trainerinnen und Trainer sowie 
                Administratorinnen und Administratoren Ihrer Organisation können den 
                Bearbeitungsstand einsehen. Reine Bedienspuren ohne Lernwert — etwa reines 
                Blättern — protokollieren wir nicht.
              </p>

              <h4>3.7 Hochgeladene Dokumente</h4>
              <p>
                Einzelne Bausteine erlauben es, eine Datei hochzuladen oder einen Text 
                einzufügen, um Konvertierung und Auswertung zu üben. Diese Dateien laufen 
                über unseren Server an einen von uns betriebenen Konvertierungsdienst und 
                werden dort zur Umwandlung verarbeitet; die Datei selbst legen wir nicht 
                dauerhaft ab. Gespeichert wird, dass und in welchem Format eine Umwandlung 
                stattgefunden hat. Bei den Agenten-Bausteinen bleibt ein eingefügter 
                Dokumententext dagegen Teil des gespeicherten Laufs (Abschnitt 3.6) und wird 
                an den KI-Dienst übermittelt.
              </p>
              <p>
                <strong>Bitte laden Sie in Übungsbausteinen keine Dokumente hoch, die 
                Personendaten Dritter, Geschäftsgeheimnisse oder Mandantendaten enthalten.</strong> 
                Verwenden Sie anonymisierte oder erfundene Unterlagen.
              </p>

              <h4>3.8 Teilnahme an Erhebungen und Studien</h4>
              <p>
                Wir führen im Lernbereich fachliche Erhebungen durch, etwa zur Bewertung 
                von Fallbeispielen. Wenn Sie teilnehmen, speichern wir Ihre Bewertungen und 
                Begründungen zusammen mit Ihrer Kennung sowie die zu Beginn erfragten 
                Angaben zu Rolle und Vorerfahrung. Die Teilnahme ist freiwillig. 
                Auswertungen und Veröffentlichungen erfolgen ausschliesslich aggregiert; 
                einzelne Personen werden darin nicht genannt.
              </p>

              <h3>4. Einsatz von KI-Diensten</h3>
              <h4>4.1 Warum und wann</h4>
              <p>
                Der Lernbereich zeigt den Umgang mit KI-Systemen nicht nur, er führt ihn 
                vor. Dafür senden wir Inhalte an KI-Anbieter, deren Modelle wir nicht selbst 
                betreiben. Das geschieht <strong>nur, wenn Sie einen entsprechenden Baustein 
                aktiv auslösen</strong> — durch Abschicken eines Prompts, Starten eines 
                Agentenlaufs oder Freigeben eines Schleifenschritts. Beim blossen Lesen 
                eines Kursabschnitts verlässt nichts die Plattform.
              </p>
              <p>
                Die Zugangsschlüssel liegen ausschliesslich auf unserem Server. Ihr Browser 
                spricht nie direkt mit einem KI-Anbieter; jede Anfrage läuft über uns. 
                Automatisierte Entscheidungen mit Rechtswirkung für Sie treffen wir auf 
                dieser Grundlage nicht — die Ergebnisse sind Übungsmaterial.
              </p>

              <h4>4.2 Anthropic</h4>
              <p>
                Für die Sprachmodelle nutzen wir die Programmierschnittstelle von{' '}
                <strong>Anthropic, PBC, 548 Market St, PMB 90375, San Francisco, CA 94104,
                USA</strong>. An Anthropic übermittelt werden:
              </p>
              <ul>
                <li>der Text, den Sie im Prompt-Baustein abschicken, samt der vom Kurs vorgegebenen Anweisung;</li>
                <li>bei den Agenten-Bausteinen und der Agentenschleife: Ihre Aufgabenstellung, ein von Ihnen eingefügtes Dokument, die Beschreibungen der Übungswerkzeuge und deren Ergebnisse, und zwar in jedem Schleifendurchlauf erneut der bisherige Gesprächsverlauf;</li>
                <li>beim Orchestrierungs-Baustein die Aufgabenstellung und der Werkzeugkatalog;</li>
                <li>bei der Kurserstellung durch unsere Autorinnen und Autoren Auszüge des Kursmaterials, etwa zur Beschreibung von Abbildungen;</li>
                <li>beim Import von Teilnehmerlisten durch Administratorinnen und Administratoren die in der Liste enthaltenen Namen und E-Mail-Adressen.</li>
              </ul>
              <p>
                <strong>Nicht übermittelt</strong> werden Ihr Name, Ihre E-Mail-Adresse oder 
                eine Konto-Kennung: Unsere Anfragen an Anthropic enthalten keine 
                Nutzerkennung. Anthropic kann eine Anfrage daher nicht Ihnen zuordnen — es 
                sei denn, Sie schreiben personenbezogene Angaben selbst in Ihre Eingabe. 
                Einzige Ausnahme ist der Import von Teilnehmerlisten, bei dem die 
                Personendaten gerade der Gegenstand der Verarbeitung sind.
              </p>
              <p>
                Anthropic verarbeitet die Daten als unser Auftragsbearbeiter auf Grundlage
                eines Vertrags zur Auftragsbearbeitung. Eingaben und Ausgaben werden
                <strong> nicht zum Training der Modelle verwendet</strong>. Für unseren Zugang
                ist zudem <strong>Zero Data Retention</strong> vereinbart: Anthropic bewahrt
                die Inhalte nach Beantwortung der Anfrage nicht auf, auch nicht befristet zur
                Missbrauchsprüfung. Was dauerhaft gespeichert bleibt, steht also bei uns
                (Abschnitt 3.6), nicht dort. Die Verarbeitung selbst findet in den USA statt
                (siehe Abschnitt 6).
              </p>

              <h4>4.3 Weitere KI-Dienste</h4>
              <p>
                Für den Baustein zum Vergleich von Textbedeutungen berechnen wir 
                sogenannte Einbettungen. Dafür übermitteln wir die von Ihnen eingegebenen 
                Texte an <strong>OpenAI, L.L.C., 1960 Bryant Street, San Francisco, CA 94110,
                USA</strong>. Auch hier gehen keine Konto-Kennungen mit. Nach den 
                Nutzungsbedingungen für die Programmierschnittstelle werden die Daten nicht 
                zum Training verwendet.
              </p>
              <p>
                Der Kursassistent, der Fragen zum Kursmaterial beantwortet, läuft über einen 
                von uns beauftragten Dienst (siehe Abschnitt 5). Ihre Frage und der 
                Gesprächsverlauf werden dorthin übermittelt.
              </p>

              <h3>5. Eingesetzte Dienstleister</h3>
              <p>
                Wir setzen die folgenden Dienstleister als Auftragsbearbeiter ein. Sie sind 
                vertraglich verpflichtet, die Daten ausschliesslich für uns und nach unseren 
                Weisungen zu verarbeiten.
              </p>
              <ul>
                <li><strong>Amazon Web Services EMEA SARL, Luxemburg</strong> — Betrieb unserer 
                    Anwendungsserver und Ablage von Kursdokumenten. Standort der Systeme: 
                    Region Frankfurt am Main, Deutschland.</li>
                <li><strong>MongoDB, Inc., USA</strong> (MongoDB Atlas) — Datenbank mit Konten, 
                    Lernfortschritt und Check-Ergebnissen. Die Daten liegen physisch in 
                    Frankfurt am Main, Deutschland.</li>
                <li><strong>GitHub, Inc., USA</strong> (GitHub Pages) — Auslieferung der 
                    Website-Dateien an Ihren Browser.</li>
                <li><strong>IONOS SE, Montabaur, Deutschland</strong> — Versand unserer E-Mails, 
                    etwa der Anmeldecodes und Auswertungen.</li>
                <li><strong>Systeme.io, Frankreich</strong> — Verwaltung und Versand des 
                    Newsletters. Ein Kontakt wird erst nach Ihrer Bestätigung angelegt 
                    (Abschnitt 3.3).</li>
                <li><strong>The Real Insight GmbH</strong> — Betrieb des Kursassistenten und 
                    der Dienste zur Dokumentenaufbereitung.</li>
                <li><strong>Anthropic, PBC, USA</strong> und <strong>OpenAI, L.L.C., USA</strong> — 
                    KI-Dienste gemäss Abschnitt 4.</li>
              </ul>
              <p>
                Wir setzen keine Dienste zur Reichweitenmessung, zur Werbung oder zum 
                Nutzer-Tracking ein.
              </p>

              <h3>6. Bekanntgabe ins Ausland</h3>
              <p>
                Unsere Anwendungsserver, die Datenbank und der E-Mail-Versand befinden sich 
                in Deutschland, der Newsletter-Dienst in Frankreich. Für diese Länder hat der 
                Schweizer Bundesrat einen angemessenen Datenschutz anerkannt.
              </p>
              <p>
                Bei den in Abschnitt 4 genannten KI-Diensten sowie bei der Auslieferung der
                Website über GitHub Pages werden Daten in die <strong>USA</strong> übermittelt.
                Die Übermittlung stützt sich auf die Standardvertragsklauseln der
                Europäischen Kommission in der vom EDÖB anerkannten Fassung.
              </p>
              <p>
                Für die Übermittlung an Anthropic kommt hinzu, dass die Inhalte dort nicht
                gespeichert werden (Zero Data Retention, Abschnitt 4.2). Ein behördliches
                Auskunftsbegehren könnte deshalb keinen Datenbestand erfassen, sondern
                allenfalls Inhalte während ihrer Verarbeitung. Ganz ausschliessen lässt sich
                ein Zugriff durch US-Behörden dennoch nicht. Wenn Sie das vermeiden möchten,
                nutzen Sie die KI-Bausteine nicht oder geben Sie dort keine Angaben ein, die
                Rückschlüsse auf Sie oder Dritte zulassen.
              </p>

              <h3>7. Aufbewahrung und Löschung</h3>
              <ul>
                <li>Server-Logfiles: kurzfristig, anschliessend automatisiert gelöscht.</li>
                <li>Anmeldecodes: zehn Minuten, danach ungültig; das Sitzungsmerkmal im 
                    Browser läuft nach 30 Tagen ab.</li>
                <li>Konto, Lernfortschritt und Eingaben: für die Dauer des Schulungsverhältnisses 
                    und so lange, wie wir sie zum Nachweis der Teilnahme benötigen.</li>
                <li>Ergebnisse des Readiness-Checks: so lange, wie die Auswertung für Sie 
                    abrufbar sein soll.</li>
                <li>Anfragen über das Kontaktformular: bis zur Erledigung.</li>
                <li>Newsletter-Kontakt: bis zur Abmeldung.</li>
              </ul>
              <p>
                Darüber hinaus löschen wir Ihre Daten, sobald der Zweck entfällt und keine 
                gesetzliche Aufbewahrungspflicht entgegensteht. Sie können jederzeit die 
                Löschung Ihres Kontos und der zugehörigen Eingaben verlangen (Abschnitt 8).
              </p>

              <h3>8. Weitergabe von Daten und Ihre Rechte</h3>
              <p>
                Über die in den Abschnitten 4 und 5 genannten Auftragsbearbeiter hinaus 
                geben wir Ihre persönlichen Daten nur an Dritte weiter, wenn:
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
              <p>
                Buchen Ihre Arbeitgeberin oder Ihr Arbeitgeber die Schulung, erfährt die dort 
                benannte Ansprechperson, wer teilgenommen und welche Module abgeschlossen 
                hat. Freitexte und Prompts aus Übungen geben wir dorthin nicht weiter.
              </p>
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
                <li>eine erteilte Einwilligung jederzeit mit Wirkung für die Zukunft zu widerrufen;</li>
                <li>sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten 
                    (EDÖB) zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer 
                    personenbezogenen Daten gegen das DSG verstößt.</li>
              </ul>

              <h3>9. Cookies und lokale Speicherung</h3>
              <p>
                Wir setzen keine Cookies zu Werbe-, Analyse- oder Tracking-Zwecken ein und 
                binden keine Dienste zur Reichweitenmessung ein. Aus diesem Grund erscheint 
                auf unserer Website auch kein Einwilligungsbanner.
              </p>
              <p>
                Im lokalen Speicher Ihres Browsers legen wir ausschliesslich technisch 
                notwendige Angaben ab: das Sitzungsmerkmal nach der Anmeldung, Ihre 
                Sprachwahl sowie den Bearbeitungsstand der Bausteine, damit er beim 
                Neuladen nicht verloren geht. Diese Angaben verlassen Ihr Gerät nur, soweit 
                in dieser Erklärung beschrieben, und lassen sich über die Einstellungen 
                Ihres Browsers jederzeit löschen.
              </p>

              <h3>10. Datensicherheit</h3>
              <p>
                Der Datenverkehr zwischen Ihrem Browser und unseren Servern ist durchgehend 
                mit TLS verschlüsselt (aktuell TLS 1.2 und 1.3). Ob eine Seite verschlüsselt 
                übertragen wird, erkennen Sie am Schloss-Symbol in der Adresszeile Ihres 
                Browsers. Die Zugangsschlüssel zu den eingesetzten Diensten liegen 
                ausschliesslich serverseitig und werden nie an den Browser ausgeliefert. Der 
                Zugriff auf Konten und Lernfortschritt ist an eine Anmeldung und an Rollen 
                gebunden.
              </p>
              <p>
                Wir bedienen uns im Übrigen geeigneter technischer und organisatorischer 
                Sicherheitsmaßnahmen, um Ihre Daten gegen zufällige oder vorsätzliche 
                Manipulationen, teilweisen oder vollständigen Verlust, Zerstörung oder gegen 
                den unbefugten Zugriff Dritter zu schützen. Unsere Sicherheitsmaßnahmen werden 
                entsprechend der technologischen Entwicklung fortlaufend verbessert.
              </p>

              <h3>11. Aktualität und Änderung dieser Datenschutzerklärung</h3>
              <p>
                Diese Datenschutzerklärung ist aktuell gültig und hat den Stand September 2026.
              </p>
              <p>
                Durch die Weiterentwicklung unserer Website und Angebote darüber oder aufgrund 
                geänderter gesetzlicher beziehungsweise behördlicher Vorgaben kann es notwendig 
                werden, diese Datenschutzerklärung zu ändern. Die jeweils aktuelle 
                Datenschutzerklärung kann jederzeit auf der Website unter dem Link 
                "Datenschutz" von Ihnen abgerufen und ausgedruckt werden.
              </p>

              <h3>12. Kontakt für Datenschutzfragen</h3>
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
