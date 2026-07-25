import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import type { ObjectGraphArtifact } from '../../schema/types'
import { fetchGraphStart, fetchGraphNeighbors, fetchGraphTypes, fetchOntology, type GraphData } from '../../lib/dataroomApi'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import { Markdown } from '../../lib/markdown'

const t = labels.objectGraph

const PALETTE = ['#0f2540', '#e0a63c', '#2a7d6f', '#b5533b', '#5b6bbf', '#7a8a3c', '#a7568f', '#3f8fb0', '#8a6d3b', '#556070']
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

  const expand = async (id: string) => {
    try {
      const data = await fetchGraphNeighbors(id)
      addElements(data)
      cyRef.current?.$id(id).addClass('expanded')
      if (!expandedOnce.current) {
        expandedOnce.current = true
        record(artifact.id, { type: 'graphview', expanded: true })
        if (artifact.tracked !== false) markComplete(artifact.id)
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }
  expandRef.current = expand

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
