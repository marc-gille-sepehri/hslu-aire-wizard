// The approval card. A finished-looking draft — recipient, subject, body; a
// file with its before/after; a calendar entry — stamped "nicht gesendet".
//
// This is where the widget reads as real, and it is exactly where a planted
// passage hurts, because the draft suddenly carries a different recipient. The
// emphasised fields are the ones an injection rewrites, which is why they are
// set apart rather than listed with the rest.

import { useState } from 'react'
import type { RunIntent } from './agentApi'

interface Props {
  intent: RunIntent
  /** False for a timer run — nobody was in the loop, and it is too late to be. */
  decidable: boolean
  busy: boolean
  onDecide: (approved: boolean, reason?: string) => void
  onShowStep: () => void
}

const KIND_LABEL: Record<RunIntent['preview']['kind'], string> = {
  mail: 'E-Mail',
  file: 'Datei',
  task: 'Aufgabe',
  meeting: 'Termin',
}

export default function IntentCard({ intent, decidable, busy, onDecide, onShowStep }: Props) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  const decided = intent.approved !== null
  const { preview } = intent

  return (
    <div
      className={`rounded-md border bg-white ${
        decided ? 'border-mist' : 'border-navy shadow-sm'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 border-b border-mist px-3 py-2">
        <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
          ✋ {KIND_LABEL[preview.kind]}
        </span>
        <button
          type="button"
          onClick={onShowStep}
          className="shrink-0 font-sans text-xs text-navy hover:underline"
        >
          Schritt {intent.atStep}
        </button>
      </div>

      <div className="space-y-2 px-3 py-3">
        <p className="font-sans text-sm font-semibold text-navy">{preview.title}</p>

        {preview.fields.map((field, i) => (
          <div key={i}>
            <div className="font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
              {field.label}
            </div>
            <div
              className={`whitespace-pre-wrap break-words font-sans text-sm ${
                field.emphasis
                  ? 'rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-slate-900'
                  : 'text-slate-700'
              }`}
            >
              {field.value || '—'}
            </div>
          </div>
        ))}

        {preview.kind === 'file' && (
          <div className="space-y-1">
            <div className="font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
              Vorher / nachher
            </div>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-red-50 px-2 py-1 font-mono text-[0.7rem] text-red-900">
              {preview.before || '(Datei existiert noch nicht)'}
            </pre>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-emerald-50 px-2 py-1 font-mono text-[0.7rem] text-emerald-900">
              {preview.after}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-mist bg-cream px-3 py-2">
        <span className="rounded border border-slate-300 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500">
          nicht gesendet
        </span>

        {decided ? (
          <span
            className={`ml-auto font-sans text-xs font-semibold ${
              intent.approved ? 'text-emerald-700' : 'text-slate-500'
            }`}
          >
            {intent.approved ? 'freigegeben' : 'abgelehnt'}
          </span>
        ) : decidable ? (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setRejecting((v) => !v)}
              className="rounded border border-slate-300 px-2 py-1 font-sans text-xs font-semibold text-slate-600 transition-colors hover:bg-white disabled:opacity-40"
            >
              Ablehnen
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(true)}
              className="rounded border-2 border-navy bg-navy px-2 py-1 font-sans text-xs font-semibold text-white transition-colors hover:bg-white hover:text-navy disabled:opacity-40"
            >
              Freigeben
            </button>
          </div>
        ) : (
          // A timer run had no one in the loop. Saying so on the card is the
          // point of the exercise, not an apology for a missing button.
          <span className="ml-auto text-right font-sans text-xs text-amber-800">
            ohne Freigabe gelaufen
          </span>
        )}
      </div>

      {rejecting && !decided && decidable && (
        <div className="space-y-2 border-t border-mist px-3 py-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Begründung (optional) — der Agent liest sie und macht weiter"
            className="w-full rounded-md border border-slate-300 px-2 py-1 font-sans text-xs text-slate-800 focus:border-slate-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRejecting(false)
              onDecide(false, reason.trim() || undefined)
            }}
            className="rounded border border-slate-300 px-2 py-1 font-sans text-xs font-semibold text-slate-700 hover:bg-cream disabled:opacity-40"
          >
            Ablehnung senden
          </button>
        </div>
      )}
    </div>
  )
}
