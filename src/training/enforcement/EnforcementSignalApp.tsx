import { useCallback, useEffect, useState, type ReactNode } from 'react'
import '../styles.css'
import { labels } from '../labels'
import { useAuth } from '../auth/AuthContext'
import LoginGate from '../auth/LoginGate'
import { Markdown } from '../lib/markdown'
import ItemForm, { type ItemSubmission } from './ItemForm'
import { PROTOCOL_DRAFT, PROTOCOL_MARKDOWN } from './protocol'
import {
  EnforcementError,
  fetchItemForCorrection,
  fetchNextItem,
  fetchSession,
  hasCoderAccess,
  postRating,
  postSubmit,
  type ItemWithRating,
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

/** Route root: login required, coder-or-admin required, then the session. */
export default function EnforcementSignalApp() {
  const { status, user } = useAuth()

  if (status === 'checking') {
    return <Shell><p className="text-slate-500">{labels.auth.checking}</p></Shell>
  }
  if (status === 'anonymous') {
    return (
      <div className="training-root font-sans">
        <LoginGate />
      </div>
    )
  }
  // Mirrors the server gate: an Administrator is a coder like any other here.
  if (!user || !hasCoderAccess(user.roles)) {
    return (
      <Shell>
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">{t.noAccess}</div>
      </Shell>
    )
  }
  return <CodingSession email={user.email} />
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="training-root font-sans">
      <div className="mx-auto max-w-[46rem] px-4 py-8">{children}</div>
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
        <IntroPage onAcknowledged={() => setAcknowledged(acknowledgeProtocol(run))} />
      </Shell>
    )
  }

  return <Shell><Coding session={session} run={run} /></Shell>
}

/** Startseite: the coding protocol in full, then an explicit acknowledgement. */
function IntroPage({ onAcknowledged }: { onAcknowledged: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">{t.introHeading}</h1>
        <p className="mt-2 max-w-prose text-sm text-slate-500">{t.introLead}</p>
      </div>

      {PROTOCOL_DRAFT && <DraftNotice />}

      <div className="max-w-prose">
        <Markdown text={PROTOCOL_MARKDOWN} />
      </div>

      <div className="border-t border-mist pt-5">
        <button
          type="button"
          onClick={onAcknowledged}
          className="rounded-md bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
        >
          {t.acknowledge}
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
        instrumentShortName: source.instrumentShortName,
        provision: source.provision,
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

  const panel = <ProtocolPanel />

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
        <ItemForm
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
      <ItemForm
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
 * The protocol stays reachable during coding. Without it, coders guess instead
 * of looking up the decision rules — in particular the Verweisungsregel.
 */
function ProtocolPanel() {
  return (
    <details className="mb-6 rounded-md border border-mist bg-white">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-navy [&::-webkit-details-marker]:hidden">
        {t.protocolPanel}
      </summary>
      <div className="max-h-[50vh] overflow-y-auto border-t border-mist px-4 py-3">
        <div className="max-w-prose">
          <Markdown text={PROTOCOL_MARKDOWN} />
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
