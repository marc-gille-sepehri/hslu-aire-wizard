import type { MediaArtifact } from '../../schema/types'
import { useResource } from '../../state/ResourcesContext'
import { labels } from '../../labels'

// Used both as an artifact (with full props) and inline via [[media:id]]
// (with just a ref). The inline form uses `ref_` to avoid clashing with React's
// reserved `ref` prop.
type Props = { artifact: MediaArtifact } | { ref_: string; caption_override?: string | null }

export default function Media(props: Props) {
  const ref = 'artifact' in props ? props.artifact.ref : props.ref_
  const captionOverride =
    'artifact' in props ? props.artifact.caption_override : props.caption_override
  const resource = useResource(ref)

  if (!resource) {
    console.warn(`[training] media artifact references missing resource: ${ref}`)
    return (
      <div className="rounded-md border border-dashed border-amber-400 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
        {labels.missingResource(ref)}
      </div>
    )
  }

  const caption =
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
        {caption && <figcaption className="text-sm text-slate-600 mt-2">{caption}</figcaption>}
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
      {caption && <figcaption className="text-sm text-slate-600 mt-2">{caption}</figcaption>}
    </figure>
  )
}
