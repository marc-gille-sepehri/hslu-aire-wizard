import type { MediaArtifact } from '../../schema/types'
import { InlineMarkdown } from '../../lib/inlineMarkdown'
import { useResource } from '../../state/ResourcesContext'
import { useEditMode } from '../../editor/EditModeContext'
import { detectMedia } from '../../lib/media'
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
    return <UrlMedia url={url.trim()} caption={caption} />
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
function UrlMedia({ url, caption }: { url: string; caption?: string }) {
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

function EmptyPlaceholder() {
  return (
    <div className="my-2 rounded-md border border-dashed border-mist bg-cream/40 px-3 py-6 text-center text-sm text-slate-400">
      {labels.editor.mediaEmpty}
    </div>
  )
}
