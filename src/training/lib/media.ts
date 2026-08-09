// Recognise the media type of a pasted URL so the Media block can render it
// correctly: an <img>, a <video>, or an embedded YouTube / Vimeo player.

export type DetectedMedia =
  | { kind: 'youtube'; embedUrl: string; id: string }
  | { kind: 'vimeo'; embedUrl: string; id: string }
  | { kind: 'video'; src: string }
  | { kind: 'image'; src: string }
  /** A file to hand out rather than to embed: PDF, spreadsheet, archive, … */
  | { kind: 'file'; src: string; ext: string }
  | { kind: 'unknown'; src: string }

const VIDEO_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)$/i
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)$/i
// Everything a browser will not embed usefully. Listed rather than inferred:
// an unknown extension stays `unknown` (and is tried as an image), because that
// is what extension-less CDN media usually is.
const FILE_EXT = /\.(pdf|xlsx?|xlsm|csv|docx?|pptx?|odt|ods|odp|zip|rar|7z|txt|rtf|json|xml|md)$/i

/**
 * Classify a media URL. Returns null for an empty/blank input. YouTube and Vimeo
 * links become embed URLs; file URLs are classified by extension; anything else
 * is `unknown` (rendered best-effort as an image, since most extension-less
 * media URLs are images served by a CDN).
 */
export function detectMedia(rawUrl: string): DetectedMedia | null {
  const url = (rawUrl ?? '').trim()
  if (!url) return null

  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})/i,
  )
  if (yt) return { kind: 'youtube', id: yt[1], embedUrl: `https://www.youtube.com/embed/${yt[1]}` }

  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (vm) return { kind: 'vimeo', id: vm[1], embedUrl: `https://player.vimeo.com/video/${vm[1]}` }

  const path = url.split(/[?#]/)[0]
  if (VIDEO_EXT.test(path)) return { kind: 'video', src: url }
  if (IMAGE_EXT.test(path)) return { kind: 'image', src: url }
  const file = path.match(FILE_EXT)
  if (file) return { kind: 'file', src: url, ext: file[1].toLowerCase() }

  return { kind: 'unknown', src: url }
}

/** Short human label for the detected type (German UI). */
export function mediaKindLabel(m: DetectedMedia | null): string {
  switch (m?.kind) {
    case 'youtube':
      return 'YouTube-Video'
    case 'vimeo':
      return 'Vimeo-Video'
    case 'video':
      return 'Video'
    case 'image':
      return 'Bild'
    case 'file':
      return `Datei (${m.ext.toUpperCase()})`
    case 'unknown':
      return 'Bild (angenommen)'
    default:
      return '—'
  }
}

/** Human size for a download label. Bytes are never the interesting number. */
export function formatBytes(bytes?: number): string | null {
  if (!bytes || bytes < 0) return null
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}
