import { useNavigate } from 'react-router-dom'
import { labels } from '../labels'
import type { CourseProgress, ProgressSummary } from '../lib/courseProgress'

const t = labels.dashboard

/**
 * Learner progress at the top of the catalog (view mode only): a donut of
 * completed vs offered courses, a certificate count, and a clickable progress
 * bar per started course (the "switch between courses in progress" control).
 */
export default function ProgressDashboard({ summary }: { summary: ProgressSummary }) {
  return (
    <section className="mb-8 rounded-2xl border border-mist bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
        <DonutStat completed={summary.completedCount} offered={summary.offeredCount} />
        <CertStat value={summary.certificates} />
      </div>

      <div className="mt-6 border-t border-mist pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-kicker text-slate-400">{t.inProgressHeading}</p>
        {summary.startedCourses.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t.noStarted}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {summary.startedCourses.map((c) => (
              <CourseBar key={c.id} course={c} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/** Progress ring: completed / offered courses. Single-hue magnitude (gold on mist). */
function DonutStat({ completed, offered }: { completed: number; offered: number }) {
  const size = 128
  const stroke = 14
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const frac = offered > 0 ? completed / offered : 0

  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${completed} von ${offered} Kursen abgeschlossen`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: 'var(--aire-mist, #e4e9f2)' }} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            style={{ stroke: 'var(--aire-gold, #f2a93b)' }}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - frac)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-2xl font-bold text-navy tabular-nums">{completed}</span>
          <span className="mt-0.5 text-xs text-slate-400 tabular-nums">/ {offered}</span>
        </div>
      </div>
      <div className="max-w-[8rem]">
        <p className="text-sm font-semibold text-navy leading-snug">{t.completedCourses}</p>
        <p className="mt-0.5 text-xs text-slate-500">{t.ofCourses(completed, offered)}</p>
      </div>
    </div>
  )
}

/** Certificate count: big number, small certificate icon, label. */
function CertStat({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center px-2">
      <span className="text-4xl font-bold text-navy tabular-nums leading-none">{value}</span>
      <CertificateIcon className="mt-2 h-6 w-6 text-gold" />
      <p className="mt-1 text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.certificates}</p>
    </div>
  )
}

function CourseBar({ course }: { course: CourseProgress }) {
  const navigate = useNavigate()
  const go = () => {
    if (course.firstModuleId) navigate(`/training/${course.id}/${course.firstModuleId}`)
  }
  return (
    <button type="button" onClick={go} className="group block w-full text-left" aria-label={`${course.title}: ${course.pct}%`}>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-navy group-hover:underline">{course.title}</span>
        <span className="flex shrink-0 items-center gap-1.5 tabular-nums text-slate-500">
          {course.completed && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">{t.completedTag}</span>
          )}
          {course.pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--aire-mist, #e4e9f2)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${course.pct}%`, background: course.completed ? '#10b981' : 'var(--aire-gold, #f2a93b)' }}
        />
      </div>
    </button>
  )
}

function CertificateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="9" r="6" />
      <path d="M9 14.5 7.5 22l4.5-2.5L16.5 22 15 14.5" />
      <path d="m9.5 9 1.7 1.7L14.5 7.3" />
    </svg>
  )
}
