import { Fragment, type ReactNode } from 'react'
import { useResources } from '../state/ResourcesContext'
import { labels } from '../labels'
import Media from '../components/artifacts/Media'

// Substitutes [[media:id]] with a Media render, and **bold** with <strong>.
// Order of operations: split on [[media:id]] first; within text segments, run **bold**.
const MEDIA_RE = /\[\[media:([a-zA-Z0-9_\-]+)\]\]/g
const BOLD_RE = /\*\*([^*]+)\*\*/g

export function renderInline(text: string, resources: Record<string, unknown>): ReactNode {
  const out: ReactNode[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  let i = 0
  MEDIA_RE.lastIndex = 0
  while ((m = MEDIA_RE.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push(<Fragment key={`t-${i++}`}>{renderBold(text.slice(lastIndex, m.index))}</Fragment>)
    }
    const id = m[1]
    if (resources[id]) {
      out.push(<Media key={`m-${i++}`} ref_={id} />)
    } else {
      console.warn(`[training] inline media reference missing: ${id}`)
      out.push(
        <span key={`m-${i++}`} className="inline-block text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
          {labels.missingResource(id)}
        </span>
      )
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    out.push(<Fragment key={`t-${i++}`}>{renderBold(text.slice(lastIndex))}</Fragment>)
  }
  return <>{out}</>
}

function renderBold(text: string): ReactNode {
  const out: ReactNode[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null
  let i = 0
  BOLD_RE.lastIndex = 0
  while ((m = BOLD_RE.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push(<Fragment key={`b-t-${i++}`}>{text.slice(lastIndex, m.index)}</Fragment>)
    }
    out.push(<strong key={`b-${i++}`}>{m[1]}</strong>)
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    out.push(<Fragment key={`b-t-${i++}`}>{text.slice(lastIndex)}</Fragment>)
  }
  return <>{out}</>
}

// Hook variant when the consumer is already inside a component.
export function useInline() {
  const resources = useResources()
  return (text: string) => renderInline(text, resources)
}
