import { Link } from 'react-router-dom'
import { FaFilePdf } from 'react-icons/fa'
import './AwardPage.css'
import { labels } from '../training/labels'

const REGISTRATION_URL = 'https://forms.office.com/e/DSkmSUEmBq'

function AwardPage() {
  return (
    <section className="award-page">
      <div className="container">
        <h1 className="award-page-title">{labels.award.title}</h1>

        <div className="award-page-content">
          <p className="award-intro">
            Die Hochschule Luzern vergibt den «Best AI@RE Use Case Award 2026». Ziel ist es,
            der Immobilienbranche zu zeigen, was mit AI möglich ist und wie dadurch Prozesse
            und Lösungen verändert werden. Entwicklern soll eine Plattform gegeben werden, um
            ihre AI-Produkte der Branche zu zeigen.
          </p>

          <h2>{labels.award.whoCanEnter}</h2>
          <p>{labels.award.solutionsFrom}</p>
          <ul>
            <li>{labels.award.fieldValuation}</li>
            <li>{labels.award.fieldConstruction}</li>
            <li>{labels.award.fieldOperations}</li>
            <li>{labels.award.fieldEsg}</li>
            <li>{labels.award.fieldFinance}</li>
            <li>{labels.award.fieldAgents}</li>
          </ul>
          <p className="award-requirement">{labels.award.prerequisiteLine}</p>

          <h2>{labels.award.requirementsTitle}</h2>
          <ul>
            <li>{labels.award.req1}</li>
            <li>{labels.award.req2}</li>
            <li>{labels.award.req3}</li>
          </ul>

          <h2>{labels.award.processTitle}</h2>
          <ul>
            <li>{labels.award.step1}</li>
            <li>{labels.award.step2}</li>
            <li>{labels.award.step3}</li>
            <li>{labels.award.step4}</li>
            <li>{labels.award.step5}</li>
          </ul>

          <h2>{labels.award.moreDetails}</h2>
          <a href="/AIRE-BestUseCase-Praesentation-2026.pdf" target="_blank" rel="noopener noreferrer" className="award-details-link">
            <FaFilePdf className="award-details-icon" />
            AIRE-BestUseCase-Praesentation-2026.pdf
          </a>

          <div className="award-cta">
            <a href={REGISTRATION_URL} target="_blank" rel="noopener noreferrer" className="cta-button">{labels.award.apply}</a>
            <Link to="/" className="cta-button cta-button-secondary">{labels.award.backHome}</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AwardPage
