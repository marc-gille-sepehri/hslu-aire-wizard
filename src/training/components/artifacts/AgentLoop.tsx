import { useCallback, useEffect, useMemo, useState } from 'react'
import ExpandableBlock from '../ExpandableBlock'
import {
  LoopApiError,
  fetchConfig,
  fetchRawTurn,
  startRun,
  stepRun,
  type LoopConfig,
  type LoopRun,
  type RawTurn,
  type ToolCall,
  type TurnSummary,
} from '../../loop/loopApi'
import type { AgentLoopArtifact } from '../../schema/types'
import { labels } from '../../labels'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'

// Die Agent-Schleife, Schritt für Schritt.
//
// Zwei Ansichten auf dieselbe Aufzeichnung, umschaltbar:
//
//   Ablaufsicht     ein Durchlauf im Fokus — Reasoning, Werkzeugaufruf,
//                   Ergebnis — plus die Stelle im Kreis, an der man steht.
//   Protokollsicht  das vollständige `messages[]`, so wie es beim nächsten
//                   Aufruf tatsächlich rausgeht.
//
// Nebeneinander hätte die Ablaufsicht keinen Platz für Details, und das Array
// wäre nach vier Durchläufen eine Tapete. Nacheinander liest man es dann, wenn
// man es wissen will.
//
// Was hier bewusst NICHT passiert: der Client zählt keine Schleife. Ein Klick
// ist ein Request, und der Server macht genau einen Modellaufruf. Eine
// `while`-Schleife im Browser wäre dieselbe Lüge wie eine Fortschrittsanzeige,
// die vor dem Ergebnis fertig ist.

const t = labels.agentLoop

type Ansicht = 'ablauf' | 'protokoll'

export default function AgentLoop({ artifact }: { artifact: AgentLoopArtifact }) {
  return (
    <ExpandableBlock label={artifact.title || t.blockLabel}>
      <div className="space-y-4">
        {artifact.title && <h3 className="font-display text-lg font-bold text-navy">{artifact.title}</h3>}
        {artifact.instructions && (
          <p className="max-w-prose font-sans text-sm text-slate-600">{artifact.instructions}</p>
        )}
        <Widget artifact={artifact} />
      </div>
    </ExpandableBlock>
  )
}

function Widget({ artifact }: { artifact: AgentLoopArtifact }) {
  const [config, setConfig] = useState<LoopConfig | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [document, setDocument] = useState(artifact.document ?? '')
  const [task, setTask] = useState(artifact.defaultTask ?? '')
  const [model, setModel] = useState('')
  const [run, setRun] = useState<LoopRun | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ansicht, setAnsicht] = useState<Ansicht>('ablauf')
  const [fokus, setFokus] = useState<number | null>(null)
  const record = useRecordInteraction()
  const { markComplete } = useLearner()

  const load = useCallback(() => {
    setConfigError(null)
    fetchConfig()
      .then((c) => {
        setConfig(c)
        setModel((m) => m || c.defaultModel)
        setDocument((d) => d || artifact.document || c.beispiel)
      })
      .catch((e) => setConfigError(e instanceof Error ? e.message : t.loadError))
  }, [artifact.document])

  useEffect(load, [load])

  const start = async () => {
    if (!config || busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await startRun({ document, task, model })
      setRun(created)
      setFokus(null)
      setAnsicht('ablauf')
    } catch (e) {
      setError(e instanceof LoopApiError ? e.message : t.startFailed)
    } finally {
      setBusy(false)
    }
  }

  const step = async () => {
    if (!run || busy) return
    setBusy(true)
    setError(null)
    try {
      const after = await stepRun(run.runId)
      setRun(after)
      // Fortschritt bei JEDEM Durchlauf, nicht erst am Ende: wer nach vier
      // Schritten aufhört, hat die Lektion gesehen — und ein Lauf, der in die
      // Obergrenze läuft, wäre sonst nie erledigt.
      record(artifact.id, {
        type: 'agentloop',
        turns: after.turns.length,
        toolCalls: after.turns.reduce((n, t) => n + t.toolCalls.length, 0),
        tokensIn: after.cost.tokensIn,
        tokensOut: after.cost.tokensOut,
        resentShare: after.cost.resentShare,
        finished: after.status === 'completed',
      })
      if (artifact.tracked !== false && after.turns.length >= 2) markComplete(artifact.id)
      // Der Fokus springt auf den neuen Durchlauf — man will sehen, was gerade
      // passiert ist, nicht dort stehen bleiben, wo man vorher war.
      setFokus(after.turns.length ? after.turns[after.turns.length - 1].index : null)
    } catch (e) {
      setError(e instanceof LoopApiError ? e.message : t.stepFailed)
    } finally {
      setBusy(false)
    }
  }

  if (configError) {
    return (
      <div className="rounded-md border-0 border-l-4 border-solid border-l-red-400 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
        {configError}{' '}
        <button type="button" onClick={load} className="font-semibold underline underline-offset-2">
          {t.retry}
        </button>
      </div>
    )
  }
  if (!config) return <p className="font-sans text-sm text-slate-500">{t.loading}</p>

  if (!run) {
    return (
      <Setup
        config={config}
        document={document}
        task={task}
        model={model}
        busy={busy}
        error={error}
        onDocument={setDocument}
        onTask={setTask}
        onModel={setModel}
        onStart={start}
      />
    )
  }

  const aktiv = fokus ?? (run.turns.length ? run.turns[run.turns.length - 1].index : null)

  return (
    <div className="space-y-4">
      <Kopf run={run} config={config} onReset={() => setRun(null)} />

      <div className="flex items-center gap-1 border-0 border-b border-solid border-b-mist">
        <Reiter aktiv={ansicht === 'ablauf'} onClick={() => setAnsicht('ablauf')}>
          {t.tabFlow}
        </Reiter>
        <Reiter aktiv={ansicht === 'protokoll'} onClick={() => setAnsicht('protokoll')}>
          {t.tabLog(run.messageCount)}
        </Reiter>
      </div>

      {ansicht === 'ablauf' ? (
        <Ablaufsicht
          run={run}
          aktiv={aktiv}
          busy={busy}
          error={error}
          onFokus={setFokus}
          onStep={step}
        />
      ) : (
        <Protokollsicht
          run={run}
          aktiv={aktiv}
          onFokus={(i) => {
            setFokus(i)
            setAnsicht('ablauf')
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function Setup({
  config,
  document,
  task,
  model,
  busy,
  error,
  onDocument,
  onTask,
  onModel,
  onStart,
}: {
  config: LoopConfig
  document: string
  task: string
  model: string
  busy: boolean
  error: string | null
  onDocument: (v: string) => void
  onTask: (v: string) => void
  onModel: (v: string) => void
  onStart: () => void
}) {
  const bereit = document.trim().length > 0 && task.trim().length > 0 && !busy
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block font-sans text-sm font-semibold text-slate-800" htmlFor="loop-task">
          {t.taskLabel}
        </label>
        <textarea
          id="loop-task"
          value={task}
          onChange={(e) => onTask(e.target.value)}
          rows={2}
          maxLength={config.limits.maxTaskChars}
          placeholder={t.taskPlaceholder}
          className="w-full rounded-md border border-solid border-slate-300 p-2.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-sans text-sm font-semibold text-slate-800" htmlFor="loop-doc">
          {t.documentLabel}
        </label>
        <p className="mb-2 max-w-prose font-sans text-xs text-slate-500">
          Markdown. Der Agent bekommt diesen Text <strong>nicht</strong> in den Kontext — er holt sich die
          Abschnitte mit Werkzeugen. Eine eigene Offerte lässt sich einsetzen; die Lagedaten kennen dann
          allerdings nur die hinterlegten Adressen.
        </p>
        <textarea
          id="loop-doc"
          value={document}
          onChange={(e) => onDocument(e.target.value)}
          rows={10}
          maxLength={config.limits.maxDocumentChars}
          className="w-full rounded-md border border-solid border-slate-300 p-2.5 font-mono text-xs leading-relaxed text-slate-800 focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="mb-1.5 block font-sans text-sm font-semibold text-slate-800" htmlFor="loop-model">
            {t.modelLabel}
          </label>
          <select
            id="loop-model"
            value={model}
            onChange={(e) => onModel(e.target.value)}
            className="rounded-md border border-solid border-slate-300 px-2 py-1.5 font-sans text-sm text-slate-800"
          >
            {config.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.note}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={onStart}
          disabled={!bereit}
          className={
            bereit
              ? 'rounded-md bg-navy px-6 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-navy-light'
              : 'cursor-not-allowed rounded-md bg-mist px-6 py-2.5 font-sans text-sm font-semibold text-slate-400'
          }
        >
          {busy ? t.starting : t.start}
        </button>
      </div>

      {error && <Fehler text={error} />}

      <details className="rounded-md border border-solid border-mist bg-white px-4 py-3">
        <summary className="cursor-pointer font-sans text-sm font-semibold text-slate-800">
          Was der Agent mitbekommt ({config.toolCount} Werkzeuge)
        </summary>
        {/* Wortwoertlich, nicht nacherzaehlt: der Systemprompt und die
            Werkzeugbeschreibungen sind der halbe Lerngegenstand. */}
        <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">
          {t.systemPrompt}
        </p>
        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-cream px-3 py-2 font-mono text-xs text-slate-700">
          {config.systemPrompt}
        </pre>
        <p className="mt-3 font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">
          {t.tools}
        </p>
        <ul className="mt-1 space-y-1">
          {config.tools.map((t) => (
            <li key={t.name} className="font-sans text-xs text-slate-600">
              <code className="font-mono text-navy">{t.name}</code> — {t.description}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kopf: Zustand und Kosten
// ---------------------------------------------------------------------------

function Kopf({ run, config, onReset }: { run: LoopRun; config: LoopConfig; onReset: () => void }) {
  const modell = config.models.find((m) => m.id === run.model)?.label ?? run.model
  return (
    <div className="rounded-md border border-solid border-mist bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="max-w-prose font-sans text-sm text-slate-800">{run.task}</p>
        <button
          type="button"
          onClick={onReset}
          className="font-sans text-xs font-semibold text-navy underline underline-offset-2 hover:text-gold-dark"
        >
          {t.newRun}
        </button>
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-sans text-xs text-slate-500">
        <Kennzahl label={t.kModel} wert={modell} />
        <Kennzahl label={t.kTurns} wert={t.kTurnsOf(run.turns.length, run.maxTurns)} />
        <Kennzahl label={t.kConversation} wert={t.kMessages(run.messageCount)} />
        <Kennzahl
          label="Tokens"
          wert={`${run.cost.tokensIn.toLocaleString('de-CH')} ein · ${run.cost.tokensOut.toLocaleString('de-CH')} aus`}
        />
        {run.cost.resentShare !== null && (
          // Die Zahl, die das Kostengespraech ueber Agenten ueberhaupt erst
          // fuehrbar macht: wie viel davon war noch einmal dasselbe.
          <Kennzahl
            label={t.kResent}
            wert={`${Math.round(run.cost.resentShare * 100)} %`}
            hervorgehoben
          />
        )}
      </dl>
    </div>
  )
}

function Kennzahl({ label, wert, hervorgehoben }: { label: string; wert: string; hervorgehoben?: boolean }) {
  return (
    <div>
      <dt className="uppercase tracking-kicker text-slate-400">{label}</dt>
      <dd className={`m-0 ${hervorgehoben ? 'font-semibold text-navy' : 'text-slate-700'}`}>{wert}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ablaufsicht
// ---------------------------------------------------------------------------

function Ablaufsicht({
  run,
  aktiv,
  busy,
  error,
  onFokus,
  onStep,
}: {
  run: LoopRun
  aktiv: number | null
  busy: boolean
  error: string | null
  onFokus: (i: number) => void
  onStep: () => void
}) {
  const turn = run.turns.find((t) => t.index === aktiv) ?? null
  return (
    <div className="space-y-4">
      <Kreis run={run} busy={busy} />

      {run.turns.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {run.turns.map((t) => (
            <button
              key={t.index}
              type="button"
              onClick={() => onFokus(t.index)}
              className={
                'rounded px-2 py-1 font-sans text-xs font-semibold transition-colors ' +
                (t.index === aktiv ? 'bg-navy text-white' : 'bg-mist text-slate-600 hover:bg-mist-strong')
              }
            >
              {t.index}
            </button>
          ))}
        </div>
      )}

      {turn ? <Durchlauf turn={turn} /> : <p className="font-sans text-sm text-slate-500">{t.noTurnYet}</p>}

      {error && <Fehler text={error} />}
      <Weiter run={run} busy={busy} onStep={onStep} />
    </div>
  )
}

/**
 * Wo in der Schleife wir stehen.
 *
 * Ohne diese Verortung ist „Nächster Schritt" nur eine Weiter-Taste. Der Lernende
 * soll sehen, dass derselbe Kreis immer wieder durchlaufen wird und dass die
 * Verzweigung an genau einer Stelle sitzt: hat das Modell ein Werkzeug gerufen
 * oder nicht.
 */
function Kreis({ run, busy }: { run: LoopRun; busy: boolean }) {
  const letzter = run.turns[run.turns.length - 1]
  const stelle = busy
    ? 'modell'
    : !letzter
      ? 'start'
      : letzter.outcome === 'tool_use'
        ? 'ergebnis'
        : 'ende'

  const schritte: { key: string; label: string }[] = [
    { key: 'modell', label: t.cycleModel },
    { key: 'verzweigung', label: t.cycleBranch },
    { key: 'werkzeug', label: t.cycleTool },
    { key: 'ergebnis', label: t.cycleAppend },
  ]

  return (
    <div className="rounded-md border border-solid border-mist bg-cream px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 font-sans text-xs">
        {schritte.map((s, i) => (
          <span key={s.key} className="flex items-center gap-1">
            <span
              className={
                'rounded px-2 py-1 ' +
                (s.key === stelle ? 'bg-navy font-semibold text-white' : 'bg-white text-slate-500')
              }
            >
              {s.label}
            </span>
            {i < schritte.length - 1 && <span className="text-slate-400">→</span>}
          </span>
        ))}
        <span className="text-slate-400">↻</span>
      </div>
      <p className="mt-2 font-sans text-xs text-slate-500">
        {stelle === 'start' && t.atStart}
        {stelle === 'modell' && t.atModel}
        {stelle === 'ergebnis' &&
          t.atAppend}
        {stelle === 'ende' &&
          (run.status === 'stopped'
            ? t.atStopped
            : t.atDone)}
      </p>
    </div>
  )
}

function Durchlauf({ turn }: { turn: TurnSummary }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 font-sans text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-kicker text-slate-400">
          {t.turnN(turn.index)}
        </span>
        <span>{t.seconds((turn.ms / 1000).toFixed(1).replace('.', ','))}</span>
        <span>
          {turn.tokensIn.toLocaleString('de-CH')} ein · {turn.tokensOut.toLocaleString('de-CH')} aus
        </span>
        <span>
          {t.conversationAtCall} <strong className="text-slate-700">{turn.messageCount}</strong>
        </span>
        <Ausgang outcome={turn.outcome} stopReason={turn.stopReason} />
      </div>

      {turn.thinking && (
        <Feld label={t.reasoning} ton="denken">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
            {turn.thinking}
          </pre>
        </Feld>
      )}

      {turn.text && (
        <Feld label={turn.outcome === 'final' ? t.answerField : t.textBesideCall} ton="text">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
            {turn.text}
          </pre>
        </Feld>
      )}

      {turn.toolCalls.map((call) => (
        <Werkzeugaufruf key={call.toolUseId} call={call} />
      ))}

      {turn.error && <Fehler text={turn.error} />}
    </div>
  )
}

function Werkzeugaufruf({ call }: { call: ToolCall }) {
  return (
    <div
      className={
        'rounded-md border border-solid px-4 py-3 ' +
        (call.unknown ? 'border-amber-300 bg-amber-50' : 'border-mist bg-white')
      }
    >
      <p className="font-sans text-sm text-slate-800">
        <code className="font-mono text-navy">{call.name}</code>
        <span className="ml-2 text-slate-400">{call.digest}</span>
        <span className="ml-2 text-xs text-slate-400">{call.ms} ms</span>
      </p>
      {call.unknown && (
        <p className="mt-1 font-sans text-xs text-amber-800">
          {t.unknownTool}
        </p>
      )}
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.toolInput}</p>
          <Json value={call.input} />
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.toolOutput}</p>
          <Json value={call.output} />
        </div>
      </div>
    </div>
  )
}

function Weiter({ run, busy, onStep }: { run: LoopRun; busy: boolean; onStep: () => void }) {
  if (run.status === 'awaiting_step') {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onStep}
          disabled={busy}
          className={
            busy
              ? 'cursor-not-allowed rounded-md bg-mist px-6 py-2.5 font-sans text-sm font-semibold text-slate-400'
              : 'rounded-md bg-navy px-6 py-2.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-navy-light'
          }
        >
          {busy ? t.stepRunning : run.turns.length ? t.stepNext : t.stepFirst}
        </button>
        <span className="font-sans text-xs text-slate-500">
          {t.stepHint}
        </span>
      </div>
    )
  }
  if (run.status === 'completed') {
    return (
      <div className="rounded-md border-0 border-l-4 border-solid border-l-gold bg-gold-soft px-4 py-3">
        <p className="font-display text-sm font-bold uppercase tracking-kicker text-navy">{t.result}</p>
        <pre className="mt-2 max-w-prose whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
          {run.answer}
        </pre>
      </div>
    )
  }
  if (run.status === 'stopped') {
    return (
      <div className="rounded-md border-0 border-l-4 border-solid border-l-amber-400 bg-amber-50 px-4 py-3 font-sans text-sm text-amber-900">
        {t.stoppedNote(run.maxTurns)}
      </div>
    )
  }
  return run.error ? <Fehler text={run.error} /> : null
}

// ---------------------------------------------------------------------------
// Protokollsicht
// ---------------------------------------------------------------------------

/**
 * Das Gespräch, wie es tatsächlich rausgeht.
 *
 * Hier sitzt die Einsicht, um die es der ganzen Lektion geht: es gibt kein
 * verstecktes Gedächtnis und keine Sitzung. Es gibt ein Array, das wächst, und
 * bei jedem Aufruf geht es vollständig noch einmal mit.
 */
function Protokollsicht({
  run,
  aktiv,
  onFokus,
}: {
  run: LoopRun
  aktiv: number | null
  onFokus: (i: number) => void
}) {
  // Eigener Index: im Protokoll blättert man, ohne dass die Ablaufsicht
  // mitspringt. Erst „Im Ablauf ansehen" übernimmt ihn dorthin.
  const [index, setIndex] = useState<number | null>(aktiv)
  const [raw, setRaw] = useState<RawTurn | null>(null)
  const [ladend, setLadend] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const gewaehlt = index ?? run.turns[run.turns.length - 1]?.index ?? null

  useEffect(() => {
    if (gewaehlt === null) return
    let abgebrochen = false
    setLadend(true)
    setFehler(null)
    fetchRawTurn(run.runId, gewaehlt)
      .then((t) => {
        if (!abgebrochen) setRaw(t)
      })
      .catch(() => {
        if (!abgebrochen) setFehler(t.turnLoadError)
      })
      .finally(() => {
        if (!abgebrochen) setLadend(false)
      })
    return () => {
      abgebrochen = true
    }
  }, [run.runId, gewaehlt])

  if (gewaehlt === null) {
    return <p className="font-sans text-sm text-slate-500">{t.noTurnRecorded}</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">
          {t.call}
        </span>
        {run.turns.map((t) => (
          <button
            key={t.index}
            type="button"
            onClick={() => setIndex(t.index)}
            className={
              'rounded px-2 py-1 font-sans text-xs font-semibold transition-colors ' +
              (t.index === gewaehlt ? 'bg-navy text-white' : 'bg-mist text-slate-600 hover:bg-mist-strong')
            }
          >
            {t.index}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onFokus(gewaehlt)}
          className="ml-auto font-sans text-xs font-semibold text-navy underline underline-offset-2"
        >
          {t.showInFlow}
        </button>
      </div>

      {ladend && <p className="font-sans text-sm text-slate-500">{t.loading}</p>}
      {fehler && <Fehler text={fehler} />}

      {raw && raw.index === gewaehlt && (
        <>
          <p className="max-w-prose font-sans text-xs text-slate-500">
            Der vollständige Inhalt von Aufruf {raw.index}: {raw.request.messages.length}{' '}
            {raw.request.messages.length === 1 ? 'Nachricht' : 'Nachrichten'} plus Systemprompt und{' '}
            {raw.request.tools.length} Werkzeugdeklarationen. Beim nächsten Aufruf geht alles davon noch
            einmal mit — das ist das gesamte Gedächtnis des Agenten.
          </p>

          <Feld label="system" ton="text">
            <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700">{raw.request.system}</pre>
          </Feld>

          {raw.request.messages.map((m, i) => (
            <Feld key={i} label={`messages[${i}]`} ton="text">
              <Json value={m} />
            </Feld>
          ))}

          <Feld label="response.content" ton="denken">
            <Json value={raw.response.content} />
          </Feld>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Kleinteile
// ---------------------------------------------------------------------------

function Reiter({
  aktiv,
  onClick,
  children,
}: {
  aktiv: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'border-0 border-b-2 border-solid px-3 py-2 font-sans text-sm font-semibold transition-colors ' +
        (aktiv ? 'border-b-navy text-navy' : 'border-b-transparent text-slate-400 hover:text-slate-600')
      }
    >
      {children}
    </button>
  )
}

function Feld({
  label,
  ton,
  children,
}: {
  label: string
  ton: 'denken' | 'text'
  children: React.ReactNode
}) {
  return (
    <div
      className={
        'rounded-md border-0 border-l-4 border-solid px-4 py-3 ' +
        (ton === 'denken' ? 'border-l-slate-300 bg-slate-50' : 'border-l-navy bg-white')
      }
    >
      <p className="mb-1 font-sans text-xs font-semibold uppercase tracking-kicker text-slate-400">{label}</p>
      {children}
    </div>
  )
}

function Json({ value }: { value: unknown }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }, [value])
  return (
    <pre className="mt-1 max-h-72 overflow-auto rounded bg-cream px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
      {text}
    </pre>
  )
}

function Ausgang({ outcome, stopReason }: { outcome: TurnSummary['outcome']; stopReason: string | null }) {
  const text =
    outcome === 'tool_use'
      ? t.outToolUse
      : outcome === 'final'
        ? t.outFinal
        : outcome === 'max_turns'
          ? t.outMaxTurns
          : t.outError
  return (
    <span className="rounded bg-mist px-2 py-0.5 text-slate-600">
      {text}
      {stopReason && <span className="ml-1 text-slate-400">({stopReason})</span>}
    </span>
  )
}

function Fehler({ text }: { text: string }) {
  return (
    <div className="rounded-md border-0 border-l-4 border-solid border-l-red-400 bg-red-50 px-4 py-3 font-sans text-sm text-red-800">
      {text}
    </div>
  )
}
