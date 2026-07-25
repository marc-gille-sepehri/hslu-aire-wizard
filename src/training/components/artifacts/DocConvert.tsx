import { useRef, useState } from 'react'
import type { DocConvertArtifact } from '../../schema/types'
import { convertDocument, type ConvertResult } from '../../lib/convertApi'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import { Markdown } from '../../lib/markdown'

const t = labels.docConvert

type Tab = 'markdown' | 'serialized' | 'analysis'

/**
 * Document → Markdown converter block: upload a PDF/PPTX/DOCX/image and see the
 * Markdown (Docling); for spreadsheets, also the row-wise serialization and a
 * statistical analysis. Complete once a file has been converted.
 */
export default function DocConvert({ artifact }: { artifact: DocConvertArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()
  const fileRef = useRef<HTMLInputElement>(null)

  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConvertResult | null>(null)
  const [tab, setTab] = useState<Tab>('markdown')
  const [rawMd, setRawMd] = useState(false)

  const convert = async (file?: File) => {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await convertDocument(file)
      setResult(res)
      setTab('markdown')
      setRawMd(false)
      record(artifact.id, { type: 'docconvert', converted: true })
      if (artifact.tracked !== false) markComplete(artifact.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const isExcel = result?.kind === 'excel'
  const markdown = isExcel ? result!.excel!.markdown : result?.markdown ?? ''

  return (
    <div className="rounded-lg border border-mist bg-white">
      {(artifact.title || artifact.instructions) && (
        <div className="border-b border-mist bg-cream px-4 py-3">
          {artifact.title && <h4 className="font-display font-bold text-navy">{artifact.title}</h4>}
          {artifact.instructions && <div className="mt-0.5 text-sm text-slate-600"><Markdown text={artifact.instructions} /></div>}
        </div>
      )}

      <div className="space-y-3 p-4">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false) }}
          onDrop={(e) => { e.preventDefault(); setDrag(false); convert(e.dataTransfer.files[0]) }}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors ${
            drag ? 'border-navy bg-navy/5' : 'border-mist hover:border-navy hover:bg-cream'
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-navy">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          <span className="text-sm font-semibold text-navy">{busy ? t.converting : t.drop}</span>
          <span className="text-xs text-slate-400">{t.formats}</span>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => { convert(e.target.files?.[0] ?? undefined); e.target.value = '' }} />
        </div>

        {error && <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

        {result && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-cream px-2 py-0.5 font-mono text-xs text-slate-600">{result.filename}</span>
              {isExcel && (
                <div className="flex gap-1">
                  {(['markdown', 'serialized', 'analysis'] as Tab[]).map((k) => (
                    <button key={k} type="button" onClick={() => setTab(k)}
                      className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${tab === k ? 'bg-navy text-white' : 'text-slate-500 hover:text-navy'}`}>
                      {t.tab[k]}
                    </button>
                  ))}
                </div>
              )}
              {(!isExcel || tab === 'markdown') && (
                <button type="button" onClick={() => setRawMd((v) => !v)} className="ml-auto text-xs font-medium text-slate-500 hover:text-navy">
                  {rawMd ? t.rendered : t.raw}
                </button>
              )}
            </div>

            {/* Markdown tab (documents + excel) */}
            {(!isExcel || tab === 'markdown') && (
              rawMd ? (
                <pre className="max-h-96 overflow-auto rounded-md border border-mist bg-navy/95 px-3 py-2 font-mono text-xs text-cream whitespace-pre-wrap">{markdown}</pre>
              ) : (
                <div className="max-h-96 overflow-auto rounded-md border border-mist px-3 py-2">
                  <Markdown text={markdown} />
                </div>
              )
            )}

            {/* Serialized tab (excel) */}
            {isExcel && tab === 'serialized' && (
              <div className="max-h-96 space-y-3 overflow-auto rounded-md border border-mist p-3">
                {result!.excel!.serialized.map((s) => (
                  <div key={s.name}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-kicker text-slate-400">{s.name}</p>
                    <pre className="overflow-x-auto rounded bg-navy/95 px-2 py-1.5 font-mono text-[11px] text-cream whitespace-pre">{s.serialized}</pre>
                  </div>
                ))}
              </div>
            )}

            {/* Analysis tab (excel) */}
            {isExcel && tab === 'analysis' && (
              <div className="max-h-96 space-y-4 overflow-auto rounded-md border border-mist p-3">
                {result!.excel!.analysis.map((sheet) => (
                  <div key={sheet.name}>
                    <p className="text-sm font-semibold text-navy">{sheet.name} <span className="text-xs font-normal text-slate-400">· {sheet.rows} Zeilen</span></p>
                    <table className="mt-1 w-full text-left text-xs">
                      <thead className="text-slate-400"><tr><th className="py-1 pr-2">Spalte</th><th className="pr-2">Typ</th><th className="pr-2">Null</th><th className="pr-2">Eind.</th><th>Stats / Top</th></tr></thead>
                      <tbody>
                        {sheet.columns.map((c) => (
                          <tr key={c.name} className="border-t border-mist">
                            <td className="py-1 pr-2 font-medium text-navy">{c.name}</td>
                            <td className="pr-2 text-slate-500">{c.dtype}</td>
                            <td className="pr-2 text-slate-500">{c.nulls}</td>
                            <td className="pr-2 text-slate-500">{c.unique}</td>
                            <td className="text-slate-600">
                              {c.stats
                                ? `min ${c.stats.min} · max ${c.stats.max} · Ø ${c.stats.mean} · Σ ${c.stats.sum}`
                                : (c.top ?? []).map((x) => `${x.value} (${x.count})`).join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
