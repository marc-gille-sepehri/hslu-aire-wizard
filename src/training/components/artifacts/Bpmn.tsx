import { useEffect, useRef, useState } from 'react'
import type { BpmnArtifact } from '../../schema/types'
import { useRecordInteraction, useSavedInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css'

const t = labels.editor

// A blank diagram (one start event) used when there is neither a saved diagram
// nor an admin-provided starter.
/**
 * Dateiname aus dem Blocktitel. Umlaute werden ersetzt statt entfernt, sonst
 * wird aus „Prozessübersicht" ein „Prozessbersicht"; alles Übrige weicht einem
 * Bindestrich, damit die Datei auf jedem System und in jedem Mailanhang trägt.
 */
function fileStem(title?: string): string {
  const base = (title ?? '').trim() || 'prozessmodell'
  return (
    base
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'prozessmodell'
  )
}

const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="173" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

/**
 * BPMN modeling block. Embeds the bpmn.io modeler; the learner draws a process
 * and clicks "Speichern", which records the BPMN 2.0 XML as an interaction on
 * the server (ModuleProgress). On reload the saved XML is restored from there.
 *
 * bpmn-js is loaded lazily so the (large) modeler is only fetched on pages that
 * actually contain a BPMN block.
 */
export default function Bpmn({ artifact }: { artifact: BpmnArtifact }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Modeler instance; `any` because bpmn-js's typings are awkward to thread here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelerRef = useRef<any>(null)
  const record = useRecordInteraction()
  const { markComplete } = useLearner()
  const { interaction: saved, loaded } = useSavedInteraction(artifact.id)

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  // Top offset for fullscreen so it sits below the sticky site header (z-100),
  // which would otherwise overlap the canvas. Measured at runtime (responsive).
  const [topOffset, setTopOffset] = useState(0)

  const toggleExpand = () => {
    setExpanded((v) => {
      if (!v) {
        const header = document.querySelector('.site-header') as HTMLElement | null
        setTopOffset(header?.offsetHeight ?? 0)
      }
      return !v
    })
  }

  // Initialise the modeler once the saved progress has settled (so we can seed
  // it with the restored diagram). Re-runs only if the block id changes.
  useEffect(() => {
    if (!loaded) return
    let disposed = false
    let modeler: { destroy: () => void } | null = null
    ;(async () => {
      try {
        const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler')
        if (disposed || !containerRef.current) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance: any = new BpmnModeler({ container: containerRef.current })
        modeler = instance
        modelerRef.current = instance
        const savedXml =
          saved && typeof (saved as { xml?: unknown }).xml === 'string'
            ? (saved as { xml: string }).xml
            : null
        await instance.importXML(savedXml || artifact.starterXml || EMPTY_DIAGRAM)
        try {
          instance.get('canvas').zoom('fit-viewport')
        } catch {
          /* canvas may be empty */
        }
        if (disposed) return
        if (savedXml) setSavedAt(Date.now())
        setStatus('ready')
      } catch (e) {
        console.warn('[training] bpmn modeler init failed:', (e as Error).message)
        if (!disposed) setStatus('error')
      }
    })()
    return () => {
      disposed = true
      try {
        modeler?.destroy()
      } catch {
        /* noop */
      }
      modelerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, artifact.id])

  const onSave = async () => {
    const modeler = modelerRef.current
    if (!modeler) return
    setSaving(true)
    try {
      const { xml } = await modeler.saveXML({ format: true })
      if (xml) {
        record(artifact.id, { type: 'bpmn', xml })
        if (artifact.tracked !== false) markComplete(artifact.id)
        setSavedAt(Date.now())
      }
    } catch (e) {
      console.warn('[training] bpmn save failed:', (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Das Diagramm als .bpmn-Datei herunterladen.
   *
   * Aus dem Modeler geholt, nicht aus dem zuletzt Gespeicherten: sonst lädt man
   * einen Stand herunter, den man auf dem Bildschirm gar nicht sieht.
   *
   * Die Endung ist `.bpmn`, weil bpmn.io, Camunda und Signavio danach filtern —
   * als `.xml` müsste man beim Öffnen jedes Mal den Dateityp umstellen.
   */
  const onDownload = async () => {
    const modeler = modelerRef.current
    if (!modeler) return
    try {
      const { xml } = await modeler.saveXML({ format: true })
      if (!xml) return
      const url = URL.createObjectURL(new Blob([xml], { type: 'application/bpmn+xml' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileStem(artifact.title)}.bpmn`
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Freigeben, sonst hält der Objekt-URL das Diagramm im Speicher fest,
      // solange die Seite offen ist — bei mehreren Downloads summiert sich das.
      URL.revokeObjectURL(url)
    } catch (e) {
      console.warn('[training] bpmn download failed:', (e as Error).message)
    }
  }

  // Re-fit the canvas when entering/leaving fullscreen (the container resized).
  useEffect(() => {
    const m = modelerRef.current
    if (!m || status !== 'ready') return
    const id = window.setTimeout(() => {
      try {
        m.get('canvas').resized()
        m.get('canvas').zoom('fit-viewport')
      } catch {
        /* noop */
      }
    }, 60)
    return () => window.clearTimeout(id)
  }, [expanded, status])

  // Esc leaves fullscreen.
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const expandButton = (
    <button
      type="button"
      onClick={toggleExpand}
      aria-label={expanded ? t.bpmnCollapse : t.bpmnExpand}
      title={expanded ? t.bpmnCollapse : t.bpmnExpand}
      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-navy hover:text-navy"
    >
      {expanded ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 9 4 4m0 0v4m0-4h4M15 9l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4M15 15l5 5m0 0v-4m0 4h-4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />
        </svg>
      )}
    </button>
  )

  // Fullscreen overlay sits at z-40 so the chat widget (z-50) keeps overlaying it,
  // and starts below the sticky header (via inline top) so the canvas isn't hidden.
  return (
    <div
      className={expanded ? 'fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 bg-white p-3' : 'space-y-3'}
      style={expanded ? { top: topOffset } : undefined}
    >
      {expanded && (artifact.title || artifact.instructions) && (
        <p className="shrink-0 truncate font-sans font-semibold text-slate-800">{artifact.title || t.bpmnExpand}</p>
      )}
      {!expanded && artifact.title && <p className="font-sans font-semibold text-slate-800">{artifact.title}</p>}
      {!expanded && artifact.instructions && <p className="text-sm text-slate-500">{artifact.instructions}</p>}

      <div className={`relative rounded-md border border-slate-300 bg-white ${expanded ? 'min-h-0 flex-1' : 'overflow-hidden'}`}>
        <div ref={containerRef} className={expanded ? 'h-full w-full' : ''} style={expanded ? undefined : { height: 480 }} />
        {status !== 'ready' && (
          <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">
            {status === 'error' ? t.bpmnError : labels.loading}
          </div>
        )}
        {expandButton}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || status !== 'ready'}
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
        >
          {saving ? t.bpmnSaving : t.bpmnSave}
        </button>
        <button
          type="button"
          onClick={onDownload}
          disabled={status !== 'ready'}
          title={t.bpmnDownloadHint}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-navy hover:text-navy disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
          {t.bpmnDownload}
        </button>
        {savedAt && <span className="text-xs font-semibold text-emerald-700">{t.bpmnSaved}</span>}
        {expanded && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="ml-auto rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-navy hover:text-navy"
          >
            {t.bpmnCollapse}
          </button>
        )}
      </div>
    </div>
  )
}
