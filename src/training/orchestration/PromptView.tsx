// Was tatsächlich an das Modell ging.
//
// Der Baustein zeigt sonst nur das Ergebnis, und ein Plan, der aus dem Nichts
// erscheint, sieht nach Magie aus. Der Prompt daneben ist die Entzauberung: es
// ist ein Text, den man lesen kann, und er besteht fast ganz aus dem, was die
// teilnehmende Person selbst geschrieben hat.
//
// Deshalb sind die Teile einzeln beschriftet und mit ihrer Zeichenzahl versehen.
// Der Balken oben ist der eigentliche Inhalt der Ansicht, und er sagt etwas,
// das man nicht erwartet: mit dem Startsatz an Werkzeugen ist die eigene
// Anfrage rund ein Prozent des Ganzen. Den Rest machen Gerüst und
// Werkzeugbeschreibungen aus — Letztere wachsen mit jedem Werkzeug, das jemand
// anlegt, und genau daran wird sichtbar, warum eine schlampige Beschreibung
// den Plan ruiniert.
//
// Der Balken rechnet aus den echten Grössen; er behauptet nichts, was die
// Zahlen nicht hergeben.

import { useState } from 'react'
import type { PromptParts } from './orchestrationApi'

type Part = 'system' | 'toolbox' | 'guidance' | 'request' | 'outputSchema'

const META: Record<Part, { label: string; note: string; cls: string; bar: string }> = {
  system: {
    label: 'Systemanweisung',
    note: 'Von der Plattform. Legt fest, dass geplant und nicht ausgeführt wird.',
    cls: 'border-slate-300 bg-slate-50',
    bar: 'bg-slate-400',
  },
  toolbox: {
    label: 'Werkzeugkasten',
    note: 'Deine Werkzeuge, so wie das Modell sie sieht — mehr weiss es über sie nicht.',
    cls: 'border-sky-200 bg-sky-50',
    bar: 'bg-sky-400',
  },
  guidance: {
    label: 'Vorgaben',
    note: 'Deine Regeln. Stehen vor der Anfrage, weil sie für jede Anfrage gelten.',
    cls: 'border-emerald-200 bg-emerald-50',
    bar: 'bg-emerald-400',
  },
  request: {
    label: 'Anfrage',
    note: 'Der Einzelfall — meist der kürzeste Teil des Prompts.',
    cls: 'border-amber-200 bg-amber-50',
    bar: 'bg-amber-400',
  },
  outputSchema: {
    label: 'Erzwungenes Antwortformat',
    note: 'Kein Prompt: eine Werkzeugdefinition. Die Form der Antwort wird erzwungen, nicht erbeten.',
    cls: 'border-violet-200 bg-violet-50',
    bar: 'bg-violet-400',
  },
}

const ORDER: Part[] = ['system', 'toolbox', 'guidance', 'request', 'outputSchema']

export default function PromptView({ prompt, title }: { prompt: PromptParts; title?: string }) {
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState(false)

  const total = ORDER.reduce((sum, p) => sum + prompt.sizes[p], 0) || 1

  return (
    <div className="rounded-md border border-mist bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
          {title ?? 'Was an das Modell ging'}
        </span>
        <span className="font-sans text-xs text-slate-400">{total.toLocaleString('de-CH')} Zeichen</span>
        <span className="ml-auto font-sans text-xs text-navy">{open ? 'zuklappen' : 'ansehen'}</span>
      </button>

      {/* Der Balken auch im zugeklappten Zustand: er ist die Aussage. */}
      <div className="flex h-1.5 overflow-hidden px-3 pb-2">
        <div className="flex h-1.5 w-full overflow-hidden rounded">
          {ORDER.map((part) =>
            prompt.sizes[part] > 0 ? (
              <div
                key={part}
                className={META[part].bar}
                style={{ width: `${(prompt.sizes[part] / total) * 100}%` }}
                title={`${META[part].label}: ${prompt.sizes[part]} Zeichen`}
              />
            ) : null,
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-mist px-3 py-3" style={{ borderTopStyle: 'solid' }}>
          <p className="font-sans text-xs text-slate-600">
            Deine Anfrage macht {Math.max(1, Math.round((prompt.sizes.request / total) * 100))} % des
            Ganzen aus. Alles andere ist Gerüst — und der Werkzeugkasten, der mit jedem Werkzeug
            wächst, das du anlegst.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRaw((v) => !v)}
              className="font-sans text-xs text-navy hover:underline"
            >
              {raw ? 'nach Teilen anzeigen' : 'als eine Nachricht anzeigen'}
            </button>
            <span className="font-sans text-xs text-slate-400">
              {raw ? 'genau der Text, der gesendet wurde' : 'dieselben Zeichen, nur beschriftet'}
            </span>
          </div>

          {raw ? (
            <>
              <Block label="Systemanweisung" cls={META.system.cls} text={prompt.system} />
              <Block label="Nachricht" cls="border-mist bg-cream/60" text={prompt.user} />
              <Block label="Antwortformat" cls={META.outputSchema.cls} text={prompt.outputSchema} />
            </>
          ) : (
            ORDER.map((part) =>
              prompt.sizes[part] > 0 ? (
                <div key={part}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-sans text-xs font-semibold text-slate-700">
                      {META[part].label}
                    </span>
                    <span className="font-sans text-xs text-slate-400">
                      {prompt.sizes[part]} Zeichen · {Math.round((prompt.sizes[part] / total) * 100)} %
                    </span>
                  </div>
                  <p className="mb-1 font-sans text-xs text-slate-500">{META[part].note}</p>
                  <Block cls={META[part].cls} text={prompt[part]} />
                </div>
              ) : null,
            )
          )}
        </div>
      )}
    </div>
  )
}

function Block({ label, cls, text }: { label?: string; cls: string; text: string }) {
  return (
    <div>
      {label && (
        <div className="mb-1 font-sans text-xs font-semibold text-slate-700">{label}</div>
      )}
      <pre
        className={`max-h-64 overflow-auto whitespace-pre-wrap rounded border px-2 py-1.5 font-mono text-[0.7rem] leading-relaxed text-slate-800 ${cls}`}
        style={{ borderStyle: 'solid' }}
      >
        {text}
      </pre>
    </div>
  )
}
