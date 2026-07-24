import { Fragment, type ReactNode } from 'react'
import { marked } from 'marked'
import Media from '../components/artifacts/Media'
import { useResources } from '../state/ResourcesContext'
import { labels } from '../labels'

// Renders the training prose markdown subset. Standard Markdown via `marked`
// (headings, bold, italic, lists, links, quote, code) PLUS the custom
// [[media:id]] token, which embeds a resource. Both the Prose block and the
// editor preview use this component, so what an author sees is what learners get.
//
// Content is authored by Administrators (a trusted role that can already edit the
// module JSON), so raw HTML is not sanitized here.

marked.use({ gfm: true, breaks: true })

const MEDIA_RE = /\[\[media:([a-zA-Z0-9_\-]+)\]\]/g

/** Split on [[media:id]] and render markdown text segments interleaved with media. */
export function Markdown({ text }: { text: string }): ReactNode {
  const resources = useResources()
  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0
  let m: RegExpExecArray | null
  MEDIA_RE.lastIndex = 0

  const pushText = (raw: string) => {
    if (!raw.trim()) return
    const html = marked.parse(raw) as string
    parts.push(
      <div key={`md-${key++}`} className="md-content" dangerouslySetInnerHTML={{ __html: html }} />,
    )
  }

  while ((m = MEDIA_RE.exec(text)) !== null) {
    if (m.index > lastIndex) pushText(text.slice(lastIndex, m.index))
    const id = m[1]
    if (resources[id]) {
      parts.push(<Media key={`media-${key++}`} ref_={id} />)
    } else {
      console.warn(`[training] inline media reference missing: ${id}`)
      parts.push(
        <span
          key={`media-${key++}`}
          className="inline-block text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5"
        >
          {labels.missingResource(id)}
        </span>,
      )
    }
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) pushText(text.slice(lastIndex))

  return <Fragment>{parts}</Fragment>
}
