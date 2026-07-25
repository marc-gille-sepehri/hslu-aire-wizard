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
  const [dialogOpen, setDialogOpen] = useState(false)

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
          onClick={() => setDialogOpen(true)}
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
              </tr>
            ))}
            {instances && instances.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  {t.noInstances}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <InstanceDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            setDialogOpen(false)
            reload()
          }}
        />
      )}
    </div>
  )
}
