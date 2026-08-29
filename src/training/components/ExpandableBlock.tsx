// Ein Baustein, der aus dem Lesekamin ausbrechen kann.
//
// Die Modulansicht ist auf `max-w-prose` gesetzt, und das ist für Fliesstext
// richtig. Für die beiden Werkzeugbausteine ist es zu eng: der Agenten-Simulator
// hat drei Spalten, die Orchestrierung stellt Pläne nebeneinander.
//
// Die eine Regel, die dieses Modul trägt: der Inhalt wird IMMER an derselben
// Stelle im Baum gerendert, es ändert sich nur die Klasse des Rahmens. Würde
// zwischen zwei Zweigen umgeschaltet — oder in ein Portal —, montiert React neu
// und der laufende Agentenlauf bzw. der erstellte Plan wäre weg. Genau das
// erwartet niemand von einem Knopf, der "breiter" verspricht.

import { useEffect, useRef, useState, type ReactNode } from 'react'

export default function ExpandableBlock({
  label,
  children,
}: {
  /** Kurzer Name für die Kopfzeile im ausgeklappten Zustand. */
  label: string
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)
  // Höhe, die der Baustein im Fluss hatte. Ohne Platzhalter fällt die Seite
  // hinter dem Overlay zusammen und man landet beim Schliessen woanders.
  const [placeholder, setPlaceholder] = useState<number | null>(null)

  const open = () => {
    setPlaceholder(frameRef.current?.offsetHeight ?? null)
    setExpanded(true)
  }

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [expanded])

  return (
    <>
      {expanded && placeholder !== null && <div style={{ height: placeholder }} aria-hidden />}

      <div
        ref={frameRef}
        className={
          expanded
            ? 'fixed inset-0 z-50 flex flex-col overflow-hidden bg-cream'
            : 'relative'
        }
      >
        {expanded ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-mist bg-white px-4 py-2.5" style={{ borderBottomStyle: 'solid' }}>
            <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-navy">
              {label}
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="shrink-0 rounded-md border border-slate-300 px-3 py-1 font-sans text-xs font-semibold text-slate-700 transition-colors hover:bg-cream"
              style={{ borderStyle: 'solid' }}
            >
              Schliessen (Esc)
            </button>
          </div>
        ) : (
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              onClick={open}
              title="Baustein auf die volle Fensterbreite ausklappen"
              className="flex items-center gap-1.5 rounded-md border border-mist px-2 py-1 font-sans text-xs text-slate-500 transition-colors hover:border-navy hover:text-navy"
              style={{ borderStyle: 'solid' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
              Breit
            </button>
          </div>
        )}

        {/* Immer dieselbe Position im Baum — nur der Rahmen aussen wechselt. */}
        <div className={expanded ? 'min-h-0 flex-1 overflow-auto px-4 py-4' : ''}>
          <div className={expanded ? 'mx-auto max-w-[1600px]' : ''}>{children}</div>
        </div>
      </div>
    </>
  )
}
