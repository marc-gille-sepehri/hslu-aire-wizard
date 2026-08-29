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
  previewPrompt,
  requestPlan,
  resetToolbox,
  saveToolbox,
  type Limits,
  type Plan,
  type PromptParts,
  type ToolSpec,
} from '../../orchestration/orchestrationApi'
import ToolboxEditor from '../../orchestration/ToolboxEditor'
import PlanView from '../../orchestration/PlanView'
import PromptView from '../../orchestration/PromptView'
import ExpandableBlock from '../ExpandableBlock'

const DEFAULT_LIMITS: Limits = {
  maxTools: 20,
  maxParams: 10,
  maxPromptChars: 2000,
  maxGuidanceChars: 2000,
}

export default function Orchestration({ artifact }: { artifact: OrchestrationArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()

  const [tools, setTools] = useState<ToolSpec[] | null>(null)
  const [guidance, setGuidance] = useState('')
  const [limits, setLimits] = useState<Limits>(DEFAULT_LIMITS)
  const [dirty, setDirty] = useState(false)
  const [request, setRequest] = useState(artifact.defaultRequest ?? '')
  const [plan, setPlan] = useState<Plan | null>(null)
  /** Vorschau des Prompts, solange noch kein Plan da ist. */
  const [preview, setPreview] = useState<PromptParts | null>(null)
  const [busy, setBusy] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const planned = useRef(false)

  useEffect(() => {
    fetchToolbox()
      .then((box) => {
        setTools(box.tools)
        setGuidance(box.guidance ?? '')
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
      const box = await saveToolbox(tools ?? [], guidance)
      setTools(box.tools)
      setGuidance(box.guidance ?? '')
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
        const box = await saveToolbox(tools ?? [], guidance)
        setTools(box.tools)
        setGuidance(box.guidance ?? '')
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
    <ExpandableBlock label={artifact.title || 'Agentische Orchestrierung'}>
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

          {/*
            Vorgaben: das arme-Leute-Skill. Kein eigenes Format, nur Text, der
            vor die Anfrage in den Prompt wandert und für jede Anfrage gilt.
            Reihenfolgeregeln darin rechnet der Server hinterher gegen den Plan
            nach — sonst behauptet das Modell die Einhaltung und niemand prüft.
          */}
          <div className="pt-2">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
                Vorgaben
              </span>
              <span className="font-sans text-xs text-slate-400">
                {guidance.length} / {limits.maxGuidanceChars}
              </span>
            </div>
            <textarea
              rows={3}
              value={guidance}
              maxLength={limits.maxGuidanceChars}
              onChange={(e) => {
                setGuidance(e.target.value)
                setDirty(true)
              }}
              placeholder={'Eine Regel pro Zeile, z. B.\nPrüfe den Referenzzinssatz, bevor du eine Mitteilung entwirfst.'}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
            />
            <p className="mt-1 font-sans text-xs text-slate-500">
              Gilt für jede Anfrage. Regeln zur Reihenfolge prüft der Server anschliessend gegen den
              Plan nach und zeigt unter dem Plan, ob sie eingehalten wurden.
            </p>
          </div>

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
                  setGuidance(box.guidance ?? '')
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

          {/*
            Der Prompt steht ÜBER dem Plan, nicht darunter: er ist die Ursache,
            und ein Plan, der aus dem Nichts erscheint, sieht nach Magie aus.
          */}
          {(plan?.prompt ?? preview) && (
            <PromptView
              prompt={(plan?.prompt ?? preview)!}
              title={plan ? 'Was an das Modell ging' : 'Was an das Modell gehen würde'}
            />
          )}

          {plan ? (
            <PlanView plan={plan} />
          ) : (
            <div className="rounded-md border border-mist bg-white px-4 py-6">
              <p className="font-sans text-sm text-slate-400">
                Noch kein Plan. Der Server schickt deine Werkzeuge samt Parameterbeschreibungen
                zusammen mit der Anfrage an das Modell und lässt einen Ablauf entwerfen.
              </p>
              <button
                type="button"
                disabled={busy || planning}
                onClick={() =>
                  guard(async () => {
                    const { prompt } = await previewPrompt(request)
                    setPreview(prompt)
                  })
                }
                className="mt-2 font-sans text-xs text-navy hover:underline disabled:text-slate-300"
              >
                Prompt vorab ansehen (ohne Modellaufruf)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </ExpandableBlock>
  )
}
