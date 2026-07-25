import { useState } from 'react'
import type { DataQueryArtifact } from '../../schema/types'
import { runQuery, type QueryResult } from '../../lib/dataroomApi'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import { Markdown } from '../../lib/markdown'

const t = labels.dataQuery

const DEFAULT_SQL = "SELECT street, city, postalCode FROM Site ORDER BY city LIMIT 20"

const EXAMPLES = [
  "SELECT street, city, postalCode FROM Site ORDER BY city",
  "SELECT name, floor, area FROM Unit WHERE area > 100 ORDER BY area DESC",
  "SELECT status, nettomiete, kaution FROM LeaseContract WHERE status = 'active' LIMIT 20",
  "SELECT description, severity, status FROM Case WHERE status = 'open'",
]

function cell(v: unknown): string {
  if (v == null) return '—'
  if (Array.isArray(v)) return v.join(', ')
  if (v instanceof Object) return JSON.stringify(v)
  return String(v)
}

/**
 * Data-room SQL explorer: write a read-only SELECT against DATENRAUM; the server
 * translates it to a MongoDB query (whitelisted). Progress: complete once a query
 * has run successfully.
 */
export default function DataQuery({ artifact }: { artifact: DataQueryArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()

  const [sql, setSql] = useState(artifact.defaultQuery || DEFAULT_SQL)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const run = async () => {
    if (!sql.trim() || running) return
    setRunning(true)
    setError(null)
    try {
      const res = await runQuery(sql)
      setResult(res)
      record(artifact.id, { type: 'dataquery', ran: true })
      if (artifact.tracked !== false) markComplete(artifact.id)
    } catch (e) {
      setError((e as Error).message)
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  const inputCls = 'w-full resize-y rounded-md border border-mist bg-navy/95 px-3 py-2 font-mono text-sm text-cream outline-none focus:border-gold'

  return (
    <div className="rounded-lg border border-mist bg-white">
      {(artifact.title || artifact.instructions) && (
        <div className="border-b border-mist bg-cream px-4 py-3">
          {artifact.title && <h4 className="font-display font-bold text-navy">{artifact.title}</h4>}
          {artifact.instructions && (
            <div className="mt-0.5 text-sm text-slate-600"><Markdown text={artifact.instructions} /></div>
          )}
        </div>
      )}

      <div className="space-y-3 p-4">
        {/* Example chips */}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex, i) => (
            <button key={i} type="button" onClick={() => setSql(ex)}
              className="max-w-full truncate rounded-full border border-mist bg-cream px-2.5 py-1 font-mono text-[11px] text-slate-600 transition-colors hover:border-navy hover:text-navy">
              {ex}
            </button>
          ))}
        </div>

        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              run()
            }
          }}
          rows={4}
          spellCheck={false}
          className={inputCls}
        />

        <div className="flex items-center gap-3">
          <button type="button" onClick={run} disabled={running}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60">
            {running ? t.running : t.run}
          </button>
          <span className="text-xs text-slate-400">{t.hint}</span>
          <button type="button" onClick={() => setShowHelp((s) => !s)} className="ml-auto text-xs font-medium text-slate-500 hover:text-navy">
            {t.syntaxToggle}
          </button>
        </div>

        {showHelp && (
          <div className="rounded-md border border-mist bg-cream/50 p-3 text-xs text-slate-600">
            <p className="font-mono text-slate-500">SELECT &lt;Spalten|*&gt; FROM &lt;Klasse&gt; [WHERE …] [ORDER BY … [ASC|DESC]] [LIMIT n]</p>
            <p className="mt-1">{t.syntaxBody}</p>
          </div>
        )}

        {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        {result && (
          <div>
            <p className="mb-1 text-xs text-slate-500">{t.rowCount(result.count, result.collection)}</p>
            {result.rows.length === 0 ? (
              <p className="rounded-md border border-mist bg-cream/40 px-3 py-4 text-center text-sm text-slate-400">{t.noRows}</p>
            ) : (
              <div className="max-h-96 overflow-auto rounded-md border border-mist">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-cream">
                    <tr className="text-xs uppercase tracking-kicker text-slate-500">
                      {result.columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => (
                      <tr key={i} className="border-t border-mist">
                        {result.columns.map((c) => (
                          <td key={c} className="max-w-xs truncate px-3 py-1.5 text-slate-700" title={cell(row[c])}>{cell(row[c])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
