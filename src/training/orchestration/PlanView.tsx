// Der Plan, nach Stufen gruppiert.
//
// Die Stufen sind der Punkt. Eine nummerierte Liste sieht immer nach "eins nach
// dem anderen" aus; erst wenn zwei Schritte nebeneinander stehen, wird sichtbar,
// dass die Reihenfolge aus Abhängigkeiten folgt und nicht aus der Nummerierung.
// Sie werden deshalb auch nicht vom Modell geliefert, sondern serverseitig aus
// dem Graphen gerechnet.

import type { Plan, PlanArgument, PlanStep } from './orchestrationApi'

const SOURCE_LABEL: Record<PlanArgument['source'], string> = {
  literal: 'fest',
  user: 'aus der Anfrage',
  step: 'aus Schritt',
  unknown: 'offen',
}

const SOURCE_CLS: Record<PlanArgument['source'], string> = {
  literal: 'bg-slate-100 text-slate-600',
  user: 'bg-sky-50 text-sky-800',
  step: 'bg-emerald-50 text-emerald-800',
  unknown: 'bg-amber-100 text-amber-900',
}

/**
 * `unchecked` bekommt bewusst kein Häkchen. Das Modell sagt, es habe die Regel
 * befolgt — nachgerechnet ist das nicht, und eine unbelegte Behauptung als
 * erfüllt darzustellen wäre genau der Fehler, den dieser Baustein vorführt.
 */
const VERDICT: Record<Plan['rules'][number]['verdict'], { icon: string; label: string; cls: string }> = {
  honoured: { icon: '✓', label: 'eingehalten (nachgerechnet)', cls: 'text-emerald-700' },
  violated: { icon: '✗', label: 'nicht eingehalten', cls: 'text-red-700' },
  not_applicable: { icon: '–', label: 'nicht anwendbar — Werkzeug kommt im Plan nicht vor', cls: 'text-slate-500' },
  unchecked: { icon: '·', label: 'nicht nachprüfbar — nur die Aussage des Modells', cls: 'text-slate-500' },
}

export default function PlanView({ plan }: { plan: Plan }) {
  const waves: PlanStep[][] = []
  for (const step of plan.steps) {
    ;(waves[step.wave] ??= []).push(step)
  }

  const missingFor = (n: number) => plan.missingRequired.find((m) => m.step === n)

  return (
    <div className="space-y-4">
      {plan.summary && (
        <p className="rounded-md border border-mist bg-white px-4 py-3 font-sans text-sm text-slate-700">
          {plan.summary}
        </p>
      )}

      {plan.steps.length > 0 && (
        <p className="font-sans text-xs text-slate-500">
          {plan.steps.length} {plan.steps.length === 1 ? 'Schritt' : 'Schritte'} in {plan.waves}{' '}
          {plan.waves === 1 ? 'Stufe' : 'Stufen'}
          {plan.waves < plan.steps.length && ' — Schritte derselben Stufe könnten gleichzeitig laufen.'}
        </p>
      )}

      {waves.map((steps, wave) => (
        <div key={wave}>
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded bg-navy px-2 py-0.5 font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-white">
              Stufe {wave + 1}
            </span>
            {steps.length > 1 && (
              <span className="font-sans text-xs text-slate-400">
                {steps.length} Schritte ohne Abhängigkeit voneinander
              </span>
            )}
          </div>

          <div className={`grid gap-2 ${steps.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {steps.map((step) => {
              const missing = missingFor(step.n)
              return (
                <div key={step.n} className="rounded-md border border-mist bg-white px-3 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 font-sans text-xs font-semibold text-slate-400">
                      {step.n}
                    </span>
                    <span className="min-w-0 flex-1 break-all font-mono text-sm text-navy">
                      {step.tool}
                    </span>
                  </div>
                  <p className="mt-0.5 font-sans text-sm text-slate-700">{step.purpose}</p>

                  {step.dependsOn.length > 0 && (
                    <p className="mt-1 font-sans text-xs text-slate-400">
                      braucht Schritt {step.dependsOn.join(', ')}
                    </p>
                  )}

                  {step.arguments.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {step.arguments.map((arg, i) => (
                        <li key={i} className="flex flex-wrap items-baseline gap-1.5">
                          <span
                            className={`font-mono text-xs ${
                              arg.undeclared ? 'text-amber-800 line-through' : 'text-slate-700'
                            }`}
                            title={arg.undeclared ? 'Dieser Parameter ist im Werkzeug nicht deklariert.' : undefined}
                          >
                            {arg.name}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold ${SOURCE_CLS[arg.source]}`}
                          >
                            {SOURCE_LABEL[arg.source]}
                            {arg.source === 'step' && arg.fromStep ? ` ${arg.fromStep}` : ''}
                          </span>
                          {arg.value && (
                            <span className="min-w-0 break-all font-sans text-xs text-slate-500">
                              {arg.value}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {missing && (
                    <p className="mt-2 rounded bg-amber-50 px-2 py-1 font-sans text-xs text-amber-900">
                      Pflichtparameter ohne Wert: {missing.params.join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {plan.rules.length > 0 && (
        <div className="rounded-md border border-mist bg-white px-3 py-2.5">
          <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            Vorgaben
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {plan.rules.map((rule, i) => {
              const mark = VERDICT[rule.verdict]
              return (
                <li key={i} className="flex items-start gap-2">
                  <span className={`shrink-0 pt-0.5 text-xs ${mark.cls}`} aria-hidden>
                    {mark.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-sans text-sm text-slate-700">{rule.rule}</span>
                    <span className="block font-sans text-xs text-slate-500">{rule.how}</span>
                    <span className={`block font-sans text-xs ${mark.cls}`}>
                      {mark.label}
                      {rule.before && rule.after ? ` — ${rule.before} vor ${rule.after}` : ''}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 font-sans text-xs text-slate-400">
            Geprüft wird gegen die Stufen, nicht gegen die Schrittnummern: zwei Schritte derselben
            Stufe laufen nebeneinander. Eine Reihenfolge entsteht nur über eine Abhängigkeit.
          </p>
        </div>
      )}

      {plan.rejected.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5" style={{ borderStyle: 'solid' }}>
          <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-red-900">
            Verworfen: erfundene Werkzeuge
          </p>
          <ul className="mt-1 space-y-1">
            {plan.rejected.map((r, i) => (
              <li key={i} className="font-sans text-xs text-red-900">
                <span className="font-mono">{r.tool}</span>
                {r.purpose ? ` — ${r.purpose}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 font-sans text-xs text-red-900">
            Das Modell hat Schritte mit Werkzeugen geplant, die es nicht gibt. Sie stehen hier, statt
            im Plan mitzulaufen — ein Plan mit erfundenem Werkzeug sieht sonst genauso überzeugend
            aus wie ein gültiger.
          </p>
        </div>
      )}

      {plan.gaps.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5" style={{ borderStyle: 'solid' }}>
          <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-amber-900">
            Wofür der Werkzeugkasten nichts hergibt
          </p>
          <ul className="mt-1 space-y-1">
            {plan.gaps.map((g, i) => (
              <li key={i} className="font-sans text-xs text-amber-900">
                <span className="font-semibold">{g.need}</span> — {g.why}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.assumptions.length > 0 && (
        <div className="rounded-md border border-mist bg-white px-3 py-2.5">
          <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            Annahmen
          </p>
          <ul className="mt-1 list-inside list-disc">
            {plan.assumptions.map((a, i) => (
              <li key={i} className="font-sans text-xs text-slate-600">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-sans text-xs text-slate-400">
        Geplant, nicht ausgeführt — die Werkzeuge sind Beschreibungen, hinter denen nichts liegt.
        Modell: {plan.model}
      </p>
    </div>
  )
}
