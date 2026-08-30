import { useRef, useState, type FormEvent } from 'react'
import type { McpInspectorArtifact } from '../../schema/types'
import { useRecordInteraction, useSavedInteraction } from '../../state/ProgressContext'
import { useLearner } from '../../state/LearnerStateContext'
import { labels } from '../../labels'
import {
  mcpInitialize,
  mcpListTools,
  mcpCallTool,
  mcpProbe,
  mcpCallToolViaServer,
  mcpDisconnect,
  runOAuthPopup,
  McpAuthRequiredError,
  type McpToolDef,
  type McpServerInfo,
  type McpCallResult,
  type McpProp,
} from '../../lib/mcpClient'

const t = labels.mcp

type SavedMcp = { url?: string; urlEntered?: boolean; toolFired?: boolean }

/**
 * MCP toolset inspector (like the Anthropic MCP Inspector): connect to an MCP
 * server URL, list its tools, fill parameters and fire one. Progress: the block
 * is complete once a URL was connected AND a tool was fired — both facts are
 * recorded to ModuleProgress.
 */
export default function McpInspector({ artifact }: { artifact: McpInspectorArtifact }) {
  const record = useRecordInteraction()
  const { markComplete } = useLearner()
  const { interaction: saved } = useSavedInteraction(artifact.id)
  const savedMcp: SavedMcp | null =
    saved && (saved as { type?: string }).type === 'mcp' ? (saved as SavedMcp) : null

  const [url, setUrl] = useState(savedMcp?.url ?? artifact.defaultUrl ?? '')
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'connected' | 'error' | 'auth' | 'signing_in'
  >('idle')
  /** 'direct' = aus dem Browser, 'proxy' = über unseren Server (mit Anmeldung). */
  const [mode, setMode] = useState<'direct' | 'proxy'>('direct')
  const [authUrl, setAuthUrl] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState(false)
  const [serverInfo, setServerInfo] = useState<McpServerInfo | null>(null)
  const [tools, setTools] = useState<McpToolDef[]>([])
  const [connectError, setConnectError] = useState<string | null>(null)
  const [selected, setSelected] = useState<McpToolDef | null>(null)
  const [args, setArgs] = useState<Record<string, string>>({})
  const [calling, setCalling] = useState(false)
  const [result, setResult] = useState<McpCallResult | null>(null)
  const [callError, setCallError] = useState<string | null>(null)

  const urlEntered = useRef(!!savedMcp?.urlEntered)
  const toolFired = useRef(!!savedMcp?.toolFired)
  const [, forceRender] = useState(0)

  const persist = (patch: { urlEntered?: boolean; toolFired?: boolean; toolName?: string }) => {
    if (patch.urlEntered) urlEntered.current = true
    if (patch.toolFired) toolFired.current = true
    record(artifact.id, {
      type: 'mcp',
      url: url.trim() || undefined,
      toolName: patch.toolName,
      urlEntered: urlEntered.current,
      toolFired: toolFired.current,
    })
    if (urlEntered.current && toolFired.current && artifact.tracked !== false) markComplete(artifact.id)
    forceRender((n) => n + 1)
  }

  /**
   * Verbinden in zwei Anläufen.
   *
   * Erst direkt aus dem Browser — so tut es das Widget seit jeher, und bei
   * unseren eigenen Servern sieht der Lernende dabei den echten Verkehr im
   * Netzwerk-Panel. Scheitert das (bei fremden Servern praktisch immer, weil
   * kein CORS-Header für unseren Origin kommt), übernimmt der Server. Der sieht
   * dann auch ein 401 und kann die Anmeldung anstossen — der Browser bekäme an
   * dieser Stelle nur einen undurchsichtigen CORS-Fehler.
   */
  const connect = async (e?: FormEvent) => {
    e?.preventDefault()
    const u = url.trim()
    if (!u || status === 'connecting') return
    setStatus('connecting')
    setConnectError(null)
    setAuthUrl(null)
    setTools([])
    setSelected(null)
    setResult(null)

    try {
      // initialize is best-effort (nice server name); tools/list is the real goal.
      const [info, list] = await Promise.all([mcpInitialize(u).catch(() => ({})), mcpListTools(u)])
      setServerInfo(info)
      setTools(list)
      setMode('direct')
      setAuthenticated(false)
      setStatus('connected')
      persist({ urlEntered: true })
      return
    } catch {
      // Weiter über den Server.
    }

    try {
      const probe = await mcpProbe(u)
      if (probe.state === 'connected') {
        setServerInfo({})
        setTools(probe.tools)
        setMode('proxy')
        setAuthenticated(probe.authenticated)
        setStatus('connected')
        persist({ urlEntered: true })
        return
      }
      if (probe.state === 'auth_required') {
        setAuthUrl(probe.authorizationUrl)
        setMode('proxy')
        setStatus('auth')
        return
      }
      setStatus('error')
      setConnectError(probe.error)
    } catch (err) {
      setStatus('error')
      setConnectError((err as Error).message)
    }
  }

  const signIn = async () => {
    if (!authUrl) return
    setStatus('signing_in')
    setConnectError(null)
    const ok = await runOAuthPopup(authUrl)
    // Auch bei `false` nachfassen: manche Browser unterdrücken die Nachricht aus
    // dem Fenster, die Anmeldung kann trotzdem geklappt haben.
    const probe = await mcpProbe(url.trim()).catch(() => null)
    if (probe?.state === 'connected') {
      setTools(probe.tools)
      setAuthenticated(probe.authenticated)
      setStatus('connected')
      persist({ urlEntered: true })
      return
    }
    setStatus('auth')
    if (probe?.state === 'auth_required') setAuthUrl(probe.authorizationUrl)
    setConnectError(ok ? (probe?.state === 'error' ? probe.error : t.authFailed) : t.authFailed)
  }

  const signOut = async () => {
    await mcpDisconnect(url.trim()).catch(() => undefined)
    setAuthenticated(false)
    setTools([])
    setSelected(null)
    setStatus('idle')
  }

  const pickTool = (tool: McpToolDef) => {
    setSelected(tool)
    setResult(null)
    setCallError(null)
    const props = tool.inputSchema?.properties ?? {}
    const init: Record<string, string> = {}
    for (const [k, p] of Object.entries(props)) init[k] = p.default != null ? String(p.default) : ''
    setArgs(init)
  }

  const run = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!selected || calling) return
    setCalling(true)
    setResult(null)
    setCallError(null)
    try {
      const call = mode === 'proxy' ? mcpCallToolViaServer : mcpCallTool
      const r = await call(url.trim(), selected.name, coerceArgs(selected, args))
      setResult(r)
      persist({ toolFired: true, toolName: selected.name })
    } catch (err) {
      // Token abgelaufen oder zurückgezogen: zurück in den Anmeldezustand statt
      // einer Fehlermeldung, mit der niemand etwas anfangen kann.
      if (err instanceof McpAuthRequiredError) {
        const probe = await mcpProbe(url.trim()).catch(() => null)
        if (probe?.state === 'auth_required') {
          setAuthUrl(probe.authorizationUrl)
          setAuthenticated(false)
          setStatus('auth')
          setCalling(false)
          return
        }
      }
      setCallError((err as Error).message)
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="space-y-3">
      {artifact.title && <p className="font-sans font-semibold text-slate-800">{artifact.title}</p>}
      {artifact.instructions && <p className="text-sm text-slate-500">{artifact.instructions}</p>}

      {/* Connection bar */}
      <form onSubmit={connect} className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.urlPlaceholder}
          className="min-w-0 flex-1 rounded-md border border-mist bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/20"
        />
        <button
          type="submit"
          disabled={!url.trim() || status === 'connecting'}
          className="shrink-0 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
        >
          {status === 'connecting' ? t.connecting : t.connect}
        </button>
      </form>

      {/* Anmeldung, wenn der Server eine verlangt */}
      {(status === 'auth' || status === 'signing_in') && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-900">{t.authRequired}</p>
          <p className="mt-0.5 text-xs text-amber-900">{t.authHint}</p>
          <button
            type="button"
            onClick={signIn}
            disabled={status === 'signing_in' || !authUrl}
            className="mt-2 rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
          >
            {status === 'signing_in' ? t.signingIn : t.signIn}
          </button>
          {connectError && <p className="mt-2 text-xs text-red-800">{connectError}</p>}
        </div>
      )}

      {/* Woher die Antworten kommen — direkt oder über uns, mit oder ohne Konto */}
      {status === 'connected' && mode === 'proxy' && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded bg-cream px-1.5 py-0.5 font-semibold text-slate-600">
            {t.viaProxy}
          </span>
          {authenticated && (
            <>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                {t.authenticated}
              </span>
              <button type="button" onClick={signOut} className="text-slate-400 hover:text-red-700">
                {t.signOut}
              </button>
            </>
          )}
        </div>
      )}

      {/* Progress steps */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <StepChip on={urlEntered.current} label={t.stepUrl} />
        <StepChip on={toolFired.current} label={t.stepTool} />
        {urlEntered.current && toolFired.current && (
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-semibold text-white">{t.done}</span>
        )}
      </div>

      {connectError && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{connectError}</div>
      )}

      {status === 'connected' && (
        <div className="rounded-lg border border-mist bg-cream/40">
          <div className="border-b border-mist px-3 py-2 text-xs text-slate-500">
            {t.connected}
            {serverInfo?.name ? `: ${serverInfo.name}` : ''}
            {serverInfo?.version ? ` · v${serverInfo.version}` : ''}
          </div>
          {tools.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500">{t.noTools}</p>
          ) : (
            <div className="grid gap-3 p-3 md:grid-cols-[minmax(9rem,14rem)_1fr]">
              {/* Tool list */}
              <ul className="space-y-1 list-none">
                <li className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-kicker text-slate-400">{t.tools}</li>
                {tools.map((tool) => (
                  <li key={tool.name}>
                    <button
                      type="button"
                      onClick={() => pickTool(tool)}
                      className={`w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                        selected?.name === tool.name ? 'bg-navy text-white' : 'text-navy hover:bg-white'
                      }`}
                    >
                      <span className="font-medium">{tool.title || tool.name}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Tool detail + params */}
              <div className="min-w-0 rounded-md border border-mist bg-white p-3">
                {!selected ? (
                  <p className="text-sm text-slate-400">{t.selectToolHint}</p>
                ) : (
                  <form onSubmit={run} className="space-y-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-navy">{selected.name}</p>
                      {selected.description && <p className="mt-1 text-xs text-slate-500">{selected.description}</p>}
                    </div>
                    <ParamFields tool={selected} args={args} setArgs={setArgs} />
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={calling}
                        className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark disabled:opacity-50"
                      >
                        {calling ? t.running : t.run}
                      </button>
                    </div>

                    {callError && (
                      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {t.error}: {callError}
                      </div>
                    )}
                    {result && <ResultView result={result} />}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
        on ? 'bg-emerald-50 text-emerald-700' : 'bg-mist/60 text-slate-400'
      }`}
    >
      <span aria-hidden>{on ? '✓' : '○'}</span>
      {label}
    </span>
  )
}

function ParamFields({
  tool,
  args,
  setArgs,
}: {
  tool: McpToolDef
  args: Record<string, string>
  setArgs: (updater: (prev: Record<string, string>) => Record<string, string>) => void
}) {
  const props = tool.inputSchema?.properties ?? {}
  const required = new Set(tool.inputSchema?.required ?? [])
  const keys = Object.keys(props)
  if (keys.length === 0) return <p className="text-xs text-slate-400">{t.noParams}</p>

  const set = (k: string, v: string) => setArgs((prev) => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-kicker text-slate-400">{t.parameters}</p>
      {keys.map((k) => {
        const p = props[k]
        const type = Array.isArray(p.type) ? p.type[0] : p.type
        const inputCls =
          'w-full rounded-md border border-mist bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-navy'
        return (
          <label key={k} className="block">
            <span className="mb-0.5 block text-xs font-medium text-navy">
              {k}
              {required.has(k) && <span className="ml-1 text-red-500">*</span>}
              {p.description && <span className="ml-2 font-normal text-slate-400">{p.description}</span>}
            </span>
            {Array.isArray(p.enum) && p.enum.length > 0 ? (
              <select className={inputCls} value={args[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
                <option value="">—</option>
                {p.enum.map((opt) => (
                  <option key={String(opt)} value={String(opt)}>
                    {String(opt)}
                  </option>
                ))}
              </select>
            ) : type === 'boolean' ? (
              <input
                type="checkbox"
                checked={args[k] === 'true'}
                onChange={(e) => set(k, e.target.checked ? 'true' : 'false')}
                className="h-4 w-4"
              />
            ) : type === 'number' || type === 'integer' ? (
              <input type="number" className={inputCls} value={args[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
            ) : (
              <input type="text" className={inputCls} value={args[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
            )}
          </label>
        )
      })}
    </div>
  )
}

function ResultView({ result }: { result: McpCallResult }) {
  const textParts = (result.content ?? []).filter((c) => c.type === 'text' && typeof c.text === 'string')
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-kicker text-slate-400">{t.result}</p>
      <pre
        className={`max-h-72 overflow-auto rounded-md border p-3 text-xs leading-relaxed ${
          result.isError ? 'border-red-200 bg-red-50 text-red-800' : 'border-mist bg-cream/50 text-slate-800'
        }`}
      >
        {textParts.length > 0
          ? textParts.map((c) => c.text).join('\n\n')
          : JSON.stringify(result.content ?? result, null, 2)}
      </pre>
    </div>
  )
}

/** Coerce string form values to typed args by the tool's input schema. */
function coerceArgs(tool: McpToolDef, args: Record<string, string>): Record<string, unknown> {
  const props = tool.inputSchema?.properties ?? {}
  const out: Record<string, unknown> = {}
  for (const [k, p] of Object.entries(props) as [string, McpProp][]) {
    const raw = args[k]
    const type = Array.isArray(p.type) ? p.type[0] : p.type
    if (type === 'boolean') {
      if (raw === 'true') out[k] = true
      continue
    }
    if (raw == null || raw === '') continue
    if (type === 'number' || type === 'integer') {
      const n = Number(raw)
      if (!Number.isNaN(n)) out[k] = n
    } else {
      out[k] = raw
    }
  }
  return out
}
