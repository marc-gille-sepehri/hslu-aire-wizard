import { useEffect, useMemo, useState } from 'react'
import type { LlmPromptArtifact } from '../../schema/types'
import { labels } from '../../labels'
import { complete, fetchModels, type CompleteResult, type ModelInfo } from '../../lib/llmApi'
import { useRecordInteraction } from '../../state/ProgressContext'

const t = labels.llm

/**
 * "Naked prompt" playground: participants send a plain prompt (no system prompt)
 * to a selected model and see the raw text back. Which parameters are editable
 * comes from the server's per-model spec — e.g. temperature only where the model
 * supports it.
 */
export default function LlmPrompt({ artifact }: { artifact: LlmPromptArtifact }) {
  const allowModelChoice = artifact.allowModelChoice !== false
  const allowParamEditing = artifact.allowParamEditing !== false
  const record = useRecordInteraction()

  const [models, setModels] = useState<ModelInfo[] | null>(null)
  const [modelsError, setModelsError] = useState(false)
  const [modelId, setModelId] = useState(artifact.defaultModel ?? '')
  const [prompt, setPrompt] = useState(artifact.defaultPrompt ?? '')
  const [params, setParams] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompleteResult | null>(null)

  // Load the model catalogue once.
  useEffect(() => {
    let cancelled = false
    fetchModels()
      .then((list) => {
        if (cancelled) return
        setModels(list)
        const preferred =
          list.find((m) => m.id === artifact.defaultModel && m.available) ||
          list.find((m) => m.available) ||
          list[0]
        if (preferred) setModelId(preferred.id)
      })
      .catch(() => !cancelled && setModelsError(true))
    return () => {
      cancelled = true
    }
  }, [artifact.defaultModel])

  const model = useMemo(() => models?.find((m) => m.id === modelId), [models, modelId])

  // Reset parameters to the selected model's defaults whenever the model changes.
  useEffect(() => {
    if (!model) return
    const next: Record<string, number> = {}
    for (const p of model.params) next[p.key] = p.default
    setParams(next)
  }, [model])

  const send = async () => {
    if (!model || !prompt.trim()) return
    // Record the user's prompt (the interactive input for this block).
    record(artifact.id, { type: 'prompt', prompt: prompt.trim(), model: model.id })
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await complete({
        modelId: model.id,
        prompt: prompt.trim(),
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      })
      setResult(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const title = artifact.title || t.title

  return (
    <div className="rounded-lg border border-mist bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden className="text-lg">🤖</span>
        <h3 className="font-sans font-semibold text-navy">{title}</h3>
      </div>
      {artifact.instructions && <p className="mb-4 text-sm text-slate-500">{artifact.instructions}</p>}

      {modelsError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{t.modelsError}</div>
      )}

      {models && (
        <div className="space-y-4">
          {/* Model + params row */}
          <div className="flex flex-wrap items-end gap-4">
            {allowModelChoice && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">
                  {t.model}
                </span>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id} disabled={!m.available}>
                      {m.label}
                      {m.available ? '' : ` — ${t.unavailable}`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {allowParamEditing &&
              model?.params.map((p) => (
                <label key={p.key} className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">
                    {p.label}
                    {p.key === 'temperature' ? `: ${(params.temperature ?? p.default).toFixed(2)}` : ''}
                  </span>
                  {p.key === 'temperature' ? (
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[p.key] ?? p.default}
                      onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))}
                      className="w-40 accent-gold"
                    />
                  ) : (
                    <input
                      type="number"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={params[p.key] ?? p.default}
                      onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))}
                      className="w-24 rounded-md border border-mist bg-white px-2 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30"
                    />
                  )}
                </label>
              ))}
          </div>

          {model?.note && <p className="text-xs text-slate-400">{model.note}</p>}

          {/* Prompt */}
          <div>
            <label htmlFor={`prompt-${artifact.id}`} className="mb-1 block text-xs font-semibold uppercase tracking-kicker text-slate-500">
              {t.promptLabel}
            </label>
            <textarea
              id={`prompt-${artifact.id}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={t.promptPlaceholder}
              className="w-full rounded-md border border-mist bg-white px-3 py-2 font-serif leading-relaxed text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30"
            />
          </div>

          <button
            type="button"
            onClick={send}
            disabled={busy || !prompt.trim() || !model?.available}
            className="rounded-md bg-gold px-4 py-2.5 font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-60"
          >
            {busy ? t.sending : t.send}
          </button>

          {error && <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          {result && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-kicker text-slate-500">{t.response}</span>
                {result.usage && (
                  <span className="text-xs text-slate-400">
                    {t.tokens(result.usage.inputTokens, result.usage.outputTokens)}
                  </span>
                )}
              </div>
              {result.refused ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{t.refused}</div>
              ) : (
                <div className="whitespace-pre-wrap rounded-md border border-mist bg-cream p-4 font-serif leading-relaxed text-slate-800">
                  {result.text}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
