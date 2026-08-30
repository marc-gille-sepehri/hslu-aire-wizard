// Was tatsächlich an das Modell ging.
//
// Der Baustein zeigt sonst nur das Ergebnis, und ein Plan, der aus dem Nichts
// erscheint, sieht nach Magie aus. Der Prompt daneben ist die Entzauberung.
//
// Bewusst ohne Erklärtext zwischen den Blöcken: die Farben und die
// Grössenangaben sagen es, und wer die Blöcke liest, braucht keine Bildunterschrift.
// Der Balken rechnet aus den echten Grössen und behauptet nichts, was die
// Zahlen nicht hergeben.

import { useState } from 'react'
import type { PromptParts } from './orchestrationApi'

type Part = 'system' | 'toolbox' | 'guidance' | 'request' | 'outputSchema'

const META: Record<Part, { label: string; cls: string; bar: string }> = {
  system: { label: 'Systemanweisung', cls: 'border-slate-300 bg-slate-50', bar: 'bg-slate-400' },
  toolbox: { label: 'Werkzeugkasten', cls: 'border-sky-200 bg-sky-50', bar: 'bg-sky-400' },
  guidance: { label: 'Vorgaben', cls: 'border-emerald-200 bg-emerald-50', bar: 'bg-emerald-400' },
  request: { label: 'Anfrage', cls: 'border-amber-200 bg-amber-50', bar: 'bg-amber-400' },
  outputSchema: {
    label: 'Erzwungenes Antwortformat',
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
        <span className="font-sans text-xs text-slate-400">
          {total.toLocaleString('de-CH')} Zeichen
        </span>
        <span className="ml-auto font-sans text-xs text-navy">{open ? 'zuklappen' : 'ansehen'}</span>
      </button>

      {/* Der Balken bleibt auch zugeklappt sichtbar — er ist die Aussage. */}
      <div className="px-3 pb-2">
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
        <div className="space-y-2 border-t border-mist px-3 py-3" style={{ borderTopStyle: 'solid' }}>
          {raw ? (
            <>
              <Block label="Systemanweisung" cls={META.system.cls} text={prompt.system} />
              <Block label="Nachricht" cls="border-mist bg-cream/60" text={prompt.user} />
              <Block label="Antwortformat" cls={META.outputSchema.cls} text={prompt.outputSchema} />
            </>
          ) : (
            ORDER.map((part) =>
              prompt.sizes[part] > 0 ? (
                <Block
                  key={part}
                  label={META[part].label}
                  size={`${prompt.sizes[part]} · ${Math.round((prompt.sizes[part] / total) * 100)} %`}
                  cls={META[part].cls}
                  text={prompt[part]}
                />
              ) : null,
            )
          )}

          <button
            type="button"
            onClick={() => setRaw((v) => !v)}
            className="font-sans text-xs text-navy hover:underline"
          >
            {raw ? 'nach Teilen' : 'als eine Nachricht'}
          </button>
        </div>
      )}
    </div>
  )
}

function Block({
  label,
  size,
  cls,
  text,
}: {
  label: string
  size?: string
  cls: string
  text: string
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-baseline gap-2">
        <span className="font-sans text-xs font-semibold text-slate-700">{label}</span>
        {size && <span className="font-sans text-xs text-slate-400">{size}</span>}
      </div>
      <pre
        className={`max-h-64 overflow-auto whitespace-pre-wrap rounded border px-2 py-1.5 font-mono text-[0.7rem] leading-relaxed text-slate-800 ${cls}`}
        style={{ borderStyle: 'solid' }}
      >
        {text}
      </pre>
    </div>
  )
}
