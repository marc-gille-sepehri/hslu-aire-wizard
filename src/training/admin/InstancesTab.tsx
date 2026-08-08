import { useCallback, useEffect, useState } from 'react'
import { labels } from '../labels'
import { listCourseInstances, type CourseInstance, type InstancePerson } from './adminApi'
import InstanceDialog from './InstanceDialog'

const t = labels.adminInstances

/** Format an ISO date as a Swiss short date (dd.mm.yyyy). */
function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * mailto: for one instance, addressed to every participant.
 *
 * The addresses go in BCC, not To: a course cohort is not automatically a group
 * that has agreed to see each other's addresses, and one visible To: line hands
 * every address to everyone. The subject is prefilled with the course title.
 * Addresses are left unencoded — they are plain addr-specs and every client
 * takes them as-is; only the subject needs escaping.
 */
function mailtoAll(i: CourseInstance): string {
  const bcc = i.participants.map((p) => p.email).filter(Boolean).join(',')
  const subject = i.courseTitle ? `&subject=${encodeURIComponent(i.courseTitle)}` : ''
  return `mailto:?bcc=${bcc}${subject}`
}

/**
 * Matches the stroke style of the pencil next to it.
 *
 * The body is a path, not a <rect>: src/index.css hides `svg rect[width][height]`
 * globally to kill background rectangles, with hand-maintained exemptions for
 * ApexCharts and bpmn.io. An icon should not need a third exemption.
 */
function EnvelopeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="m3 7.5 9 5.5 9-5.5" />
    </svg>
  )
}

/** Comma-separated people names, with the count when there are several. */
function People({ people }: { people: InstancePerson[] }) {
  if (people.length === 0) return <span className="text-slate-400">—</span>
  return (
    <span className="text-slate-600" title={people.map((p) => p.email).join(', ')}>
      {people.map((p) => p.name).join(', ')}
    </span>
  )
}

/** Kurs Durchführung tab: table of all course instances with trainers, participants and start date. */
export default function InstancesTab() {
  const [instances, setInstances] = useState<CourseInstance[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // null = closed; { instance: null } = create; { instance } = edit.
  const [dialog, setDialog] = useState<{ instance: CourseInstance | null } | null>(null)

  const reload = useCallback(() => {
    listCourseInstances()
      .then(setInstances)
      .catch((e) => setError((e as Error).message || t.loadError))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-navy">{t.heading}</h2>
        <button
          type="button"
          onClick={() => setDialog({ instance: null })}
          className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
        >
          {t.add}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-mist">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-cream text-xs uppercase tracking-kicker text-slate-500">
              <th className="px-4 py-3 font-semibold">{t.colCourse}</th>
              <th className="px-4 py-3 font-semibold">{t.colTrainers}</th>
              <th className="px-4 py-3 font-semibold">{t.colParticipants}</th>
              <th className="px-4 py-3 font-semibold">{t.colStart}</th>
              <th className="px-4 py-3 text-right font-semibold">
                <span className="sr-only">{t.colActions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {instances?.map((i) => (
              <tr key={i.id} className="border-t border-mist align-top">
                <td className="px-4 py-3 font-medium text-navy">
                  {i.courseTitle ?? '—'}
                  {i.courseVersion != null && (
                    <span className="ml-1 text-xs font-normal text-slate-400">· {t.version(i.courseVersion)}</span>
                  )}
                </td>
                <td className="px-4 py-3"><People people={i.trainers} /></td>
                <td className="px-4 py-3"><People people={i.participants} /></td>
                <td className="px-4 py-3 text-slate-600">{fmtDate(i.startDate)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setDialog({ instance: i })}
                      aria-label={t.edit}
                      title={t.edit}
                      className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-cream hover:text-navy"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                    {i.participants.length > 0 ? (
                      <a
                        href={mailtoAll(i)}
                        aria-label={t.mail}
                        title={`${t.mail} (${t.mailBccHint})`}
                        className="inline-flex rounded-md p-1.5 text-slate-400 transition-colors hover:bg-cream hover:text-navy"
                      >
                        <EnvelopeIcon />
                      </a>
                    ) : (
                      <span
                        aria-hidden="true"
                        title={t.mailNoParticipants}
                        className="inline-flex cursor-not-allowed rounded-md p-1.5 text-slate-200"
                      >
                        <EnvelopeIcon />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {instances && instances.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                  {t.noInstances}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialog && (
        <InstanceDialog
          instance={dialog.instance}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            reload()
          }}
        />
      )}
    </div>
  )
}
