import type { ProseArtifact } from '../../schema/types'
import { useInline } from '../../lib/inlineMedia'

export default function Prose({ artifact }: { artifact: ProseArtifact }) {
  const inline = useInline()
  const paragraphs = artifact.body.split(/\n\n+/)
  return (
    <div className="font-serif text-slate-800 leading-relaxed space-y-4">
      {paragraphs.map((p, i) => (
        <p key={i} className="text-[1.05rem]">
          {inline(p)}
        </p>
      ))}
    </div>
  )
}
