// Sichtbare Meldung, wenn der Server eine Interaktion dauerhaft ablehnt.
//
// Bewusst kein Modal: die Person soll weiterarbeiten können, und der Fehler ist
// nicht ihrer. Aber auch bewusst nicht nur eine Konsolenzeile — genau das war
// der Grund, warum agent_trace eine Woche lang lautlos keinen Fortschritt
// geschrieben hat.
//
// Der Text sagt zwei Dinge, die eine teilnehmende Person wissen muss: dass sie
// nichts falsch gemacht hat, und dass ihr Fortschritt in diesem Block nicht
// gespeichert wurde. Das Zweite ist der Punkt — wer glaubt, ein Modul beendet
// zu haben, kommt sonst erst beim Zertifikat dahinter.

import { useProgress } from '../state/ProgressContext'
import { labels } from '../labels'

const t = labels.saveError

export default function SaveErrorBanner() {
  const { saveError, dismissSaveError } = useProgress()
  if (!saveError) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-300 bg-amber-50 px-4 py-3 shadow-lg"
      style={{ borderTopStyle: 'solid' }}
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <span aria-hidden className="pt-0.5 text-lg leading-none">
          ⚠️
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-amber-900">{t.title}</p>
          <p className="mt-0.5 font-sans text-sm text-amber-900">{t.body}</p>
          <p className="mt-1 font-sans text-xs text-amber-800">
            {t.detail(saveError.artifactId, saveError.code ?? String(saveError.message))}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissSaveError}
          className="shrink-0 rounded border border-amber-400 px-2 py-1 font-sans text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
          style={{ borderStyle: 'solid' }}
        >
          {t.dismiss}
        </button>
      </div>
    </div>
  )
}
