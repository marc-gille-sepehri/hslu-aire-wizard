import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import type { ObjectGraphArtifact } from '../../schema/types'
import { fetchGraphStart, fetchGraphNeighbors, fetchGraphTypes, fetchOntology, runCypher, type GraphData } from '../../lib/dataroomApi'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import { Markdown } from '../../lib/markdown'

const t = labels.objectGraph

const PALETTE = ['#0f2540', '#e0a63c', '#2a7d6f', '#b5533b', '#5b6bbf', '#7a8a3c', '#a7568f', '#3f8fb0', '#8a6d3b', '#556070']

const CYPHER_EXAMPLES = [
  "MATCH (u:Einheit)-[:liegt_in]->(s:Liegenschaft) WHERE s.city = 'Luzern' RETURN u, s",
  "MATCH (t:Mieter)-[:Mietverhältnis]->(u:Einheit) RETURN t, u",
  "MATCH (c:Schadensfall)-[:an]->(s:Liegenschaft) WHERE c.status = 'open' RETURN c, s",
  "MATCH (t:Mieter)-[:Mietverhältnis]->(u:Einheit)-[:liegt_in]->(s:Liegenschaft) RETURN t, u, s",
]
const colorFor = (type: string): string =>
  PALETTE[[...type].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]

interface TypeMeta { name: string; label: string; icon: string; count: number }

/**
 * Object-graph explorer: renders the DATENRAUM data as an interactive node-link
 * graph (cytoscape) built from a server-side in-memory cache. Seed by class, then
 * click a node to expand its neighbours. Progress: complete once a node is expanded.
 */
export default function ObjectGraph({ artifact }: { artifact: ObjectGraphArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()

  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const loaded = useRef<{ nodes: Set<string>; edges: Set<string> }>({ nodes: new Set(), edges: new Set() })
  const expandedOnce = useRef(false)
  const expandRef = useRef<(id: string) => void>(() => {})

  const [meta, setMeta] = useState<TypeMeta[]>([])
  const [seedType, setSeedType] = useState(artifact.startType || 'Site')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodeCount, setNodeCount] = useState(0)
  const [cypher, setCypher] = useState('')
  const [cyResult, setCyResult] = useState<{ rows: Record<string, unknown>[]; columns: string[]; matchCount: number } | null>(null)
  const [cyError, setCyError] = useState<string | null>(null)
  const [cyRunning, setCyRunning] = useState(false)

  const runLayout = () => cyRef.current?.layout({ name: 'cose', animate: false, fit: true, padding: 24 }).run()

  const addElements = (data: GraphData) => {
    const cy = cyRef.current
    if (!cy) return
    const add: cytoscape.ElementDefinition[] = []
    for (const n of data.nodes) {
      if (!loaded.current.nodes.has(n.id)) {
        loaded.current.nodes.add(n.id)
        add.push({ group: 'nodes', data: { id: n.id, label: n.label, type: n.type, color: colorFor(n.type) } })
      }
    }
    for (const e of data.edges) {
      if (!loaded.current.edges.has(e.id) && loaded.current.nodes.has(e.source) && loaded.current.nodes.has(e.target)) {
        loaded.current.edges.add(e.id)
        add.push({ group: 'edges', data: { id: e.id, source: e.source, target: e.target, label: e.label } })
      }
    }
    if (add.length) cy.add(add)
    setNodeCount(loaded.current.nodes.size)
    runLayout()
  }

  const markDone = () => {
    if (!expandedOnce.current) {
      expandedOnce.current = true
      record(artifact.id, { type: 'graphview', expanded: true })
      if (artifact.tracked !== false) markComplete(artifact.id)
    }
  }

  const clearHighlight = () => {
    cyRef.current?.elements().removeClass('dim match')
    setCyResult(null)
    setCyError(null)
  }

  const expand = async (id: string) => {
    clearHighlight()
    try {
      const data = await fetchGraphNeighbors(id)
      addElements(data)
      cyRef.current?.$id(id).addClass('expanded')
      markDone()
    } catch (e) {
      setError((e as Error).message)
    }
  }
  expandRef.current = expand

  const runQuery = async () => {
    if (!cypher.trim() || cyRunning) return
    setCyRunning(true)
    setCyError(null)
    try {
      const res = await runCypher(cypher)
      addElements(res)
      const cy = cyRef.current
      if (cy) {
        cy.elements().addClass('dim')
        let matched = cy.collection()
        for (const n of res.nodes) matched = matched.union(cy.$id(n.id))
        for (const e of res.edges) matched = matched.union(cy.$id(e.id))
        matched.removeClass('dim').addClass('match')
        if (matched.length) cy.animate({ fit: { eles: matched, padding: 40 }, duration: 300 })
      }
      setCyResult({ rows: res.rows, columns: res.columns, matchCount: res.matchCount })
      markDone()
    } catch (e) {
      setCyError((e as Error).message)
      setCyResult(null)
    } finally {
      setCyRunning(false)
    }
  }

  // Init cytoscape once.
  useEffect(() => {
    if (!containerRef.current) return
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            label: 'data(label)',
            'font-size': '9px',
            color: '#334155',
            'text-valign': 'bottom',
            'text-margin-y': 3,
            'text-max-width': '90px',
            'text-wrap': 'ellipsis',
            width: 26,
            height: 26,
          },
        },
        { selector: 'node.expanded', style: { 'border-width': 3, 'border-color': '#e0a63c' } },
        { selector: '.dim', style: { opacity: 0.12 } },
        { selector: 'node.match', style: { 'border-width': 3, 'border-color': '#e0a63c', opacity: 1 } },
        { selector: 'edge.match', style: { 'line-color': '#e0a63c', 'target-arrow-color': '#e0a63c', width: 2.5, color: '#0f2540', opacity: 1 } },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#cbd5e1',
            'target-arrow-color': '#cbd5e1',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.8,
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '8px',
            color: '#94a3b8',
            'text-rotation': 'autorotate',
          },
        },
      ],
    })
    cy.on('tap', 'node', (evt) => expandRef.current(evt.target.id()))
    cyRef.current = cy
    return () => cy.destroy()
  }, [])

  // Seed / re-seed when the class changes.
  useEffect(() => {
    let cancelled = false
    const cy = cyRef.current
    if (!cy) return
    setLoading(true)
    setError(null)
    fetchGraphStart(seedType)
      .then((data) => {
        if (cancelled) return
        cy.elements().remove()
        loaded.current = { nodes: new Set(), edges: new Set() }
        addElements(data)
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedType])

  // Metadata for selector + legend.
  useEffect(() => {
    Promise.all([fetchGraphTypes(), fetchOntology()])
      .then(([types, onto]) => {
        const byName = new Map(onto.entities.map((e) => [e.name, e]))
        setMeta(types.map((x) => ({ name: x.type, count: x.count, label: byName.get(x.type)?.label ?? x.type, icon: byName.get(x.type)?.icon ?? '•' })))
      })
      .catch(() => setMeta([]))
  }, [])

  return (
    <div className="rounded-lg border border-mist bg-white">
      {(artifact.title || artifact.instructions) && (
        <div className="border-b border-mist bg-cream px-4 py-3">
          {artifact.title && <h4 className="font-display font-bold text-navy">{artifact.title}</h4>}
          {artifact.instructions && <div className="mt-0.5 text-sm text-slate-600"><Markdown text={artifact.instructions} /></div>}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 border-b border-mist px-4 py-2 text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          {t.seed}
          <select
            value={seedType}
            onChange={(e) => setSeedType(e.target.value)}
            className="rounded-md border border-mist bg-white px-2 py-1 text-sm text-navy"
          >
            {meta.map((m) => (
              <option key={m.name} value={m.name}>{m.label} ({m.count})</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-400">{loading ? labels.loading : t.hint}</span>
        <span className="ml-auto text-xs text-slate-500">{t.nodeCount(nodeCount)}</span>
      </div>

      {/* Cypher query panel */}
      <div className="space-y-2 border-b border-mist px-4 py-2">
        <div className="flex flex-wrap gap-1.5">
          {CYPHER_EXAMPLES.map((ex, i) => (
            <button key={i} type="button" onClick={() => setCypher(ex)}
              className="max-w-full truncate rounded-full border border-mist bg-cream px-2.5 py-1 font-mono text-[11px] text-slate-600 transition-colors hover:border-navy hover:text-navy">
              {ex}
            </button>
          ))}
        </div>
        <div className="flex items-start gap-2">
          <textarea
            value={cypher}
            onChange={(e) => setCypher(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runQuery() } }}
            rows={2}
            spellCheck={false}
            placeholder={t.cypherPlaceholder}
            className="min-w-0 flex-1 resize-y rounded-md border border-mist bg-navy/95 px-3 py-2 font-mono text-xs text-cream outline-none focus:border-gold"
          />
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" onClick={runQuery} disabled={cyRunning}
              className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60">
              {cyRunning ? labels.loading : t.cypherRun}
            </button>
            <button type="button" onClick={clearHighlight}
              className="rounded-md border border-mist px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-navy hover:text-navy">
              {t.cypherClear}
            </button>
          </div>
        </div>
        {cyError && <p className="text-xs text-red-700">{cyError}</p>}
        {cyResult && (
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-navy">{t.matchCount(cyResult.matchCount)}</span>
            {cyResult.columns.length > 0 && cyResult.rows.length > 0 && (
              <div className="mt-1 max-h-40 overflow-auto rounded-md border border-mist">
                <table className="w-full text-left">
                  <thead className="bg-cream"><tr>{cyResult.columns.map((c) => <th key={c} className="px-2 py-1 font-semibold">{c}</th>)}</tr></thead>
                  <tbody>
                    {cyResult.rows.map((r, i) => (
                      <tr key={i} className="border-t border-mist">{cyResult.columns.map((c) => <td key={c} className="px-2 py-1">{String(r[c] ?? '—')}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="mx-4 mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      {/* Graph canvas */}
      <div ref={containerRef} className="h-[440px] w-full bg-cream/20" />

      {/* Legend */}
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-mist px-4 py-2 text-xs text-slate-500">
          {meta.map((m) => (
            <span key={m.name} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorFor(m.name) }} />
              {m.icon} {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
