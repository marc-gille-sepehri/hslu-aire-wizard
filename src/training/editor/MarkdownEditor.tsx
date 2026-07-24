import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Markdown } from '../lib/markdown'
import { labels } from '../labels'

const t = labels.editor

type Tab = 'edit' | 'preview'

/** A pending selection to restore after the controlled value updates. */
type PendingSel = { start: number; end: number } | null

interface EditResult {
  value: string
  start: number
  end: number
}

/** Wrap the selection (or a placeholder) with markers, e.g. **bold**. */
function wrap(value: string, s: number, e: number, before: string, after: string, placeholder: string): EditResult {
  const selected = value.slice(s, e) || placeholder
  const value2 = value.slice(0, s) + before + selected + after + value.slice(e)
  const start = s + before.length
  return { value: value2, start, end: start + selected.length }
}

/** Prefix every line spanning the selection, e.g. "## " or "- ". */
function linePrefix(value: string, s: number, e: number, prefix: string): EditResult {
  const lineStart = value.lastIndexOf('\n', s - 1) + 1
  const head = value.slice(0, lineStart)
  const body = value.slice(lineStart, e)
  const tail = value.slice(e)
  const prefixed = body
    .split('\n')
    .map((l) => prefix + l)
    .join('\n')
  return { value: head + prefixed + tail, start: lineStart, end: (head + prefixed).length }
}

/** Insert a link, placing the caret inside the URL. */
function link(value: string, s: number, e: number): EditResult {
  const label = value.slice(s, e) || 'Linktext'
  const url = 'https://'
  const snippet = `[${label}](${url})`
  const value2 = value.slice(0, s) + snippet + value.slice(e)
  const urlStart = s + label.length + 3 // after "](".length? -> "[label](" = 1+label+2
  return { value: value2, start: urlStart, end: urlStart + url.length }
}

/** Insert an inline media token, selecting the id for quick replacement. */
function media(value: string, s: number, e: number): EditResult {
  const before = '[[media:'
  const idPlaceholder = value.slice(s, e) || 'ref'
  const snippet = `${before}${idPlaceholder}]]`
  const value2 = value.slice(0, s) + snippet + value.slice(e)
  const start = s + before.length
  return { value: value2, start, end: start + idPlaceholder.length }
}

interface ToolItem {
  key: string
  title: string
  render: ReactNode
  apply: (value: string, s: number, e: number) => EditResult
}

const TOOLBAR: ToolItem[] = [
  { key: 'h1', title: t.mdH1, render: <span className="text-xs font-bold">H1</span>, apply: (v, s, e) => linePrefix(v, s, e, '# ') },
  { key: 'h2', title: t.mdH2, render: <span className="text-xs font-bold">H2</span>, apply: (v, s, e) => linePrefix(v, s, e, '## ') },
  { key: 'h3', title: t.mdH3, render: <span className="text-xs font-bold">H3</span>, apply: (v, s, e) => linePrefix(v, s, e, '### ') },
  { key: 'bold', title: t.mdBold, render: <span className="text-sm font-bold">B</span>, apply: (v, s, e) => wrap(v, s, e, '**', '**', 'Text') },
  { key: 'italic', title: t.mdItalic, render: <span className="text-sm italic">I</span>, apply: (v, s, e) => wrap(v, s, e, '*', '*', 'Text') },
  { key: 'ul', title: t.mdUl, render: <span className="text-sm">•</span>, apply: (v, s, e) => linePrefix(v, s, e, '- ') },
  { key: 'ol', title: t.mdOl, render: <span className="text-xs font-semibold">1.</span>, apply: (v, s, e) => linePrefix(v, s, e, '1. ') },
  { key: 'quote', title: t.mdQuote, render: <span className="text-sm">❝</span>, apply: (v, s, e) => linePrefix(v, s, e, '> ') },
  { key: 'code', title: t.mdCode, render: <span className="font-mono text-xs">{'</>'}</span>, apply: (v, s, e) => wrap(v, s, e, '`', '`', 'Code') },
  { key: 'link', title: t.mdLink, render: <span className="text-sm">🔗</span>, apply: (v, s, e) => link(v, s, e) },
  { key: 'media', title: t.mdMedia, render: <span className="text-sm">🖼️</span>, apply: (v, s, e) => media(v, s, e) },
]

export default function MarkdownEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [tab, setTab] = useState<Tab>('edit')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const pendingSel = useRef<PendingSel>(null)

  // Restore caret/selection after a toolbar edit re-renders the controlled value.
  useLayoutEffect(() => {
    if (pendingSel.current && taRef.current) {
      const { start, end } = pendingSel.current
      taRef.current.focus()
      taRef.current.setSelectionRange(start, end)
      pendingSel.current = null
    }
  }, [value])

  const runTool = (item: ToolItem) => {
    const ta = taRef.current
    const s = ta ? ta.selectionStart : value.length
    const e = ta ? ta.selectionEnd : value.length
    const res = item.apply(value, s, e)
    pendingSel.current = { start: res.start, end: res.end }
    onChange(res.value)
  }

  return (
    <div className="rounded-md border border-mist">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-mist bg-cream px-2 py-1.5">
        {(['edit', 'preview'] as Tab[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded px-3 py-1 text-sm font-semibold transition-colors ${
              tab === k ? 'bg-navy text-white' : 'text-slate-500 hover:text-navy'
            }`}
          >
            {k === 'edit' ? t.mdEdit : t.mdPreview}
          </button>
        ))}
      </div>

      {tab === 'edit' ? (
        <div>
          {/* Insertion toolbar */}
          <div className="flex flex-wrap items-center gap-1 border-b border-mist px-2 py-1.5">
            {TOOLBAR.map((item) => (
              <button
                key={item.key}
                type="button"
                title={item.title}
                aria-label={item.title}
                onClick={() => runTool(item)}
                className="flex h-8 min-w-8 items-center justify-center rounded border border-mist bg-white px-2 text-navy transition-colors hover:border-navy hover:bg-cream"
              >
                {item.render}
              </button>
            ))}
          </div>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full resize-y bg-white px-3 py-2 font-mono text-sm leading-relaxed text-slate-800 outline-none"
          />
        </div>
      ) : (
        <div className="min-h-[12rem] px-4 py-3 font-serif text-[1.05rem] leading-relaxed text-slate-800">
          {value.trim() ? <Markdown text={value} /> : <p className="text-sm text-slate-400">{t.mdEmpty}</p>}
        </div>
      )}
    </div>
  )
}
