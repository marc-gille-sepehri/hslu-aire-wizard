import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import '../styles.css'
import { labels } from '../labels'
import { useAuth } from '../auth/AuthContext'
import { Markdown } from '../lib/markdown'
import ItemForm, { type ItemSubmission } from './ItemForm'
import SeverityForm from './SeverityForm'
import { PROTOCOL_DRAFT, protocolFor } from './protocol'
import {
  EnforcementError,
  fetchItemForCorrection,
  fetchNextItem,
  fetchSampleItem,
  fetchSession,
  hasCoderAccess,
  postRating,
  postSubmit,
  type ItemContent,
  type ItemWithRating,
  type StudyMode,
  type OwnRating,
  type SampleItem,
  type StudyItem,
  type StudySession,
} from './enforcementApi'
import {
  acknowledgeProtocol,
  codedItems,
  protocolAcknowledgedAt,
  recordCodedItem,
  runKey,
  type CodedItemRef,
} from './localRun'

const t = labels.enforcement

// Kodieroberfläche der Enforcement-Signal-Studie (Spec 3). Genau zwei Ansichten
// tragen die Arbeit — ein Item mit Eingabe, und die Abschlussseite. Alles
// Weitere (Startseite, Korrekturliste) ist Rahmen und wird je einmal gesehen.
//
// Was hier bewusst fehlt: jede Aggregatanzeige über die Studie, jede Sortier-
// oder Gruppierfunktion, jede Vorschau auf kommende Items. Der Client hält immer
// nur das eine Item, das der Server liefert; die Randomisierung kann darum auch
// nicht durch die Oberfläche lecken.

/**
 * Route root. Reading is open to everyone, writing is not: only the coder role
 * or an Administrator gets a session, an assignment and a way to submit. Anyone
 * else — signed out or signed in without the role — sees the protocol and one
 * sample item, both read-only. That split mirrors the server, which serves the
 * public preview without a token and refuses to write without the role.
 */
export default function EnforcementSignalApp() {
  const { status, user } = useAuth()

  if (status === 'checking') {
    return <Shell><p className="text-slate-500">{labels.auth.checking}</p></Shell>
  }
  const canWrite = status === 'authenticated' && !!user && hasCoderAccess(user.roles)
  if (!canWrite) return <Shell><ReadOnlyView /></Shell>
  return <CodingSession email={user!.email} />
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="training-root es-scope font-sans">
      <div className="mx-auto max-w-[46rem] px-4 py-8">{children}</div>
    </div>
  )
}

/**
 * What everyone without write access sees: the protocol, and behind one click a
 * single sample item with the full instrument, inert. No session, no assignment,
 * no rating path — this branch never calls a write endpoint.
 */
function ReadOnlyView() {
  const [example, setExample] = useState(false)
  // Auch ohne Rolle wird die Sitzung geladen — nicht wegen des Fortschritts (den
  // gibt es hier nicht), sondern wegen des Modus. Ihn zu raten hiesse, im
  // Zweifel das falsche Protokoll zu zeigen, und das faellt niemandem auf.
  const [session, setSession] = useState<StudySession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchSession()
      .then(setSession)
      .catch((e) => setError(e instanceof EnforcementError && e.code === 'NO_OPEN_STUDY' ? t.noOpenStudy : t.loadError))
  }, [])

  useEffect(load, [load])

  if (error) return <ErrorBox message={error} onRetry={load} />
  if (!session) return <p className="text-slate-500">{t.loading}</p>
  return example ? (
    <ExamplePage onBack={() => setExample(false)} />
  ) : (
    <ProtocolPage mode={session.mode} itemsPerRun={session.itemsPerRater ?? session.totalItems} onExample={() => setExample(true)} />
  )
}

/** The notice the read-only branch leads with. Set off, not buried in prose. */
function ReadOnlyNotice({ compact = false }: { compact?: boolean }) {
  const r = t.readOnly
  return (
    <aside className="rounded-md border border-gold/60 border-l-4 border-l-gold bg-gold-soft px-5 py-4">
      <p className="font-display text-sm font-bold uppercase tracking-kicker text-navy">{r.heading}</p>
      {!compact && <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-800">{r.body}</p>}
      <p className="mt-2 text-sm text-slate-800">
        {r.loginHint}{' '}
        <Link to="/training" className="font-semibold text-navy underline underline-offset-2 hover:text-gold-dark">
          {r.login}
        </Link>
      </p>
    </aside>
  )
}

/** Read-only counterpart of IntroPage: same protocol, no acknowledgement. */
function ProtocolPage({ mode, itemsPerRun, onExample }: { mode?: StudyMode; itemsPerRun?: number | null; onExample: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-navy">{t.introHeading(mode)}</h1>

      <ReadOnlyNotice />

      {PROTOCOL_DRAFT && <DraftNotice />}

      <div className="max-w-prose">
        <Markdown text={protocolFor(mode, itemsPerRun)} />
      </div>

      <div className="border-t border-mist pt-5">
        <button
          type="button"
          onClick={onExample}
          className="rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          {mode === 'severity' ? t.readOnly.showExampleSeverity : t.readOnly.showExample}
        </button>
      </div>
    </div>
  )
}

function ExamplePage({ onBack }: { onBack: () => void }) {
  const [sample, setSample] = useState<SampleItem | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchSampleItem()
      .then(setSample)
      .catch((e) =>
        setError(e instanceof EnforcementError && e.code === 'NO_OPEN_STUDY' ? t.noOpenStudy : t.readOnly.exampleError),
      )
  }, [])

  useEffect(load, [load])

  return (
    <div className="space-y-6">
      <ReadOnlyNotice compact />

      {error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : !sample ? (
        <p className="text-slate-500">{t.loading}</p>
      ) : (
        <>
          <p className="max-w-prose text-sm text-slate-500">{t.readOnly.exampleLead(sample.itemsPerRater ?? sample.totalItems, sample.item.mode)}</p>
          <ItemView
            key={sample.item.itemId}
            item={sample.item}
            heading={t.readOnly.exampleHeading}
            submitLabel={t.next}
            readOnly
            busy={false}
            error={null}
            onSubmit={() => {}}
          />
        </>
      )}

      <BackLink label={t.readOnly.backToProtocol} onClick={onBack} />
    </div>
  )
}

function CodingSession({ email }: { email: string }) {
  const [session, setSession] = useState<StudySession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchSession()
      .then((s) => {
        setSession(s)
        setAcknowledged(protocolAcknowledgedAt(runKey(s.studyVersionId, email)))
      })
      .catch((e) => setError(e instanceof EnforcementError && e.code === 'NO_OPEN_STUDY' ? t.noOpenStudy : t.loadError))
  }, [email])

  useEffect(load, [load])

  if (error) return <Shell><ErrorBox message={error} onRetry={load} /></Shell>
  if (!session) return <Shell><p className="text-slate-500">{t.loading}</p></Shell>

  const run = runKey(session.studyVersionId, email)

  // Once submitted the run is closed — the client offers no way back in, and
  // the server rejects further ratings anyway.
  if (session.submitted) {
    return <Shell><DonePage completed={session.completedItems} /></Shell>
  }

  if (!acknowledged) {
    return (
      <Shell>
        <IntroPage mode={session.mode} itemsPerRun={session.itemsPerRater ?? session.totalItems} onAcknowledged={() => setAcknowledged(acknowledgeProtocol(run))} />
      </Shell>
    )
  }

  return <Shell><Coding session={session} run={run} /></Shell>
}

/** Startseite: the coding protocol in full, then an explicit acknowledgement. */
function IntroPage({ mode, itemsPerRun, onAcknowledged }: { mode?: StudyMode; itemsPerRun?: number | null; onAcknowledged: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">{t.introHeading(mode)}</h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t.introLead(mode)}</p>
      </div>

      {PROTOCOL_DRAFT && <DraftNotice />}

      <div className="max-w-prose">
        <Markdown text={protocolFor(mode, itemsPerRun)} />
      </div>

      <div className="border-t border-mist pt-5">
        <button
          type="button"
          onClick={onAcknowledged}
          className="rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          {mode === 'severity' ? t.acknowledgeSeverity : t.acknowledge}
        </button>
      </div>
    </div>
  )
}

/** Removed together with PROTOCOL_DRAFT once the approved wording is in. */
function DraftNotice() {
  return (
    <div className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-slate-800">
      Entwurfsfassung des Protokolls — noch nicht die verbindliche Fassung der Studie.
    </div>
  )
}

type View = { kind: 'item' } | { kind: 'corrections' } | { kind: 'correct'; itemId: string }

function Coding({ session, run }: { session: StudySession; run: string }) {
  const [view, setView] = useState<View>({ kind: 'item' })
  const [item, setItem] = useState<StudyItem | null>(null)
  const [correction, setCorrection] = useState<ItemWithRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [completed, setCompleted] = useState(session.completedItems)
  const [submitted, setSubmitted] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Forward is the normal case: ask the server for the one next unanswered
  // item. Skipped after a rating, because POST /rating already returned it —
  // a second GET /next would stamp a second delivery and skew server dwell.
  useEffect(() => {
    if (view.kind === 'corrections') return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setSaveError(null)
    const request =
      view.kind === 'item'
        ? fetchNextItem().then((i) => {
            if (!cancelled) {
              setItem(i)
              setCorrection(null)
            }
          })
        : fetchItemForCorrection(view.itemId).then((i) => {
            if (!cancelled) setCorrection(i)
          })
    request
      .catch(() => {
        if (!cancelled) setLoadError(t.itemError)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [view, reloadKey])

  const save = async (source: StudyItem, sub: ItemSubmission, isCorrection: boolean) => {
    setBusy(true)
    setSaveError(null)
    try {
      const result = await postRating({ itemId: source.itemId, ...sub })
      setCompleted(result.completedItems)
      recordCodedItem(run, {
        itemId: source.itemId,
        position: source.position,
        // Im Schweregrad-Modus gibt es keine Vorschrift, auf die verwiesen
        // werden koennte. Die Korrekturliste zeigt dann Anlage und Gefaehrdung
        // — genug, um ein Item wiederzuerkennen, ohne die Vignette zu wiederholen.
        instrumentShortName:
          source.mode === 'severity' ? source.regulatedTypeLabel || t.severity.heading : source.instrumentShortName,
        provision: source.mode === 'severity' ? source.hazardLabel || '' : source.provision,
      })
      if (isCorrection) {
        setView({ kind: 'corrections' })
      } else {
        // The server hands the next item back with the response.
        setItem(result.next)
        setCorrection(null)
      }
    } catch (e) {
      setSaveError(e instanceof EnforcementError ? e.message : t.saveError)
    } finally {
      setBusy(false)
    }
  }

  if (submitted) return <DonePage completed={completed} />

  if (view.kind === 'corrections') {
    return (
      <CorrectionList
        run={run}
        onOpen={(itemId) => setView({ kind: 'correct', itemId })}
        onBack={() => setView({ kind: 'item' })}
      />
    )
  }

  const panel = <ProtocolPanel mode={session.mode} itemsPerRun={session.itemsPerRater ?? session.totalItems} />

  if (loading) {
    return (
      <>
        {panel}
        <p className="text-slate-500">{t.loading}</p>
      </>
    )
  }

  if (loadError) {
    return (
      <>
        {panel}
        <ErrorBox message={loadError} onRetry={() => setReloadKey((k) => k + 1)} />
      </>
    )
  }

  if (view.kind === 'correct') {
    if (!correction) return null
    return (
      <>
        {panel}
        <ItemView
          // Remounts per item so the clock and the field state start clean.
          key={`correct-${correction.itemId}-${correction.rating.ratingId}`}
          item={correction}
          initial={correction.rating}
          heading={t.correctionOf(correction.position)}
          submitLabel={t.saveCorrection}
          busy={busy}
          error={saveError}
          onSubmit={(sub) => save(correction, sub, true)}
        />
        <BackLink label={t.back} onClick={() => setView({ kind: 'corrections' })} />
      </>
    )
  }

  // No item left: everything is coded, but the run stays open until the coder
  // closes it — submitting locks corrections too.
  if (!item) {
    return (
      <>
        {panel}
        <FinishPage
          completed={completed}
          onSubmitted={() => setSubmitted(true)}
          onCorrections={() => setView({ kind: 'corrections' })}
        />
      </>
    )
  }

  return (
    <>
      {panel}
      <ItemView
        key={item.itemId}
        item={item}
        heading={t.position(item.position, item.total)}
        submitLabel={t.next}
        busy={busy}
        error={saveError}
        onSubmit={(sub) => save(item, sub, false)}
      />
      <div className="mt-6 border-t border-mist pt-4">
        <LinkButton label={t.correctionsOpen} onClick={() => setView({ kind: 'corrections' })} />
      </div>
    </>
  )
}

/**
 * Weiche zwischen den beiden Erhebungsmodi.
 *
 * Der Modus steckt am Item und nicht an der Sitzung, obwohl eine Version immer
 * nur einen kennt: so entscheidet das, was tatsächlich vorliegt, und nicht das,
 * was ein zweiter Zustand darüber behauptet. Läuft beides einmal auseinander,
 * bekommt der Bewerter das Formular zu dem, was er sieht.
 */
function ItemView({
  item,
  initial,
  heading,
  submitLabel,
  busy,
  error,
  readOnly = false,
  onSubmit,
}: {
  item: ItemContent
  initial?: OwnRating
  heading: string
  submitLabel: string
  busy: boolean
  error: string | null
  readOnly?: boolean
  onSubmit: (submission: ItemSubmission) => void
}) {
  const props = { initial, heading, submitLabel, busy, error, readOnly, onSubmit }
  return item.mode === 'severity' ? (
    <SeverityForm item={item} {...props} />
  ) : (
    <ItemForm item={item} {...props} />
  )
}

/**
 * The protocol stays reachable during coding. Without it, coders guess instead
 * of looking up the decision rules — in particular the Verweisungsregel.
 */
function ProtocolPanel({ mode, itemsPerRun }: { mode?: StudyMode; itemsPerRun?: number | null }) {
  return (
    <details className="mb-6 rounded-md border border-mist bg-white">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
        {t.protocolPanel(mode)}
      </summary>
      <div className="max-h-[50vh] overflow-y-auto border-t border-mist px-4 py-3">
        <div className="max-w-prose">
          <Markdown text={protocolFor(mode, itemsPerRun)} />
        </div>
      </div>
    </details>
  )
}

/**
 * Corrections list. Only items already rated on this device appear — never an
 * unanswered one, so this cannot become a way to browse ahead. The server
 * enforces the same rule and refuses an unanswered id with 403.
 */
function CorrectionList({
  run,
  onOpen,
  onBack,
}: {
  run: string
  onOpen: (itemId: string) => void
  onBack: () => void
}) {
  const [items] = useState<CodedItemRef[]>(() => codedItems(run))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold text-navy">{t.correctionsHeading}</h1>
        <p className="mt-1.5 max-w-prose text-sm text-slate-500">{t.correctionsIntro}</p>
        <p className="mt-1.5 max-w-prose text-xs text-slate-400">{t.correctionsLocalNote}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-500">{t.correctionsEmpty}</p>
      ) : (
        <ul className="divide-y divide-mist border-y border-mist">
          {items.map((it) => (
            <li key={it.itemId}>
              <button
                type="button"
                onClick={() => onOpen(it.itemId)}
                className="flex w-full items-baseline gap-3 px-1 py-3 text-left transition-colors hover:bg-cream"
              >
                <span className="w-10 shrink-0 text-xs font-semibold text-slate-400">#{it.position}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-navy">{it.instrumentShortName}</span>
                  <span className="block text-xs text-slate-500">{it.provision}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{t.ratedAt(formatDate(it.codedAt))}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BackLink label={t.back} onClick={onBack} />
    </div>
  )
}

/** All items coded, run still open: the explicit, irreversible close. */
function FinishPage({
  completed,
  onSubmitted,
  onCorrections,
}: {
  completed: number
  onSubmitted: () => void
  onCorrections: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await postSubmit()
      onSubmitted()
    } catch {
      setError(t.finishError)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-xl font-bold text-navy">{t.finishHeading}</h1>
      <p className="max-w-prose text-slate-800">{t.finishCount(completed)}</p>
      <p className="max-w-prose text-sm text-slate-500">{t.finishHint}</p>

      {error && <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="flex flex-wrap items-center gap-4 border-t border-mist pt-5">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:bg-mist disabled:text-slate-400"
            >
              {busy ? t.finishing : t.finishConfirm}
            </button>
            <LinkButton label={t.finishCancel} onClick={() => setConfirming(false)} disabled={busy} />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
            >
              {t.finish}
            </button>
            <LinkButton label={t.correctionsOpen} onClick={onCorrections} />
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Abschlussseite. Confirmation and count only — no result, no evaluation, no
 * feedback on correctness. Feedback would be pleasant for the coder and
 * ruinous for the study: a second round would meet a calibrated coder.
 */
function DonePage({ completed }: { completed: number }) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-navy">{t.doneHeading}</h1>
      <p className="max-w-prose text-slate-800">{t.doneCount(completed)}</p>
      <p className="max-w-prose text-sm text-slate-500">{t.doneLocked}</p>
      <p className="max-w-prose text-slate-800">{t.doneThanks}</p>
    </div>
  )
}

function LinkButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-sm text-slate-500 underline underline-offset-2 hover:text-navy disabled:text-slate-300"
    >
      {label}
    </button>
  )
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="mt-6 border-t border-mist pt-4">
      <LinkButton label={`← ${label}`} onClick={onClick} />
    </div>
  )
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="mt-2 underline underline-offset-2">
        {t.retry}
      </button>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('de-CH', { dateStyle: 'short', timeStyle: 'short' })
}
