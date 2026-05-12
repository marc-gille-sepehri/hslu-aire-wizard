import type { Section } from '../schema/types'
import { artifactComponents } from './artifacts'
import { labels } from '../labels'

export default function SectionView({ section }: { section: Section }) {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h2 className="font-sans text-2xl font-bold text-slate-800">{section.title}</h2>
        {section.objectives && section.objectives.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-sans text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{labels.objectives}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {section.objectives.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
      </header>
      <div className="space-y-8">
        {section.artifacts.map((artifact) => {
          const Comp = artifactComponents[artifact.type]
          if (!Comp) {
            console.warn(`[training] no renderer for artifact type: ${(artifact as any).type}`)
            return null
          }
          return <Comp key={artifact.id} artifact={artifact as any} />
        })}
      </div>
    </section>
  )
}
