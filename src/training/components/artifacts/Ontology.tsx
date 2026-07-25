import { useEffect, useMemo, useRef, useState } from 'react'
import type { OntologyArtifact } from '../../schema/types'
import { fetchOntology, type Ontology as OntologyData, type OntologyEntity } from '../../lib/dataroomApi'
import { useRecordInteraction, useSavedInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import { Markdown } from '../../lib/markdown'

const t = labels.ontologyBlock

/**
 * Ontology explorer: renders the DATENRAUM metamodel (classes + relationships)
 * interactively. Pick a class to see its attributes and its outgoing/incoming
 * relationships; relationship chips navigate between classes. Progress: complete
 * once the learner has opened at least one class.
 */
export default function Ontology({ artifact }: { artifact: OntologyArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()
  const { interaction: saved } = useSavedInteraction(artifact.id)

  const [data, setData] = useState<OntologyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const explored = useRef(!!(saved && (saved as { explored?: boolean }).explored))

  useEffect(() => {
    let cancelled = false
    fetchOntology()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setSelected((s) => s ?? d.entities.find((e) => e.status === 'erp')?.name ?? d.entities[0]?.name ?? null)
      })
      .catch((e) => !cancelled && setError((e as Error).message))
    return () => {
      cancelled = true
    }
  }, [])

  const byName = useMemo(() => new Map((data?.entities ?? []).map((e) => [e.name, e])), [data])

  // User-initiated selection → mark explored (first time) and record progress.
  const open = (name: string) => {
    setSelected(name)
    if (!explored.current) {
      explored.current = true
      record(artifact.id, { type: 'ontology', explored: true })
      if (artifact.tracked !== false) markComplete(artifact.id)
    }
  }

  const erp = (data?.entities ?? []).filter((e) => e.status === 'erp')
  const ext = (data?.entities ?? []).filter((e) => e.status === 'extension')
  const sel = selected ? byName.get(selected) : undefined
  const incoming = useMemo(
    () => (data && sel ? data.relationships.filter((r) => r.to === sel.name) : []),
    [data, sel],
  )

  const ClassButton = ({ e }: { e: OntologyEntity }) => (
    <button
      type="button"
      onClick={() => open(e.name)}
      className={`flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors ${
        sel?.name === e.name ? 'border-navy bg-navy text-white' : 'border-mist bg-white text-navy hover:border-navy hover:bg-cream'
      }`}
    >
      <span aria-hidden>{e.icon}</span>
      <span className="flex-1 truncate font-medium">{e.label}</span>
      <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold ${sel?.name === e.name ? 'bg-white/20' : 'bg-cream text-slate-500'}`}>
        {e.graphAs === 'edge' ? t.edge : t.node}
      </span>
    </button>
  )

  if (error) {
    return <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
  }
  if (!data) {
    return <div className="rounded-md border border-mist bg-cream/40 p-4 text-sm text-slate-500">{labels.loading}</div>
  }

  return (
    <div className="rounded-lg border border-mist bg-white">
      {(artifact.title || artifact.instructions) && (
        <div className="border-b border-mist bg-cream px-4 py-3">
          {artifact.title && <h4 className="font-display font-bold text-navy">{artifact.title}</h4>}
          {artifact.instructions && (
            <div className="mt-0.5 text-sm text-slate-600">
              <Markdown text={artifact.instructions} />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-mist px-4 py-2 text-xs text-slate-500">
        <span><b className="text-navy">{data.entities.length}</b> {t.classes}</span>
        <span><b className="text-navy">{data.relationships.length}</b> {t.relationships}</span>
        <span className="ml-auto rounded bg-cream px-2 py-0.5 font-mono text-slate-500">{data.db}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[minmax(11rem,15rem)_1fr]">
        {/* Class list */}
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.erpCore}</p>
            <div className="space-y-1">{erp.map((e) => <ClassButton key={e.name} e={e} />)}</div>
          </div>
          {ext.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.extensions}</p>
              <div className="space-y-1 opacity-80">{ext.map((e) => <ClassButton key={e.name} e={e} />)}</div>
            </div>
          )}
        </div>

        {/* Detail */}
        {sel && (
          <div className="min-w-0 rounded-md border border-mist bg-cream/30 p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>{sel.icon}</span>
              <div>
                <h4 className="font-display text-lg font-bold text-navy">{sel.label}</h4>
                <code className="text-xs text-slate-400">{sel.name}</code>
              </div>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${sel.status === 'erp' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {sel.status === 'erp' ? t.erpTag : t.extensionTag}
              </span>
            </div>

            {/* Attributes */}
            <p className="mt-4 text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.attributes}</p>
            <ul className="mt-1 divide-y divide-mist rounded-md border border-mist bg-white">
              {sel.attributes.map((a) => (
                <li key={a.name} className="flex items-baseline gap-2 px-3 py-1.5 text-sm">
                  <span className="font-medium text-navy">{a.label}</span>
                  <code className="text-xs text-slate-400">{a.name}</code>
                  <span className="ml-auto text-xs text-slate-500">
                    {a.type}
                    {a.enum ? `: ${a.enum.join(' | ')}` : ''}
                  </span>
                </li>
              ))}
            </ul>

            {/* Outgoing relationships */}
            {sel.references.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.relOut}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {sel.references.map((r) => {
                    const target = byName.get(r.to)
                    return (
                      <button key={r.field} type="button" onClick={() => open(r.to)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-mist bg-white px-2.5 py-1 text-xs text-navy transition-colors hover:border-navy hover:bg-cream">
                        <span className="text-slate-400">{r.label}</span>
                        <span aria-hidden>→ {target?.icon}</span>
                        <span className="font-medium">{target?.label ?? r.to}</span>
                        {r.array && <span className="text-slate-400">[ ]</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Incoming relationships */}
            {incoming.length > 0 && (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.relIn}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {incoming.map((r) => {
                    const source = byName.get(r.from)
                    return (
                      <button key={`${r.from}-${r.rel}`} type="button" onClick={() => open(r.from)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-mist bg-white px-2.5 py-1 text-xs text-navy transition-colors hover:border-navy hover:bg-cream">
                        <span aria-hidden>{source?.icon} ←</span>
                        <span className="font-medium">{source?.label ?? r.from}</span>
                        <span className="text-slate-400">{r.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
