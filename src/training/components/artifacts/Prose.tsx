import type { ProseArtifact } from '../../schema/types'
import { Markdown } from '../../lib/markdown'

export default function Prose({ artifact }: { artifact: ProseArtifact }) {
  return (
    <div className="font-serif text-[1.05rem] text-slate-800 leading-relaxed">
      <Markdown text={artifact.body} />
    </div>
  )
}
