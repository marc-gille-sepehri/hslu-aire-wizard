import { useRef, useState } from 'react'
import { labels } from '../labels'
import { UNDECIDABLE, type OwnRating, type SeverityItemContent } from './enforcementApi'
import type { ItemSubmission } from './ItemForm'

const t = labels.enforcement.severity

// Ein Vignetten-Item: eine Situation als Fliesstext, eine Skala nach GEFMA 192,
// eine Begründung. Die Gestaltungsregeln sind hier Studienvalidität, nicht
// Geschmack:
//   • Kein Normtext und keine Attribute. Wer die Vorschrift daneben sieht,
//     beurteilt das Prüfregime mit — und der Vergleich gegen die Ableitung misst
//     dann, ob beide dieselbe Vorschrift gelesen haben, nicht ob beide dieselbe
//     Schwere sehen.
//   • Keine Zahlen an den Stufen. Der Si-Wert kommt gar nicht erst über die
//     Leitung; stünde er da, wäre nicht mehr zu trennen, ob übereinstimmt, wer
//     dieselbe Schwere sieht, oder wer dieselbe Zahl gewohnt ist.
//   • Nichts ist vorausgewählt. Eine Voreinstellung wird zur Antwort.
//   • „Nicht entscheidbar" steht gleichrangig dabei. Erzwungene Wahl erzeugt
//     Rauschen und verdeckt gerade dort, wo die Frage unbeantwortbar ist, dass
//     sie es ist.
//   • Die Begründung ist Pflicht, wenn eine Stufe gewählt wurde. Sie ist die
//     Vergleichsbasis für die Begründungen der Ableitung; ohne sie gibt es zur
//     Auditierbarkeit nichts zu vergleichen. Bei „nicht entscheidbar" ist sie
//     freiwillig — dort ist die Antwort, dass es nichts zu begründen gibt.

export default function SeverityForm({
  item,
  initial,
  heading,
  submitLabel,
  busy,
  error,
  readOnly = false,
  onSubmit,
}: {
  item: SeverityItemContent
  initial?: OwnRating
  heading: string
  submitLabel: string
  busy: boolean
  error: string | null
  readOnly?: boolean
  onSubmit: (submission: ItemSubmission) => void
}) {
  const startedAt = useRef(new Date().toISOString())
  const [choice, setChoice] = useState<string | null>(
    typeof initial?.values?.severity === 'string' ? (initial.values.severity as string) : null,
  )
  const [rationale, setRationale] = useState(initial?.rationale ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')

  const rationaleRequired = choice !== null && choice !== UNDECIDABLE
  const complete = choice !== null && (!rationaleRequired || rationale.trim().length > 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly || !complete || busy) return
    onSubmit({
      values: { severity: choice },
      lookedUpBeyondExcerpt: false,
      comment: comment.trim() || undefined,
      rationale: rationale.trim() || undefined,
      clientStartedAt: startedAt.current,
      clientSubmittedAt: new Date().toISOString(),
    })
  }

  const facts = [
    [t.regulatedType, item.regulatedTypeLabel],
    [t.hazard, item.hazardLabel],
    [t.usageClass, item.usageClassLabel],
    [t.personExposure, item.personExposureLabel],
  ].filter(([, value]) => Boolean(value)) as [string, string][]

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">{heading}</p>

      <header className="border-b border-mist pb-4">
        <h2 className="font-display text-lg font-bold text-navy">{t.heading}</h2>
        <p className="mt-1 max-w-prose font-sans text-sm text-slate-500">{t.subheading}</p>
      </header>

      {/* Weiss auf cremefarbenem Grund: die Vignette muss als eigener Gegenstand
          lesbar sein, so wie der Normtext im Kodiermodus. */}
      <div className="rounded-md border border-mist bg-white px-5 py-4">
        <p className="max-w-prose whitespace-pre-wrap font-serif text-[1.0625rem] leading-relaxed text-slate-800">
          {item.vignette}
        </p>
        {item.hazardDescription && (
          <p className="mt-3 max-w-prose border-t border-mist pt-3 font-sans text-sm text-slate-600">
            {item.hazardDescription}
          </p>
        )}
        {facts.length > 0 && (
          // Die Merkmale stehen als Liste unter dem Fliesstext, nicht als
          // Formularfelder daneben: sie sind Teil des Reizes, nicht der Frage.
          <dl className="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 border-t border-mist pt-3">
            {facts.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-sans text-xs uppercase tracking-kicker text-slate-400">{label}</dt>
                <dd className="m-0 font-sans text-sm text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <fieldset className="m-0 border-0 p-0">
        <legend className="mb-0.5 p-0 font-sans text-sm font-semibold text-slate-800">
          {t.question(item.scale.axis)}
        </legend>
        <p className="mb-2 max-w-prose font-sans text-xs text-slate-500">{t.questionHint}</p>

        <div className="mt-2 space-y-2">
          {item.scale.options.map((opt) => (
            <label
              key={opt.value}
              className={
                // „Nicht entscheidbar" ist gleichrangig gestaltet und nur durch
                // eine Linie abgesetzt, damit es nicht als weiterer Sachwert
                // gelesen wird.
                `flex items-start gap-2.5 font-sans text-sm ${readOnly ? 'text-slate-500' : 'text-slate-800'}` +
                (opt.value === UNDECIDABLE ? ' border-t border-mist pt-2' : '')
              }
            >
              <input
                type="radio"
                name={`severity-${item.itemId}`}
                className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
                disabled={readOnly}
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
              />
              <span>
                {opt.label}
                {opt.hint && <span className="ml-1.5 text-slate-400">({opt.hint})</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="mb-1.5 block font-sans text-sm font-semibold text-slate-800" htmlFor="es-rationale">
          {t.rationaleLabel}
          {!rationaleRequired && <span className="ml-1.5 font-normal text-slate-400">{labels.enforcement.optional}</span>}
        </label>
        <p className="mb-2 max-w-prose font-sans text-xs text-slate-500">{t.rationaleHint}</p>
        <textarea
          id="es-rationale"
          value={rationale}
          disabled={readOnly}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
          placeholder={t.rationalePlaceholder}
          className="w-full rounded-md border border-slate-300 p-2.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-sans text-sm font-semibold text-slate-800" htmlFor="es-comment">
          {labels.enforcement.commentLabel}
        </label>
        <textarea
          id="es-comment"
          value={comment}
          disabled={readOnly}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder={labels.enforcement.commentPlaceholder}
          className="w-full rounded-md border border-slate-300 p-2.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
          {error}
        </div>
      )}

      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!complete || busy}
            className={
              complete && !busy
                ? 'rounded-md bg-navy px-6 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-navy-light'
                : 'cursor-not-allowed rounded-md bg-mist px-6 py-2.5 font-sans text-sm font-semibold text-slate-400'
            }
          >
            {busy ? labels.enforcement.saving : submitLabel}
          </button>
        </div>
      )}
    </form>
  )
}
