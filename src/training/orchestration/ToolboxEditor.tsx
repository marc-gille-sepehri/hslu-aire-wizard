// Der Werkzeugkasten: Name, Beschreibung, Parameter.
//
// Die Beschreibung ist hier kein Beiwerk. Sie ist das Einzige, woran das Modell
// erkennt, wofür ein Werkzeug taugt — der Name allein sagt ihm nichts, was er
// nicht schon sagt. Wer das einmal erlebt hat, indem er eine Beschreibung
// weglässt und den Plan danebengehen sieht, hat die Lektion.

import { useState } from 'react'
import { PARAM_TYPES, blankTool, type ToolSpec, type Limits } from './orchestrationApi'

interface Props {
  tools: ToolSpec[]
  limits: Limits
  busy: boolean
  onChange: (tools: ToolSpec[]) => void
}

const inputCls =
  'w-full rounded-md border border-slate-300 px-2 py-1.5 font-sans text-sm text-slate-800 focus:border-slate-500 focus:outline-none'
const labelCls = 'mb-1 block font-sans text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400'

export default function ToolboxEditor({ tools, limits, busy, onChange }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  const patch = (toolId: string, next: Partial<ToolSpec>) =>
    onChange(tools.map((t) => (t.toolId === toolId ? { ...t, ...next } : t)))

  const remove = (toolId: string) => {
    onChange(tools.filter((t) => t.toolId !== toolId))
    if (open === toolId) setOpen(null)
  }

  const add = () => {
    const tool = blankTool()
    onChange([...tools, tool])
    setOpen(tool.toolId)
  }

  return (
    <div className="space-y-2">
      {tools.map((tool) => {
        const expanded = open === tool.toolId
        const nameless = !tool.name.trim()
        return (
          <div key={tool.toolId} className="rounded-md border border-mist bg-white">
            <div className="flex items-start gap-2 px-3 py-2">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : tool.toolId)}
                className="min-w-0 flex-1 text-left"
              >
                <span
                  className={`block truncate font-mono text-sm ${
                    nameless ? 'italic text-slate-400' : 'text-navy'
                  }`}
                >
                  {tool.name || 'ohne Namen'}
                </span>
                <span className="block truncate font-sans text-xs text-slate-500">
                  {tool.description || 'keine Beschreibung'}
                </span>
              </button>
              <span className="shrink-0 pt-0.5 font-sans text-xs text-slate-400">
                {tool.params.length} {tool.params.length === 1 ? 'Parameter' : 'Parameter'}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(tool.toolId)}
                aria-label="Werkzeug entfernen"
                title="Werkzeug entfernen"
                className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:text-red-700 disabled:opacity-40"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {expanded && (
              <div className="space-y-3 border-t border-mist px-3 py-3" style={{ borderTopStyle: 'solid' }}>
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    className={`${inputCls} font-mono`}
                    value={tool.name}
                    onChange={(e) => patch(tool.toolId, { name: e.target.value })}
                    placeholder="mietvertrag_suchen"
                  />
                </div>
                <div>
                  <label className={labelCls}>Beschreibung</label>
                  <textarea
                    className={inputCls}
                    rows={2}
                    value={tool.description}
                    onChange={(e) => patch(tool.toolId, { description: e.target.value })}
                    placeholder="Was tut dieses Werkzeug? Ein Satz — das Modell hat nur diesen."
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className={labelCls}>Parameter</span>
                    {tool.params.length < limits.maxParams && (
                      <button
                        type="button"
                        onClick={() =>
                          patch(tool.toolId, {
                            params: [
                              ...tool.params,
                              { name: '', type: 'string', description: '', required: false },
                            ],
                          })
                        }
                        className="font-sans text-xs text-navy hover:underline"
                      >
                        + Parameter
                      </button>
                    )}
                  </div>

                  {tool.params.length === 0 && (
                    <p className="font-sans text-xs text-slate-400">Keine Parameter.</p>
                  )}

                  <div className="space-y-2">
                    {tool.params.map((param, i) => (
                      <div key={i} className="rounded border border-mist bg-cream/50 p-2" style={{ borderStyle: 'solid' }}>
                        <div className="flex flex-wrap items-start gap-2">
                          <input
                            className={`${inputCls} w-40 font-mono`}
                            value={param.name}
                            onChange={(e) =>
                              patch(tool.toolId, {
                                params: tool.params.map((p, j) =>
                                  j === i ? { ...p, name: e.target.value } : p,
                                ),
                              })
                            }
                            placeholder="stichtag"
                          />
                          <select
                            className={`${inputCls} w-28`}
                            value={param.type}
                            onChange={(e) =>
                              patch(tool.toolId, {
                                params: tool.params.map((p, j) =>
                                  j === i ? { ...p, type: e.target.value as typeof p.type } : p,
                                ),
                              })
                            }
                          >
                            {PARAM_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1.5 pt-2 font-sans text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={param.required}
                              onChange={(e) =>
                                patch(tool.toolId, {
                                  params: tool.params.map((p, j) =>
                                    j === i ? { ...p, required: e.target.checked } : p,
                                  ),
                                })
                              }
                              className="h-3.5 w-3.5 accent-navy"
                            />
                            erforderlich
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              patch(tool.toolId, { params: tool.params.filter((_, j) => j !== i) })
                            }
                            aria-label="Parameter entfernen"
                            className="ml-auto rounded p-1 pt-2 text-slate-300 hover:text-red-700"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <input
                          className={`${inputCls} mt-2`}
                          value={param.description}
                          onChange={(e) =>
                            patch(tool.toolId, {
                              params: tool.params.map((p, j) =>
                                j === i ? { ...p, description: e.target.value } : p,
                              ),
                            })
                          }
                          placeholder="Wofür steht dieser Parameter?"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {tools.length < limits.maxTools && (
        <button
          type="button"
          onClick={add}
          className="w-full rounded-md border border-mist px-3 py-2 font-sans text-sm text-navy transition-colors hover:bg-cream"
          style={{ borderStyle: 'solid' }}
        >
          + Werkzeug
        </button>
      )}
    </div>
  )
}
