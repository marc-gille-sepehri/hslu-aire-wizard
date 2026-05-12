import type { BulletsArtifact } from '../../schema/types'
import { useInline } from '../../lib/inlineMedia'

export default function Bullets({ artifact }: { artifact: BulletsArtifact }) {
  const inline = useInline()
  return (
    <div className="font-serif text-slate-800 leading-relaxed">
      {artifact.title && <h3 className="font-sans text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">{artifact.title}</h3>}
      <ul className="list-disc pl-6 space-y-2">
        {artifact.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>
    </div>
  )
}
