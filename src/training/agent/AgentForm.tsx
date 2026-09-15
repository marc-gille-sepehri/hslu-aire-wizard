// The agent definition — which, per the spec, *is* the widget form. A learner
// who writes an instruction, ticks two tools and picks a trigger has built the
// thing the course keeps talking about, and can then watch it work.
//
// The tools are listed in two groups, labelled by what they do to the world.
// That split is the lesson: everything under "Würde tun" is recorded and shown
// for approval, and nothing under it is ever performed.

import { useState } from 'react'
import { labels } from '../labels'
import type { AgentDef, AgentState } from './agentApi'

const t = labels.agentForm

interface Props {
  agent: AgentDef | null
  state: AgentState
  busy: boolean
  onSave: (agent: Partial<AgentDef> & { agentId?: string }) => void
  onDelete?: () => void
  onClose: () => void
}

const blank = (state: AgentState): AgentDef => ({
  agentId: '',
  name: '',
  description: '',
  trigger: { type: 'file', match: { folder: 'eingang', pattern: '*' } },
  tools: ['workspace__list_files', 'workspace__read_file'],
  instruction: '',
  model: state.models[1]?.id ?? state.models[0]?.id ?? '',
  maxSteps: 12,
  enabled: true,
})

const labelCls = 'font-sans text-xs font-semibold uppercase tracking-wide text-slate-500'
const inputCls =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none'

export default function AgentForm({ agent, state, busy, onSave, onDelete, onClose }: Props) {
  const [draft, setDraft] = useState<AgentDef>(agent ?? blank(state))
  const set = (patch: Partial<AgentDef>) => setDraft((d) => ({ ...d, ...patch }))

  const toggleTool = (name: string) =>
    set({
      tools: draft.tools.includes(name)
        ? draft.tools.filter((t) => t !== name)
        : [...draft.tools, name],
    })

  const valid = draft.name.trim() && draft.instruction.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy/40 px-4 pb-10 pt-20"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-mist bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-mist bg-cream px-6 py-4">
          <h2 className="font-display text-lg font-bold text-navy">
            {agent ? t.titleEdit : t.titleNew}
          </h2>
          <button type="button" onClick={onClose} className="font-sans text-sm text-slate-500 hover:text-navy">
            {t.close}
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t.name}</label>
              <input
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                className={inputCls}
                placeholder={t.namePlaceholder}
              />
            </div>
            <div>
              <label className={labelCls}>{t.model}</label>
              <select
                value={draft.model}
                onChange={(e) => set({ model: e.target.value })}
                className={inputCls}
              >
                {state.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.description}</label>
            <input
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              className={inputCls}
              placeholder={t.descriptionPlaceholder}
            />
          </div>

          <div>
            <label className={labelCls}>{t.instruction}</label>
            <textarea
              value={draft.instruction}
              onChange={(e) => set({ instruction: e.target.value })}
              rows={6}
              className={`${inputCls} font-mono text-xs`}
              placeholder={t.instructionPlaceholder}
            />
          </div>

          <div>
            <label className={labelCls}>{t.trigger}</label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={draft.trigger.type}
                onChange={(e) =>
                  set({
                    trigger: {
                      type: e.target.value as AgentDef['trigger']['type'],
                      match:
                        e.target.value === 'file'
                          ? { folder: 'eingang', pattern: '*' }
                          : e.target.value === 'message'
                            ? { subjectContains: '' }
                            : { everyMinutes: state.limits.minTimerMinutes },
                    },
                  })
                }
                className={`${inputCls} w-auto`}
              >
                <option value="file">{t.triggerFile}</option>
                <option value="message">{t.triggerMessage}</option>
                <option value="timer">{t.triggerTimer}</option>
              </select>

              {draft.trigger.type === 'file' && (
                <input
                  value={draft.trigger.match.folder ?? ''}
                  onChange={(e) =>
                    set({ trigger: { ...draft.trigger, match: { ...draft.trigger.match, folder: e.target.value } } })
                  }
                  className={`${inputCls} w-40`}
                  placeholder={t.folderPlaceholder}
                />
              )}

              {draft.trigger.type === 'message' && (
                <input
                  value={draft.trigger.match.subjectContains ?? ''}
                  onChange={(e) =>
                    set({
                      trigger: {
                        ...draft.trigger,
                        match: { ...draft.trigger.match, subjectContains: e.target.value },
                      },
                    })
                  }
                  className={`${inputCls} w-56`}
                  placeholder={t.subjectPlaceholder}
                />
              )}

              {draft.trigger.type === 'timer' && (
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm text-slate-600">alle</span>
                  <input
                    type="number"
                    min={state.limits.minTimerMinutes}
                    value={draft.trigger.match.everyMinutes ?? state.limits.minTimerMinutes}
                    onChange={(e) =>
                      set({
                        trigger: {
                          ...draft.trigger,
                          match: { ...draft.trigger.match, everyMinutes: Number(e.target.value) },
                        },
                      })
                    }
                    className={`${inputCls} w-20`}
                  />
                  <span className="font-sans text-sm text-slate-600">{t.minutes}</span>
                </div>
              )}
            </div>
            {draft.trigger.type === 'timer' && (
              <p className="mt-1 font-sans text-xs text-amber-800">
                Zeitgesteuerte Läufe laufen ohne dich. Was der Agent tun würde, wird gesammelt und
                dir beim nächsten Öffnen vorgelegt — freigeben kannst du dann nichts mehr.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t.toolsRead}</label>
              <ul className="mt-1 space-y-1">
                {state.tools.read.map((tool) => (
                  <li key={tool.name}>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={draft.tools.includes(tool.name)}
                        onChange={() => toggleTool(tool.name)}
                        className="mt-1 h-3.5 w-3.5 accent-navy"
                      />
                      <span className="font-mono text-xs text-slate-700">{tool.display}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className={labelCls}>{t.toolsRecord}</label>
              <ul className="mt-1 space-y-1">
                {state.tools.record.map((tool) => (
                  <li key={tool.name}>
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={draft.tools.includes(tool.name)}
                        onChange={() => toggleTool(tool.name)}
                        className="mt-1 h-3.5 w-3.5 accent-navy"
                      />
                      <span className="font-mono text-xs text-slate-700">{tool.display}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={labelCls}>{t.maxSteps}</span>
              <input
                type="number"
                min={1}
                max={state.limits.maxSteps}
                value={draft.maxSteps}
                onChange={(e) => set({ maxSteps: Number(e.target.value) })}
                className={`${inputCls} w-20`}
              />
              <span className="font-sans text-xs text-slate-400">max. {state.limits.maxSteps}</span>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => set({ enabled: e.target.checked })}
                className="h-3.5 w-3.5 accent-navy"
              />
              <span className="font-sans text-sm text-slate-700">{t.enabled}</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-mist bg-cream px-6 py-4">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="font-sans text-sm text-slate-500 hover:text-red-700"
            >
              {t.deleteAgent}
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!valid || busy}
            onClick={() => onSave({ ...draft, agentId: draft.agentId || undefined })}
            className="rounded-md border-2 border-navy bg-navy px-4 py-1.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-white hover:text-navy disabled:border-mist disabled:bg-mist disabled:text-slate-400"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  )
}
