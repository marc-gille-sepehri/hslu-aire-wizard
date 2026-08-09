import { Marked } from 'marked'

// Inline markdown for short labels — media captions above all. Deliberately its
// own module: markdown.tsx imports Media, and Media needs this, so putting it
// there would close an import cycle.
//
// `parseInline` emits no <p>, so the result drops straight into a <figcaption>
// and keeps that element's typography. Same trust model as Prose: authors are
// Administrators, so raw HTML is not sanitized.
const inline = new Marked({ gfm: true })

export function InlineMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: inline.parseInline(text) as string }}
    />
  )
}
