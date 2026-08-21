// Left column: the folders and the mailbox, clickable, plus the document view
// that "Woher kommt das?" points into.
//
// The learner must be able to read every document the agent can read. That is
// the whole exercise — "would I have noticed this" is not a question you can
// ask someone who was never shown the page.

import { useEffect, useRef } from 'react'
import type { Influence, LoadedScenario } from './agentApi'

export interface Focus {
  path: string
  span?: [number, number]
  /** False when the model named a source it could not verify — say so (§6.3). */
  verified: boolean
}

interface Props {
  scenario: LoadedScenario | null
  focus: Focus | null
  onFocus: (focus: Focus | null) => void
  /** Paths the agent opened during the shown run — marked in the listing. */
  readPaths: Set<string>
}

const folderOf = (path: string): string => (path.includes('/') ? path.split('/')[0] : '/')

export default function SourcePane({ scenario, focus, onFocus, readPaths }: Props) {
  if (!scenario) {
    return (
      <div className="rounded-md border border-mist bg-white p-4">
        <p className="font-sans text-sm text-slate-500">
          Die Inhalte dieses Arbeitsbereichs sind abgelaufen. Lade ein Szenario, um wieder Dateien
          zu sehen.
        </p>
      </div>
    )
  }

  const open = focus ? findDocument(scenario, focus.path) : null

  if (open) {
    return (
      <DocumentView
        title={open.title}
        body={open.body}
        span={focus?.span}
        verified={focus?.verified ?? true}
        onBack={() => onFocus(null)}
      />
    )
  }

  const folders = new Map<string, LoadedScenario['files']>()
  for (const file of scenario.files) {
    const key = folderOf(file.path)
    folders.set(key, [...(folders.get(key) ?? []), file])
  }

  return (
    <div className="space-y-3">
      {[...folders.entries()].map(([folder, files]) => (
        <div key={folder} className="rounded-md border border-mist bg-white">
          <div className="border-b border-mist px-3 py-2 font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
            📁 {folder}
          </div>
          <ul className="divide-y divide-mist">
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => onFocus({ path: file.path, verified: true })}
                  className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors hover:bg-cream"
                >
                  <span className="min-w-0 flex-1 truncate font-sans text-sm text-slate-800">
                    {file.path.split('/').pop()}
                  </span>
                  {readPaths.has(file.path) && (
                    <span
                      title="Der Agent hat diese Datei in diesem Lauf gelesen"
                      className="shrink-0 font-sans text-xs text-navy"
                    >
                      👁
                    </span>
                  )}
                  <span className="shrink-0 font-sans text-xs text-slate-400">
                    {file.pages ? `${file.pages} S.` : `${Math.round(file.size / 100) / 10} kB`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="rounded-md border border-mist bg-white">
        <div className="border-b border-mist px-3 py-2 font-sans text-xs font-semibold uppercase tracking-kicker text-slate-500">
          ✉️ Posteingang
        </div>
        <ul className="divide-y divide-mist">
          {scenario.mailbox.map((mail) => (
            <li key={mail.id}>
              <button
                type="button"
                onClick={() => onFocus({ path: `posteingang/${mail.id}`, verified: true })}
                className="w-full px-3 py-2 text-left transition-colors hover:bg-cream"
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className={`min-w-0 flex-1 truncate font-sans text-sm ${
                      mail.unread ? 'font-semibold text-navy' : 'text-slate-800'
                    }`}
                  >
                    {mail.subject}
                  </span>
                  {readPaths.has(`posteingang/${mail.id}`) && (
                    <span className="shrink-0 font-sans text-xs text-navy">👁</span>
                  )}
                </div>
                <div className="truncate font-sans text-xs text-slate-500">{mail.from}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function findDocument(
  scenario: LoadedScenario,
  path: string,
): { title: string; body: string } | null {
  const file = scenario.files.find((f) => f.path === path)
  if (file) return { title: file.path, body: file.body }
  if (path.startsWith('posteingang/')) {
    const mail = scenario.mailbox.find((m) => `posteingang/${m.id}` === path)
    if (mail) {
      return {
        title: mail.subject,
        body: `Von: ${mail.from}\nBetreff: ${mail.subject}\nEingang: ${mail.receivedAt}\n\n${mail.body}`,
      }
    }
  }
  return null
}

function DocumentView({
  title,
  body,
  span,
  verified,
  onBack,
}: {
  title: string
  body: string
  span?: [number, number]
  verified: boolean
  onBack: () => void
}) {
  const markRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // 'instant': a global `html { scroll-behavior: smooth }` turns programmatic
    // scrolls into animations that get cancelled by the next render.
    markRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
  }, [title, span?.[0], span?.[1]])

  const highlighted = span && span[0] < span[1] && span[1] <= body.length

  return (
    <div className="rounded-md border border-mist bg-white">
      <div className="flex items-center gap-2 border-b border-mist px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded font-sans text-xs font-semibold text-navy hover:underline"
        >
          ← zurück
        </button>
        <span className="min-w-0 flex-1 truncate font-sans text-xs font-semibold text-slate-700">
          {title}
        </span>
      </div>

      {span && !verified && (
        <p className="border-b border-amber-200 bg-amber-50 px-3 py-2 font-sans text-xs text-amber-900">
          Der Agent hat sich auf dieses Dokument berufen, die genaue Stelle liess sich aber nicht
          überprüfen. Deshalb ist hier nichts markiert.
        </p>
      )}

      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap px-3 py-3 font-mono text-xs leading-relaxed text-slate-800">
        {highlighted ? (
          <>
            {body.slice(0, span![0])}
            <mark ref={markRef} className="rounded bg-amber-200 px-0.5 text-slate-900">
              {body.slice(span![0], span![1])}
            </mark>
            {body.slice(span![1])}
          </>
        ) : (
          body
        )}
      </pre>
    </div>
  )
}

/** Turns a step's attribution into the focus the pane understands. */
export function focusFromInfluence(influence: Influence): Focus {
  return { path: influence.path, span: influence.span, verified: influence.verified }
}
