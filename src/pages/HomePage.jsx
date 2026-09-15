import { Link } from 'react-router-dom'
import { contactEmail } from '../config/configuration'
import './HomePage.css'
import { labels } from '../training/labels'
import GermanOnlyNote, { checkNote, transformationNote } from '../training/components/GermanOnlyNote'

// Set to true to show PropTech Powerhouse in partner logos
const SHOW_PROPTECH_POWERHOUSE = true

function HomePage({ onContactSubmit }) {
  return (
    <>
      <section id="home" className="hero-section">
        <div className="container">
          <div className="hero-content">
            <div className="hero-award-block">
              <h3 className="hero-award-title">{labels.home.reviewTitle}</h3>
              <p className="hero-award-text">{labels.home.conferenceReview}</p>
            </div>

            <div className="hero-sponsors">
              <p className="hero-sponsors-label">{labels.home.partnersWere}</p>
              <div className="hero-sponsors-logos">
                <a href="https://www.gefma.de" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="GEFMA">
                  <img src="/gefma.png" alt="GEFMA" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.iz.de/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="IZ">
                  <img src="/iz.png" alt="IZ" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.immobilienbusiness.ch/de/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="IMMOBILIEN Business">
                  <img src="/ib-logo.png" alt="IMMOBILIEN Business" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.immopac.ch/de" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="ImmoPac">
                  <img src="/immopac.jpg" alt="ImmoPac" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.lukb.ch/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="LUKB">
                  <img src="/lukb.jpg" alt="LUKB" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.beyondbim.ch/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="beyondBIM">
                  <img src="/beyond-bim.jpg" alt="beyondBIM" className="hero-sponsor-logo" />
                </a>
                <a href="https://www.pom.ch/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="pom+">
                  <img src="/pom+-logo.jpg" alt="pom+" className="hero-sponsor-logo" />
                </a>
                {SHOW_PROPTECH_POWERHOUSE && (
                  <a href="https://proptechpowerhouse.com/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="PropTech Powerhouse">
                    <img src="/proptech-powerhouse.jpg" alt="PropTech Powerhouse" className="hero-sponsor-logo" />
                  </a>
                )}
                <a href="https://pt1.vc/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="PT1">
                  <img src="/pt1.png" alt="PT1" className="hero-sponsor-logo" />
                </a>
                <a href="https://qaecy.com/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="Qaecy">
                  <img src="/qaecy.svg" alt="Qaecy" className="hero-sponsor-logo" />
                </a>
                <a href="https://swissproptech.ch/" target="_blank" rel="noopener noreferrer" className="hero-sponsor-link" aria-label="SwissPropTech">
                  <img src="/swissproptech-logo.png" alt="SwissPropTech" className="hero-sponsor-logo" />
                </a>
              </div>
            </div>

            <div className="hero-cta-buttons">
              <a href="https://www.hslu.ch/de-ch/wirtschaft/agenda/veranstaltungen/2027/06/07/reprogramming-real-estate-wie-ai-die-branche-neu-definiert/" target="_blank" rel="noopener noreferrer" className="cta-button">{labels.home.nextConference}</a>
              <Link to="/check" className="cta-button cta-button-secondary">{labels.home.startReadiness}</Link>
              <a href="/transformation-check.html" className="cta-button cta-button-secondary">{labels.home.startTransformation}</a>
              <Link to="/statistics" className="cta-button cta-button-secondary">{labels.home.viewStatistics}</Link>
            </div>
            {/* Vor dem Klick, nicht danach: wer sich entscheidet, soll wissen,
                worauf er sich einlaesst. */}
            <div className="hero-language-note">
              <GermanOnlyNote text={checkNote()} />
              <GermanOnlyNote text={transformationNote()} />
            </div>
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div className="section-content">
            <p>{labels.home.leadChange}</p>
            <p>
              AI automatisiert Prozesse, verändert Rollen, verschiebt Wertschöpfung. Viele Unternehmen treiben Digitalisierung voran, ohne zu wissen, wo sie wirklich stehen.
            </p>
            <h3>{labels.home.consequence}</h3>
            <ul>
              <li>falsche Prioritäten</li>
              <li>teure Fehlentscheidungen</li>
              <li>{labels.home.consequence1}</li>
              <li>{labels.home.consequence2}</li>
              <li>{labels.home.consequence3}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="content-section content-section-textured">
        <div className="container">
          <div className="section-content">
            <h2 className="section-title">{labels.home.checkIs}</h2>
            <p>{labels.home.checkShows}</p>
            <ul>
              <li>{labels.home.shows1}</li>
              <li>{labels.home.shows2}</li>
              <li>{labels.home.shows3}</li>
              <li>{labels.home.shows4}</li>
              <li>{labels.home.shows5}</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="wizard" className="wizard-preview-section">
        <div className="container">
          <div className="wizard-preview-content">
            <h2 className="section-title">{labels.home.dimensionsTitle}</h2>
            <p className="section-description">
              Wir analysieren den Reifegrad Ihres Unternehmens in 7 entscheidenden Dimensionen, die über Erfolg oder Scheitern von AI entscheiden:
            </p>
            <div className="dimensions-list">
              <div className="dimension-item">
                <h3>1. Strategie & Orientierung</h3>
                <p>{labels.home.dim1}</p>
              </div>
              <div className="dimension-item">
                <h3>2. Daten & Informationsqualität</h3>
                <p>{labels.home.dim2}</p>
              </div>
              <div className="dimension-item">
                <h3>3. Prozesse & Systeme</h3>
                <p>{labels.home.dim3}</p>
              </div>
              <div className="dimension-item">
                <h3>4. Organisation & Rollen</h3>
                <p>{labels.home.dim4}</p>
              </div>
              <div className="dimension-item">
                <h3>5. Kompetenzen & Skills</h3>
                <p>{labels.home.dim5}</p>
              </div>
              <div className="dimension-item">
                <h3>6. Kultur & Veränderungsbereitschaft</h3>
                <p>{labels.home.dim6}</p>
              </div>
              <div className="dimension-item">
                <h3>7. Governance & Risiko</h3>
                <p>{labels.home.dim7}</p>
              </div>
            </div>
            <p className="section-description">{labels.home.resultLead}</p>
            <Link to="/check" className="cta-button">{labels.home.startNow}</Link>
            <GermanOnlyNote text={checkNote()} className="mt-3" />
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="container">
          <h2 className="section-title">{labels.home.contactTitle}</h2>
          <div className="contact-content">
            <div className="contact-info">
              <h3>{labels.home.contactLead}</h3>
              <p>
                Haben Sie Fragen zu KI-Lösungen für die Immobilienbranche? 
                Wir beraten Sie gerne zu den Möglichkeiten und der Implementierung 
                von KI-Technologien in Ihrem Unternehmen.
              </p>
              <div className="contact-details">
                <div className="contact-detail-item">
                  <strong>{labels.home.email}</strong>
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                </div>
                <div className="contact-detail-item">
                  <strong>{labels.home.phone}</strong>
                  <a href="tel:+41417576734">+41 41 757 67 34</a>
                </div>
                <div className="contact-detail-item">
                  <strong>{labels.home.address}</strong>
                  <p>Suurstoffi 1<br />6343 Rotkreuz, Schweiz</p>
                </div>
              </div>
            </div>
            <div className="contact-form">
              <form onSubmit={onContactSubmit}>
                <div className="form-group">
                  <label htmlFor="name">{labels.home.formName}</label>
                  <input type="text" id="name" name="name" required />
                </div>
                <div className="form-group">
                  <label htmlFor="email">{labels.home.formEmail}</label>
                  <input type="email" id="email" name="email" required />
                </div>
                <div className="form-group">
                  <label htmlFor="subject">{labels.home.formSubject}</label>
                  <input type="text" id="subject" name="subject" required />
                </div>
                <div className="form-group">
                  <label htmlFor="message">{labels.home.formMessage}</label>
                  <textarea id="message" name="message" rows="5" required></textarea>
                </div>
                <button type="submit" className="cta-button">{labels.home.formSend}</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default HomePage
