import { marked } from 'marked'

// Compact, safe Markdown for chat answers. The caller has already stripped all
// raw HTML tags, so the only markup here comes from Markdown syntax (lists,
// bold, links…). As defence in depth we still drop images and neutralise any
// non-http(s)/mailto link targets (e.g. `javascript:`), since answers may echo
// untrusted web content.
marked.use({ gfm: true, breaks: true })

export function mdToHtml(src: string): string {
  let html = marked.parse(src, { async: false }) as string
  html = html.replace(/<img[^>]*>/gi, '')
  html = html.replace(/\shref="(?!https?:|mailto:|\/|#)[^"]*"/gi, ' href="#"')
  return html
}
