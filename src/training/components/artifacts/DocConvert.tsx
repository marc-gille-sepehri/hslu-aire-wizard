import { useRef, useState } from 'react'
import type { DocConvertArtifact } from '../../schema/types'
import { convertDocument, type ConvertResult } from '../../lib/convertApi'
import { useRecordInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import { Markdown } from '../../lib/markdown'
import MarkdownEditor from '../../editor/MarkdownEditor'

const t = labels.docConvert

type Tab = 'markdown' | 'cells' | 'analysis'

/**
 * Document → Markdown converter block: upload a PDF/PPTX/DOCX/image and see the
 * Markdown (Docling); for spreadsheets, also a statistical analysis and —  when the
 * artifact asks for it — a cell-addressed serialization that keeps addresses, merges
 * and stored values where the Markdown table silently loses them.
 * Complete once a file has been converted, in whichever format.
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
  // Editable markdown shown in the same editor as the text block.
  const [markdown, setMarkdown] = useState('')
  const [copied, setCopied] = useState(false)
  // One-shot: recording every tab click would be one POST per click.
  const cellsSeen = useRef(false)

  // Absent fields behave as before, so existing artifacts are unaffected.
  const outputFormat = artifact.outputFormat ?? 'markdown'
  const formulaMode = artifact.formulaMode ?? 'silent'
  const wantsCells = outputFormat !== 'markdown'

  const convert = async (file?: File) => {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await convertDocument(file, { outputFormat, formulaMode })
      setResult(res)
      const cells = res.excel?.cells ?? res.cells
      const startTab: Tab = outputFormat === 'cells' && cells?.applicable ? 'cells' : 'markdown'
      setTab(startTab)
      cellsSeen.current = startTab === 'cells'
      setMarkdown(res.kind === 'excel' ? res.excel!.markdown : res.markdown ?? '')
      setCopied(false)
      record(artifact.id, {
        type: 'docconvert',
        converted: true,
        outputFormat,
        formulaMode,
        applicable: cells?.applicable ?? null,
        sheetCount: cells?.sheets?.length ?? null,
        cellCount: cells?.sheets?.reduce((n, s) => n + s.cells, 0) ?? null,
        truncated: cells?.truncated ?? null,
        paneViewed: startTab,
      })
      if (artifact.tracked !== false) markComplete(artifact.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const isExcel = result?.kind === 'excel'
  const cells = result?.excel?.cells ?? result?.cells
  const tabs: Tab[] = [
    ...(outputFormat === 'cells' && cells?.applicable ? [] : (['markdown'] as Tab[])),
    ...(wantsCells && cells?.applicable ? (['cells'] as Tab[]) : []),
    ...(isExcel ? (['analysis'] as Tab[]) : []),
  ]

  const openTab = (k: Tab) => {
    setTab(k)
    // Whether learners actually look at the cell format is the question this block
    // exists to answer — record it once, the first time they do.
    if (k === 'cells' && !cellsSeen.current) {
      cellsSeen.current = true
      record(artifact.id, { type: 'docconvert', converted: true, outputFormat, formulaMode, paneViewed: 'cells' })
    }
  }

  const copyAll = async () => {
    try {
      // Copy the raw serialization, not the rendered DOM.
      await navigator.clipboard.writeText(tab === 'cells' ? cells?.text ?? '' : markdown)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

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
              {tabs.length > 1 && (
                <div className="flex gap-1">
                  {tabs.map((k) => (
                    <button key={k} type="button" onClick={() => openTab(k)}
                      className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${tab === k ? 'bg-navy text-white' : 'text-slate-500 hover:text-navy'}`}>
                      {t.tab[k]}
                    </button>
                  ))}
                </div>
              )}
              {tab !== 'analysis' && (
                <button type="button" onClick={copyAll} className="ml-auto text-xs font-medium text-slate-500 hover:text-navy">
                  {copied ? t.copied : t.copyAll}
                </button>
              )}
            </div>

            {/* Markdown tab (documents + excel) — same editor as the text block. */}
            {tab === 'markdown' && <MarkdownEditor value={markdown} onChange={setMarkdown} />}

            {/* Cells requested but the file has no table structure — explain, never fail. */}
            {tab === 'markdown' && wantsCells && cells && !cells.applicable && (
              <p className="mt-2 rounded-md border border-mist bg-cream px-3 py-2 text-xs text-slate-600">
                {cells.message ?? t.cellsNotApplicable}
              </p>
            )}

            {/* Cells tab — raw, monospace, horizontally scrollable. Not highlighted: the
                point is that it is plain inspectable text. */}
            {tab === 'cells' && cells?.applicable && (
              <div className="rounded-md border border-mist p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-cream px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-kicker text-slate-500">
                    {t.formulaModeLabel(cells.formulaMode ?? formulaMode)}
                  </span>
                  {cells.truncated && <span className="text-[11px] text-amber-700">{t.cellsTruncated}</span>}
                  {(cells.warnings ?? []).map((w) => (
                    <span key={w} className="text-[11px] text-amber-700">{w}</span>
                  ))}
                </div>
                <pre className="max-h-96 overflow-auto rounded bg-navy/95 px-2 py-1.5 font-mono text-[11px] text-cream whitespace-pre">
                  {cells.text}
                </pre>
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
