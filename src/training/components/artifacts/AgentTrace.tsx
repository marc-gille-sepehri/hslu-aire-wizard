// Client-agent simulator.
//
// Three things this block makes visible, in the spec's order of teaching weight:
// where the context edge is, that approval under time pressure does not work,
// and that a document can act as an instruction. The file manipulation is not
// the lesson — learners grasp that immediately.
//
// Everything the agent looks at executes for real. Everything it would do to
// the world is recorded and shown as a draft stamped "nicht gesendet"; there is
// no code path on the server that could perform it.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgentTraceArtifact } from '../../schema/types'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import {
  decideIntent,
  deleteEverything,
  haltRun,
  loadScenario,
  removeAgent,
  saveAgent,
  startRun,
  type AgentDef,
  type Run,
  type RunStep,
} from '../../agent/agentApi'
import { useAgentWorkspace } from '../../agent/useAgentWorkspace'
import SourcePane, { focusFromInfluence, type Focus } from '../../agent/SourcePane'
import IntentCard from '../../agent/IntentCard'
import AgentForm from '../../agent/AgentForm'
import ExpandableBlock from '../ExpandableBlock'

/** Sehen, überlegen, würde tun. A non-technical learner needs no other model. */
const VERB_ICON: Record<RunStep['verb'], string> = {
  see: '👁',
  think: '🧠',
  would_do: '✋',
}

type Tab = 'knows' | 'whence'

export default function AgentTrace({ artifact }: { artifact: AgentTraceArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()
  const { state, run, loading, error, refresh } = useAgentWorkspace()

  const [focus, setFocus] = useState<Focus | null>(null)
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('knows')
  const [technical, setTechnical] = useState(Boolean(artifact.showTechnical))
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<AgentDef | null | 'new'>(null)
  const [agentId, setAgentId] = useState<string>('')

  const workspace = state?.workspace
  const agents = workspace?.agents ?? []
  const running = Boolean(run && !run.endedAt)
  const completedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!agentId && agents.length) setAgentId(agents[0].agentId)
  }, [agents, agentId])

  // Completion follows a finished run, not a click: the block is about having
  // watched one happen.
  useEffect(() => {
    if (!run || !run.endedAt || completedRef.current === run.runId) return
    completedRef.current = run.runId
    record(artifact.id, {
      type: 'agenttrace',
      runId: run.runId,
      steps: run.steps.length,
      intents: run.intents.length,
      approved: run.intents.filter((i) => i.approved === true).length,
      stoppedBy: run.stoppedBy,
    })
    if (artifact.tracked !== false) markComplete(artifact.id)
  }, [run?.runId, run?.endedAt])

  const readPaths = useMemo(() => {
    const paths = new Set<string>()
    for (const step of run?.steps ?? []) {
      if (typeof step.args?.path === 'string') paths.add(step.args.path)
      if (typeof step.args?.id === 'string' && step.tool?.includes('read_mail')) {
        paths.add(`posteingang/${step.args.id}`)
      }
    }
    return paths
  }, [run?.steps])

  const guard = async (fn: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setNotice(null)
    try {
      await fn()
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Das hat nicht geklappt.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
        <p className="font-sans text-sm text-slate-500">Arbeitsbereich wird geladen …</p>
      </div>
    )
  }

  if (!state || !workspace) {
    return (
      <div className="space-y-4">
        {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
        <p className="font-sans text-sm text-red-700">
          {error ?? 'Der Arbeitsbereich ist nicht erreichbar.'}
        </p>
      </div>
    )
  }

  const selected = run?.steps.find((s) => s.n === selectedStep) ?? null
  const wantsScenario =
    artifact.scenarioId && artifact.scenarioId !== workspace.scenarioId
      ? state.scenarios.find((s) => s.scenarioId === artifact.scenarioId)
      : undefined

  return (
    <ExpandableBlock label={artifact.title || 'Agent bei der Arbeit'}>
    <div className="space-y-4">
      {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
      {artifact.instructions && (
        <p className="max-w-prose font-sans text-sm text-slate-600">{artifact.instructions}</p>
      )}

      {wantsScenario && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="min-w-0 flex-1 font-sans text-sm text-amber-900">
            Dieser Abschnitt arbeitet mit dem Szenario „{wantsScenario.title}". Das Laden ersetzt die
            Dateien und den Posteingang im Arbeitsbereich; deine bisherigen Läufe bleiben erhalten.
          </p>
          <button
            type="button"
            disabled={busy || running}
            onClick={() =>
              guard(async () => {
                await loadScenario(wantsScenario.scenarioId)
                await refresh()
                setFocus(null)
              })
            }
            className="shrink-0 rounded-md border-2 border-navy px-3 py-1 font-sans text-sm font-semibold text-navy hover:bg-navy hover:text-white disabled:border-mist disabled:text-slate-400"
          >
            Szenario laden
          </button>
        </div>
      )}

      {/* ---- controls -------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-mist bg-white px-4 py-3">
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
        >
          {agents.map((a) => (
            <option key={a.agentId} value={a.agentId}>
              {a.name}
              {a.enabled ? '' : ' (aus)'}
            </option>
          ))}
        </select>

        {/*
          Deliberately NOT disabled while a run is in flight. A second event
          arriving mid-run is something the learner is meant to be able to
          cause and then watch wait in the queue — a greyed-out button would
          hide exactly the behaviour the block is there to show.
        */}
        <button
          type="button"
          disabled={busy || !agentId}
          onClick={() =>
            guard(async () => {
              const outcome = await startRun(agentId)
              if (outcome.queued) {
                setNotice(
                  'Es läuft bereits ein Lauf. Dein Auslöser wartet — er startet, sobald der erste fertig ist.',
                )
              }
            })
          }
          className="rounded-md border-2 border-navy bg-navy px-3 py-1.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-white hover:text-navy disabled:border-mist disabled:bg-mist disabled:text-slate-400"
        >
          {running ? 'Noch einen auslösen' : 'Lauf starten'}
        </button>

        <button
          type="button"
          onClick={() => setEditing(agents.find((a) => a.agentId === agentId) ?? null)}
          disabled={!agentId}
          className="rounded-md border border-slate-300 px-3 py-1.5 font-sans text-sm text-slate-700 hover:bg-cream disabled:text-slate-300"
        >
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="font-sans text-sm text-navy hover:underline"
        >
          + Agent
        </button>

        <span className="ml-auto font-sans text-xs text-slate-400">
          {workspace.budget.runsThisHour}/{workspace.budget.runsPerHourLimit} Läufe diese Stunde
        </span>
      </div>

      {notice && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 font-sans text-sm text-amber-900">
          {notice}
        </p>
      )}
      {error && <p className="font-sans text-xs text-slate-400">{error}</p>}

      {/* ---- three columns --------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            Ordner und Post
          </div>
          <SourcePane
            scenario={state.scenario}
            focus={focus}
            onFocus={setFocus}
            readPaths={readPaths}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
              Lauf
            </span>
            {running && (
              <span className="font-sans text-xs text-navy">
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-navy align-middle" />
                läuft
              </span>
            )}
            {run?.endedAt && (
              <span className="font-sans text-xs text-slate-400">
                {run.stoppedBy === 'completed' ? 'abgeschlossen' : run.stoppedBy}
              </span>
            )}
          </div>

          <TraceView
            run={run}
            selectedStep={selectedStep}
            technical={technical}
            onSelect={(step) => {
              setSelectedStep(step.n)
              setTab('whence')
              const first = step.influencedBy?.[0]
              if (first) setFocus(focusFromInfluence(first))
            }}
          />

          {run?.stopMessage && (
            <p className="rounded-md border border-mist bg-cream px-3 py-2 font-sans text-sm text-slate-700">
              {run.stopMessage}
            </p>
          )}

          {/* two tabs for the non-technical learner (§5.4) */}
          <div className="rounded-md border border-mist bg-white">
            <div className="flex border-b border-mist">
              {(
                [
                  ['knows', 'Was ich gerade weiss'],
                  ['whence', 'Woher kommt das?'],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`px-3 py-2 font-sans text-xs font-semibold transition-colors ${
                    tab === key
                      ? 'border-b-2 border-navy text-navy'
                      : 'text-slate-500 hover:text-navy'
                  }`}
                  style={{ borderBottomStyle: 'solid' }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTechnical((v) => !v)}
                className="ml-auto px-3 py-2 font-sans text-xs text-slate-400 hover:text-navy"
              >
                {technical ? 'technische Ansicht aus' : 'technische Ansicht'}
              </button>
            </div>

            <div className="px-3 py-3">
              {tab === 'knows' ? (
                <KnowsTab run={run} agents={agents} state={state} readPaths={readPaths} />
              ) : (
                <WhenceTab step={selected} onOpen={(f) => setFocus(f)} />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            Absichten
          </div>

          {run?.intents.length ? (
            run.intents.map((intent) => (
              <IntentCard
                key={intent.intentId}
                intent={intent}
                decidable={!intent.unattended && Boolean(run && !run.endedAt)}
                busy={busy}
                onDecide={(approved, reason) =>
                  guard(() => decideIntent(run.runId, intent.intentId, approved, reason))
                }
                onShowStep={() => {
                  setSelectedStep(intent.atStep)
                  setTab('whence')
                }}
              />
            ))
          ) : (
            <p className="rounded-md border border-mist bg-white px-3 py-3 font-sans text-sm text-slate-400">
              Noch nichts, was der Agent tun würde.
            </p>
          )}

          {workspace.queue.length > 0 && (
            <div className="rounded-md border border-mist bg-white px-3 py-2">
              <div className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
                Wartet ({workspace.queue.length})
              </div>
              <ul className="mt-1 space-y-1">
                {workspace.queue.map((q) => (
                  <li key={q.eventId} className="font-sans text-xs text-slate-600">
                    {q.trigger.detail}
                    <span className="text-slate-400">
                      {' '}
                      · {new Date(q.queuedAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            disabled={busy || !running}
            onClick={() => guard(haltRun)}
            className="w-full rounded-md border-2 border-red-700 px-3 py-2 font-sans text-sm font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white disabled:border-mist disabled:text-slate-300 disabled:hover:bg-transparent disabled:hover:text-slate-300"
          >
            Not-Aus
          </button>

          <button
            type="button"
            disabled={busy || running}
            onClick={() => {
              if (!window.confirm('Alle Inhalte und die gesamte Laufhistorie dieses Arbeitsbereichs löschen?')) return
              void guard(async () => {
                await deleteEverything()
                await refresh()
                setFocus(null)
                setSelectedStep(null)
              })
            }}
            className="w-full font-sans text-xs text-slate-400 hover:text-red-700 disabled:hover:text-slate-400"
          >
            Arbeitsbereich löschen
          </button>
        </div>
      </div>

      {editing !== null && (
        <AgentForm
          agent={editing === 'new' ? null : editing}
          state={state}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={(agent) =>
            guard(async () => {
              const { agent: saved } = await saveAgent(agent)
              await refresh()
              setAgentId(saved.agentId)
              setEditing(null)
            })
          }
          onDelete={
            editing === 'new'
              ? undefined
              : () =>
                  guard(async () => {
                    await removeAgent((editing as AgentDef).agentId)
                    await refresh()
                    setAgentId('')
                    setEditing(null)
                  })
          }
        />
      )}
    </div>
    </ExpandableBlock>
  )
}

// ---------------------------------------------------------------------------

function TraceView({
  run,
  selectedStep,
  technical,
  onSelect,
}: {
  run: Run | null
  selectedStep: number | null
  technical: boolean
  onSelect: (step: RunStep) => void
}) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior })
  }, [run?.steps.length])

  if (!run) {
    return (
      <div className="rounded-md border border-mist bg-white px-4 py-6">
        <p className="font-sans text-sm text-slate-400">
          Noch kein Lauf. Wähle einen Agenten und starte ihn.
        </p>
      </div>
    )
  }

  return (
    <div className="max-h-[26rem] overflow-auto rounded-md border border-mist bg-white">
      <ul className="divide-y divide-mist">
        {run.steps.map((step) => (
          <li key={step.n}>
            <button
              type="button"
              onClick={() => onSelect(step)}
              className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cream ${
                selectedStep === step.n ? 'bg-cream' : ''
              }`}
            >
              <span className="shrink-0 pt-0.5 text-base leading-none">{VERB_ICON[step.verb]}</span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block whitespace-pre-wrap font-sans text-sm ${
                    step.verb === 'would_do' ? 'font-semibold text-navy' : 'text-slate-700'
                  }`}
                >
                  {step.say}
                </span>

                {step.influencedBy?.length ? (
                  <span className="mt-0.5 block font-sans text-xs text-slate-400">
                    stützt sich auf {step.influencedBy[0].path}
                    {step.influencedBy[0].verified ? '' : ' (Stelle nicht überprüfbar)'}
                  </span>
                ) : null}

                {technical && (
                  <span className="mt-1 block rounded bg-slate-50 px-2 py-1 font-mono text-[0.7rem] leading-snug text-slate-600">
                    {step.tool ?? 'model'}
                    {step.stopReason ? ` · stop_reason=${step.stopReason}` : ''} · {step.ms} ms
                    {step.args && Object.keys(step.args).length > 0 && (
                      <span className="block break-all">{JSON.stringify(step.args)}</span>
                    )}
                    {step.resultDigest && <span className="block">→ {step.resultDigest}</span>}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {technical && run.endedAt && (
        <div className="border-t border-mist px-4 py-2 font-mono text-[0.7rem] text-slate-500">
          {run.tokens.in} in / {run.tokens.out} out · stoppedBy={run.stoppedBy}
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}

/**
 * "Was ich gerade weiss" — the context in plain text. For many learners this is
 * the first time "context" is something they can look at.
 */
function KnowsTab({
  run,
  agents,
  state,
  readPaths,
}: {
  run: Run | null
  agents: AgentDef[]
  state: ReturnType<typeof useAgentWorkspace>['state']
  readPaths: Set<string>
}) {
  const agent = agents.find((a) => a.agentId === run?.agentId) ?? agents[0]
  if (!agent || !state) return <p className="font-sans text-sm text-slate-400">—</p>

  const catalogue = [...state.tools.read, ...state.tools.record]

  return (
    <dl className="space-y-3 font-sans text-sm">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Auftrag</dt>
        <dd className="whitespace-pre-wrap text-slate-700">{state.scenario?.brief ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Anweisung an den Agenten
        </dt>
        <dd className="whitespace-pre-wrap text-slate-700">{agent.instruction}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Gelesen in diesem Lauf
        </dt>
        <dd className="text-slate-700">
          {readPaths.size ? (
            <ul className="list-inside list-disc">
              {[...readPaths].map((p) => (
                <li key={p} className="font-mono text-xs">
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-slate-400">noch nichts</span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Werkzeuge, die zur Verfügung stehen
        </dt>
        <dd className="text-slate-700">
          <ul className="list-inside list-disc">
            {agent.tools.map((name) => {
              const tool = catalogue.find((t) => t.name === name)
              return (
                <li key={name} className="font-mono text-xs">
                  {tool?.display ?? name}
                  <span className="ml-1 font-sans text-slate-400">
                    {tool?.side === 'record' ? '(würde tun)' : '(sehen)'}
                  </span>
                </li>
              )
            })}
          </ul>
        </dd>
      </div>
    </dl>
  )
}

/** "Woher kommt das?" — the traceability, and the only way to make an injection experienceable. */
function WhenceTab({ step, onOpen }: { step: RunStep | null; onOpen: (focus: Focus) => void }) {
  if (!step) {
    return (
      <p className="font-sans text-sm text-slate-400">
        Klick auf einen Schritt im Lauf. Wenn der Agent sich auf eine Stelle in einem Dokument
        gestützt hat, wird sie links markiert.
      </p>
    )
  }

  if (!step.influencedBy?.length) {
    return (
      <p className="font-sans text-sm text-slate-500">
        Für Schritt {step.n} hat der Agent keine Quelle genannt.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {step.influencedBy.map((influence, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => onOpen(focusFromInfluence(influence))}
            className="w-full rounded border border-mist px-2 py-1.5 text-left transition-colors hover:bg-cream"
            style={{ borderStyle: 'solid' }}
          >
            <span className="block font-mono text-xs text-navy">{influence.path}</span>
            {influence.verified ? (
              <span className="mt-0.5 block font-sans text-xs italic text-slate-600">
                „{influence.quote}"
              </span>
            ) : (
              <span className="mt-0.5 block font-sans text-xs text-amber-800">
                Der Agent hat dieses Dokument genannt, die genaue Stelle liess sich nicht
                überprüfen — deshalb wird sie nicht markiert.
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
