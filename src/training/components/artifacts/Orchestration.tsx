// Agentische Orchestrierung.
//
// Links der Werkzeugkasten, rechts Anfrage und Plan. Was hier sichtbar wird, ist
// die Stufe vor der Ausführung: aus einer Anfrage und einer Liste von
// Beschreibungen wird ein Ablauf — mit Reihenfolge, Abhängigkeiten und der
// Frage, woher jedes Argument kommt.
//
// Der Werkzeugkasten gehört der Person und ist in jedem Modul derselbe. Der
// Block führt nichts aus; hinter den Werkzeugen liegt nichts als ihre
// Beschreibung, und genau das macht den Unterschied zwischen Planung und
// Ausführung erfahrbar.

import { useEffect, useRef, useState } from 'react'
import type { OrchestrationArtifact } from '../../schema/types'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import {
  fetchToolbox,
  requestPlan,
  resetToolbox,
  saveToolbox,
  type Limits,
  type Plan,
  type ToolSpec,
} from '../../orchestration/orchestrationApi'
import ToolboxEditor from '../../orchestration/ToolboxEditor'
import PlanView from '../../orchestration/PlanView'

const DEFAULT_LIMITS: Limits = { maxTools: 20, maxParams: 10, maxPromptChars: 2000 }

export default function Orchestration({ artifact }: { artifact: OrchestrationArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()

  const [tools, setTools] = useState<ToolSpec[] | null>(null)
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS)
  const [dirty, setDirty] = useState(false)
  const [request, setRequest] = useState(artifact.defaultRequest ?? '')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [busy, setBusy] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const planned = useRef(false)

  useEffect(() => {
    fetchToolbox()
      .then((box) => {
        setTools(box.tools)
        if (box.limits) setLimits(box.limits)
      })
      .catch((e) => setError((e as Error).message))
  }, [])

  const guard = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const persist = () =>
    guard(async () => {
      const box = await saveToolbox(tools ?? [])
      setTools(box.tools)
      setDirty(false)
    })

  const makePlan = async () => {
    setPlanning(true)
    setError(null)
    try {
      // Geplant wird gegen den gespeicherten Kasten. Ungespeicherte Änderungen
      // erst sichern, sonst plant das Widget gegen etwas, das der Server nicht
      // kennt — und der Lernende sucht den Fehler im Modell.
      if (dirty) {
        const box = await saveToolbox(tools ?? [])
        setTools(box.tools)
        setDirty(false)
      }
      const { plan: result } = await requestPlan(request)
      setPlan(result)
      if (!planned.current) {
        planned.current = true
        record(artifact.id, {
          type: 'orchestration',
          tools: (tools ?? []).length,
          steps: result.steps.length,
          waves: result.waves,
          rejected: result.rejected.length,
          gaps: result.gaps.length,
        })
        if (artifact.tracked !== false) markComplete(artifact.id)
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setPlanning(false)
    }
  }

  const tooLong = request.length > limits.maxPromptChars

  return (
    <div className="space-y-4">
      {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
      {artifact.instructions && (
        <p className="max-w-prose font-sans text-sm text-slate-600">{artifact.instructions}</p>
      )}

      {error && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 font-sans text-sm text-amber-900" style={{ borderStyle: 'solid' }}>
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* ---- Werkzeugkasten ---- */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
              Werkzeuge
            </span>
            <span className="font-sans text-xs text-slate-400">
              {(tools ?? []).length} / {limits.maxTools}
            </span>
          </div>

          {tools === null ? (
            <p className="font-sans text-sm text-slate-400">Werkzeugkasten wird geladen …</p>
          ) : (
            <ToolboxEditor
              tools={tools}
              limits={limits}
              busy={busy}
              onChange={(next) => {
                setTools(next)
                setDirty(true)
              }}
            />
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              disabled={busy || !dirty}
              onClick={persist}
              className="rounded-md border-2 border-navy px-3 py-1.5 font-sans text-sm font-semibold text-navy transition-colors hover:bg-navy hover:text-white disabled:border-mist disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-300"
            >
              {dirty ? 'Werkzeuge sichern' : 'gesichert'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Werkzeugkasten auf den Startsatz zurücksetzen? Deine eigenen Werkzeuge gehen dabei verloren.')) return
                void guard(async () => {
                  const box = await resetToolbox()
                  setTools(box.tools)
                  setDirty(false)
                })
              }}
              className="font-sans text-xs text-slate-400 hover:text-red-700"
            >
              zurücksetzen
            </button>
            {dirty && (
              <span className="font-sans text-xs text-amber-800">
                ungesicherte Änderungen — werden beim Planen automatisch gesichert
              </span>
            )}
          </div>
        </div>

        {/* ---- Anfrage und Plan ---- */}
        <div className="space-y-3">
          <span className="block font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            Anfrage
          </span>
          <textarea
            rows={3}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Was soll erledigt werden? Formuliere es so, wie du es einer Person sagen würdest."
            className="w-full rounded-md border border-slate-300 px-3 py-2 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={planning || busy || !request.trim() || tooLong || !(tools ?? []).length}
              onClick={makePlan}
              className="rounded-md border-2 border-navy bg-navy px-4 py-1.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-white hover:text-navy disabled:border-mist disabled:bg-mist disabled:text-slate-400"
            >
              {planning ? 'Plant …' : 'Ablauf planen'}
            </button>
            <span className={`font-sans text-xs ${tooLong ? 'text-red-700' : 'text-slate-400'}`}>
              {request.length} / {limits.maxPromptChars}
            </span>
            {!(tools ?? []).length && tools !== null && (
              <span className="font-sans text-xs text-slate-400">Lege zuerst ein Werkzeug an.</span>
            )}
          </div>

          {plan ? (
            <PlanView plan={plan} />
          ) : (
            <p className="rounded-md border border-mist bg-white px-4 py-6 font-sans text-sm text-slate-400">
              Noch kein Plan. Der Server schickt deine Werkzeuge samt Parameterbeschreibungen
              zusammen mit der Anfrage an das Modell und lässt einen Ablauf entwerfen.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
