// Rendering of a server-computed module diff (module-revision spec §6.2/§6.3).
//
// Unchanged sections collapse to one line, changed artifacts are open by
// default, and a move is an arrow with the position delta rather than a
// remove+add pair — the point is to make "what did this change actually do"
// answerable at a glance.
import { useState } from 'react'
import { labels } from '../labels'
import type { ArtifactDiff, ChangeStatus, ModuleDiff, SectionDiff, WordDiffPart } from '../lib/revisionApi'

const STATUS_STYLE: Record<ChangeStatus, string> = {
  added: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  removed: 'bg-red-50 text-red-800 border-red-200',
  moved: 'bg-amber-50 text-amber-800 border-amber-200',
  changed: 'bg-sky-50 text-sky-800 border-sky-200',
  unchanged: 'bg-slate-50 text-slate-500 border-slate-200',
}

const STATUS_LABEL: Record<ChangeStatus, string> = {
  added: labels.history.diffAdded,
  removed: labels.history.diffRemoved,
  moved: labels.history.diffMoved,
  changed: labels.history.diffChanged,
  unchanged: '',
}

function StatusBadge({ status }: { status: ChangeStatus }) {
  if (status === 'unchanged') return null
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function WordDiff({ parts }: { parts: WordDiffPart[] }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {parts.map((p, i) =>
        p.op === 'same' ? (
          <span key={i} className="text-slate-700">{p.text}</span>
        ) : p.op === 'add' ? (
          <ins key={i} className="bg-emerald-100 text-emerald-900 no-underline">{p.text}</ins>
        ) : (
          <del key={i} className="bg-red-100 text-red-900">{p.text}</del>
        ),
      )}
    </p>
  )
}

function shortValue(v: unknown): string {
  if (v === undefined) return '—'
  if (typeof v === 'string') return v.length > 200 ? `${v.slice(0, 200)}…` : v
  return JSON.stringify(v, null, 1)?.slice(0, 300) ?? '—'
}

function ArtifactRow({ a }: { a: ArtifactDiff }) {
  return (
    <li className="rounded border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={a.status} />
        <code className="text-xs text-slate-500">{a.type ?? '?'}</code>
        <code className="text-xs text-slate-400">{a.id}</code>
        {a.moved && (
          <span className="text-xs text-amber-800">
            ↕ {labels.history.diffMovedBy(a.moved.from, a.moved.to)}
          </span>
        )}
      </div>
      {a.fields && a.fields.length > 0 && (
        <dl className="mt-2 space-y-2">
          {a.fields.map((f) => (
            <div key={f.field}>
              <dt className="text-xs font-semibold text-slate-600">{f.field}</dt>
              <dd className="mt-1">
                {f.words ? (
                  <WordDiff parts={f.words} />
                ) : (
                  // Two columns for values we cannot diff word-by-word.
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded bg-red-50 p-2">
                      <div className="text-[10px] uppercase tracking-wide text-red-700">{labels.history.diffBefore}</div>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-red-900">{shortValue(f.from)}</pre>
                    </div>
                    <div className="rounded bg-emerald-50 p-2">
                      <div className="text-[10px] uppercase tracking-wide text-emerald-700">{labels.history.diffAfter}</div>
                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-emerald-900">{shortValue(f.to)}</pre>
                    </div>
                  </div>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

function SectionBlock({ s }: { s: SectionDiff }) {
  const [open, setOpen] = useState(s.status !== 'unchanged')
  const hasDetail = s.artifacts.length > 0 || s.titleChanged || s.objectivesChanged

  return (
    <section className="rounded-md border border-slate-200">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((v) => !v)}
        className={`flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left ${hasDetail ? 'hover:bg-slate-50' : 'cursor-default'}`}
      >
        <StatusBadge status={s.status} />
        <span className="text-sm font-semibold text-slate-800">{s.title || s.id}</span>
        {s.moved && (
          <span className="text-xs text-amber-800">↕ {labels.history.diffMovedBy(s.moved.from, s.moved.to)}</span>
        )}
        {s.status === 'unchanged' && s.unchangedArtifactCount > 0 && (
          <span className="text-xs text-slate-500">
            {labels.history.diffUnchangedArtifacts(s.unchangedArtifactCount)}
          </span>
        )}
        {hasDetail && (
          <span className="ml-auto text-xs text-slate-400">
            {open ? labels.history.diffCollapse : labels.history.diffExpand}
          </span>
        )}
      </button>

      {open && hasDetail && (
        <div className="space-y-3 border-t border-slate-100 px-3 py-3">
          {s.titleChanged && (
            <div className="text-sm">
              <span className="text-xs font-semibold text-slate-600">Titel</span>
              <WordDiff parts={[{ op: 'remove', text: s.titleChanged.from }, { op: 'same', text: ' → ' }, { op: 'add', text: s.titleChanged.to }]} />
            </div>
          )}
          {s.objectivesChanged && (
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded bg-red-50 p-2 text-red-900">{(s.objectivesChanged.from ?? []).join(' · ') || '—'}</div>
              <div className="rounded bg-emerald-50 p-2 text-emerald-900">{(s.objectivesChanged.to ?? []).join(' · ') || '—'}</div>
            </div>
          )}
          {s.artifacts.length > 0 && (
            <ul className="space-y-2 list-none">
              {s.artifacts.map((a) => (
                <ArtifactRow key={`${a.id}-${a.status}`} a={a} />
              ))}
            </ul>
          )}
          {s.unchangedArtifactCount > 0 && (
            <p className="text-xs text-slate-500">
              {labels.history.diffUnchangedArtifacts(s.unchangedArtifactCount)}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

export default function RevisionDiff({ diff }: { diff: ModuleDiff }) {
  const s = diff.summary
  return (
    <div className="space-y-3">
      <header className="space-y-1">
        <h3 className="text-sm font-semibold text-navy">{labels.history.diffTitle(diff.fromRev, diff.toRev)}</h3>
        {s.unchanged ? (
          <p className="text-sm text-slate-500">{labels.history.diffUnchanged}</p>
        ) : (
          <p className="text-xs text-slate-600">
            {[
              s.sectionsAdded && `+${s.sectionsAdded} Abschnitte`,
              s.sectionsRemoved && `−${s.sectionsRemoved} Abschnitte`,
              s.sectionsMoved && `${s.sectionsMoved} verschoben`,
              s.artifactsAdded && `+${s.artifactsAdded} Artefakte`,
              s.artifactsRemoved && `−${s.artifactsRemoved} Artefakte`,
              s.artifactsChanged && `${s.artifactsChanged} geändert`,
              s.artifactsMoved && `${s.artifactsMoved} Artefakte verschoben`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </header>
      {diff.titleChanged && (
        <div className="rounded border border-sky-200 bg-sky-50 p-2 text-xs text-sky-900">
          Modultitel: <del className="text-red-800">{diff.titleChanged.from}</del> → <ins className="no-underline text-emerald-800">{diff.titleChanged.to}</ins>
        </div>
      )}
      {diff.sections.map((sec) => (
        <SectionBlock key={sec.id} s={sec} />
      ))}
    </div>
  )
}
