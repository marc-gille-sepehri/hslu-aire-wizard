// The change-note prompt on an explicit save (module-revision spec §4/§4.1).
// Autosave never gets here — only a deliberate "Speichern" commits a revision,
// which is what keeps the note requirement bearable and the history readable.
import { useEffect, useRef, useState } from 'react'
import { labels } from '../labels'

const NOTE_MIN = 3
const NOTE_MAX = 200

export default function SaveNoteDialog({
  open,
  saving,
  onSave,
  onCancel,
}: {
  open: boolean
  saving: boolean
  onSave: (note: string) => void
  onCancel: () => void
}) {
  const [note, setNote] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setNote('')
      // Focus after paint so the author can just start typing.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (!open) return null

  const trimmed = note.trim()
  const tooShort = trimmed.length > 0 && trimmed.length < NOTE_MIN
  const canSave = trimmed.length >= NOTE_MIN && !saving

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (canSave) onSave(trimmed)
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-note-title"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !saving) onCancel()
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="save-note-title" className="text-lg font-semibold text-navy">
          {labels.saveNote.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{labels.saveNote.intro}</p>
        <input
          ref={inputRef}
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
          placeholder={labels.saveNote.placeholder}
          maxLength={NOTE_MAX}
          className="mt-4 w-full rounded-md border border-mist px-3 py-2 text-sm text-slate-800 focus:border-navy focus:outline-none"
        />
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className={tooShort ? 'text-red-700' : 'text-slate-500'}>
            {tooShort ? labels.saveNote.tooShort(NOTE_MIN) : labels.saveNote.hint(NOTE_MIN, NOTE_MAX)}
          </span>
          <span className="text-slate-400">
            {trimmed.length}/{NOTE_MAX}
          </span>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md border border-mist px-3 py-1.5 text-sm text-slate-700 hover:border-navy disabled:opacity-60"
          >
            {labels.saveNote.cancel}
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-md bg-gold px-3 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60"
          >
            {saving ? labels.editor.saving : labels.saveNote.save}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Shown when the server refused the write because someone else saved first.
 * Deliberately offers no "overwrite anyway" — the other author's work is not
 * ours to discard.
 */
export function ConflictDialog({
  currentRev,
  onReload,
  onDismiss,
}: {
  currentRev: number | null
  onReload: () => void
  onDismiss: () => void
}) {
  if (currentRev === null) return null
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-red-800">{labels.saveNote.conflictTitle}</h2>
        <p className="mt-2 text-sm text-slate-700">{labels.saveNote.conflictBody(currentRev)}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-mist px-3 py-1.5 text-sm text-slate-700 hover:border-navy"
          >
            {labels.saveNote.cancel}
          </button>
          <button
            type="button"
            onClick={onReload}
            className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90"
          >
            {labels.saveNote.conflictReload}
          </button>
        </div>
      </div>
    </div>
  )
}
