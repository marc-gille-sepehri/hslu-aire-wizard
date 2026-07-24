import { useProgress } from '../state/ProgressContext'
import { labels } from '../labels'

/**
 * Modal shown when the first interaction in a module cannot claim a course seat
 * (no order for the organization, or all seats taken). Reads the seat error from
 * ProgressContext, so it must render inside a ProgressProvider.
 */
export default function SeatErrorDialog() {
  const { seatError, dismissSeatError } = useProgress()
  if (!seatError) return null

  const message =
    seatError.code === 'NO_ORDER'
      ? labels.seat.noOrder
      : seatError.code === 'NO_SEATS'
        ? labels.seat.noSeats
        : labels.seat.generic

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seat-error-title"
      onClick={dismissSeatError}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="seat-error-title" className="text-lg font-semibold text-navy">
          {labels.seat.title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{message}</p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={dismissSeatError}
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
          >
            {labels.seat.close}
          </button>
        </div>
      </div>
    </div>
  )
}
