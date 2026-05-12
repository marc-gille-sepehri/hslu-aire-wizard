import type { CalloutArtifact } from '../../schema/types'
import { useInline } from '../../lib/inlineMedia'

const VARIANTS = {
  note:    { icon: 'ℹ️', container: 'border-slate-300 bg-slate-50 text-slate-800' },
  insight: { icon: '💡', container: 'border-indigo-300 bg-indigo-50 text-indigo-900' },
  warning: { icon: '⚠️', container: 'border-amber-300 bg-amber-50 text-amber-900' },
  example: { icon: '📋', container: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
} as const

export default function Callout({ artifact }: { artifact: CalloutArtifact }) {
  const inline = useInline()
  const v = VARIANTS[artifact.variant]
  return (
    <div className={`rounded-md border p-4 flex gap-3 ${v.container}`}>
      <span aria-hidden className="text-xl leading-none mt-0.5">{v.icon}</span>
      <div className="font-serif leading-relaxed space-y-3 flex-1">
        {artifact.body.split(/\n\n+/).map((p, i) => (
          <p key={i}>{inline(p)}</p>
        ))}
      </div>
    </div>
  )
}
