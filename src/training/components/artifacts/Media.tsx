import type { MediaArtifact } from '../../schema/types'
import { InlineMarkdown } from '../../lib/inlineMarkdown'
import { useResource } from '../../state/ResourcesContext'
import { useEditMode } from '../../editor/EditModeContext'
import { detectMedia, formatBytes } from '../../lib/media'
import { labels } from '../../labels'

// Used both as an artifact (with full props) and inline via [[media:id]]
// (with just a ref). The inline form uses `ref_` to avoid clashing with React's
// reserved `ref` prop.
type Props = { artifact: MediaArtifact } | { ref_: string; caption_override?: string | null }

export default function Media(props: Props) {
  const isArtifact = 'artifact' in props
  const ref = isArtifact ? props.artifact.ref : props.ref_
  const url = isArtifact ? props.artifact.url : undefined
  const captionOverride = isArtifact ? props.artifact.caption_override : props.caption_override
  // Always call hooks unconditionally (rules of hooks); '' resolves to undefined.
  const resource = useResource(ref ?? '')
  const { editing } = useEditMode()

  const caption = captionOverride === null ? undefined : captionOverride ?? undefined

  // A direct URL takes precedence over a library reference.
  if (url && url.trim()) {
    return (
      <UrlMedia
        url={url.trim()}
        caption={caption}
        filename={isArtifact ? props.artifact.filename : undefined}
        filesize={isArtifact ? props.artifact.filesize : undefined}
      />
    )
  }

  // No URL and no (valid) reference: nothing to show. In edit mode, surface a
  // placeholder so the admin can tell the empty block is there and editable.
  if (!ref) {
    return editing ? <EmptyPlaceholder /> : null
  }

  if (!resource) {
    console.warn(`[training] media artifact references missing resource: ${ref}`)
    return (
      <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
        {labels.missingResource(ref)}
      </div>
    )
  }

  const resCaption =
    captionOverride === null
      ? undefined
      : captionOverride ?? ('caption' in resource ? resource.caption : undefined)

  if (resource.kind === 'video') {
    return (
      <figure className="my-2">
        <video
          src={resource.src}
          poster={resource.poster}
          controls
          preload="metadata"
          className="w-full rounded-md bg-black"
        >
          {resource.captions && <track kind="captions" src={resource.captions} default />}
        </video>
        {resCaption && <figcaption className="text-sm text-slate-600 mt-2"><InlineMarkdown text={resCaption} className="md-caption" /></figcaption>}
      </figure>
    )
  }

  // image or diagram
  if (!resource.alt) {
    console.warn(`[training] resource '${ref}' is missing alt text`)
  }
  return (
    <figure className="my-2">
      <img
        src={resource.src}
        alt={resource.alt ?? ''}
        className="w-full rounded-md border border-slate-200"
        onError={(e) => {
          console.warn(`[training] failed to load resource '${ref}' at ${resource.src}`)
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
      {!resource.alt && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1 inline-block">
          {labels.missingAlt}
        </div>
      )}
      {resCaption && <figcaption className="text-sm text-slate-600 mt-2"><InlineMarkdown text={resCaption} className="md-caption" /></figcaption>}
    </figure>
  )
}

/** Render a direct media URL, classified by {@link detectMedia}. */
function UrlMedia({
  url,
  caption,
  filename,
  filesize,
}: {
  url: string
  caption?: string
  filename?: string
  filesize?: number
}) {
  const media = detectMedia(url)
  if (!media) return null

  if (media.kind === 'youtube' || media.kind === 'vimeo') {
    return (
      <figure className="my-2">
        <div className="relative w-full overflow-hidden rounded-md bg-black" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            src={media.embedUrl}
            title={caption ?? 'Video'}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        {caption && <figcaption className="text-sm text-slate-600 mt-2"><InlineMarkdown text={caption} className="md-caption" /></figcaption>}
      </figure>
    )
  }

  if (media.kind === 'video') {
    return (
      <figure className="my-2">
        <video src={media.src} controls preload="metadata" className="w-full rounded-md bg-black" />
        {/* Playable and takeable: a workshop video is often wanted offline. */}
        <DownloadLink url={media.src} filename={filename} filesize={filesize} />
        {caption && <figcaption className="text-sm text-slate-600 mt-2"><InlineMarkdown text={caption} className="md-caption" /></figcaption>}
      </figure>
    )
  }

  if (media.kind === 'file') {
    return (
      <figure className="my-2">
        <FileCard url={media.src} ext={media.ext} filename={filename} filesize={filesize} />
        {caption && <figcaption className="text-sm text-slate-600 mt-2"><InlineMarkdown text={caption} className="md-caption" /></figcaption>}
      </figure>
    )
  }

  // image or unknown → best-effort image
  return (
    <figure className="my-2">
      <img
        src={media.src}
        alt={caption ?? ''}
        className="w-full rounded-md border border-slate-200"
        onError={(e) => {
          console.warn(`[training] failed to load media url: ${media.src}`)
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
      {caption && <figcaption className="text-sm text-slate-600 mt-2"><InlineMarkdown text={caption} className="md-caption" /></figcaption>}
    </figure>
  )
}

/**
 * A file to take away rather than to watch. PDFs get a first-page preview —
 * browsers render them natively, so it costs an <iframe> and no library. Every
 * other type gets its extension as the icon: an honest label beats a generic
 * paperclip, and it is the thing people actually recognise.
 */
function FileCard({
  url,
  ext,
  filename,
  filesize,
}: {
  url: string
  ext: string
  filename?: string
  filesize?: number
}) {
  const name = filename || decodeURIComponent(url.split('/').pop()?.split('?')[0] || ext.toUpperCase())
  const size = formatBytes(filesize)
  return (
    <div className="overflow-hidden rounded-md border border-mist bg-white">
      {ext === 'pdf' && (
        <iframe
          src={`${url}#toolbar=0&navpanes=0&view=FitH`}
          title={name}
          loading="lazy"
          className="h-64 w-full border-0 bg-cream"
        />
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          aria-hidden="true"
          className={`shrink-0 rounded px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white ${extColor(ext)}`}
        >
          {ext}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy" title={name}>{name}</span>
          <span className="block text-xs text-slate-500">
            {ext.toUpperCase()}
            {size ? ` · ${size}` : ''}
          </span>
        </span>
        <a
          href={url}
          download={name}
          className="shrink-0 rounded-md border-2 border-navy px-3 py-1.5 text-xs font-semibold text-navy no-underline transition-colors hover:bg-navy hover:text-white"
        >
          {labels.media.download}
        </a>
      </div>
    </div>
  )
}

/** Colour by family, so a spreadsheet does not look like an archive. */
function extColor(ext: string): string {
  if (ext === 'pdf') return 'bg-red-600'
  if (/^(xlsx?|xlsm|csv|ods)$/.test(ext)) return 'bg-emerald-600'
  if (/^(docx?|odt|rtf|txt|md)$/.test(ext)) return 'bg-indigo-600'
  if (/^(pptx?|odp)$/.test(ext)) return 'bg-amber-600'
  if (/^(zip|rar|7z)$/.test(ext)) return 'bg-slate-500'
  return 'bg-slate-500'
}

function DownloadLink({ url, filename, filesize }: { url: string; filename?: string; filesize?: number }) {
  const size = formatBytes(filesize)
  return (
    <a
      href={url}
      download={filename || undefined}
      className="mt-1 inline-block text-xs text-slate-500 no-underline hover:text-navy"
    >
      ↓ {labels.media.download}
      {size ? ` (${size})` : ''}
    </a>
  )
}

function EmptyPlaceholder() {
  return (
    <div className="my-2 rounded-md border border-dashed border-mist bg-cream/40 px-3 py-6 text-center text-sm text-slate-400">
      {labels.editor.mediaEmpty}
    </div>
  )
}
