import { useEffect, useState } from 'react'
import './styles.css'
import { labels } from './labels'
import { validateModule, type ValidationFailure } from './schema/validate'
import type { Module } from './schema/types'
import SchemaError from './components/SchemaError'
import ModuleView from './components/ModuleView'

type ModuleIndexEntry = { id: string; title: string; file: string }

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid'; failures: ValidationFailure[] }
  | { kind: 'ready'; index: ModuleIndexEntry[]; selectedFile: string; mod: Module }

const MODULES_BASE = '/modules'
const INDEX_URL = `${MODULES_BASE}/index.json`
const FALLBACK_FILE = 'modul-1.json'

export default function TrainingApp() {
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let index: ModuleIndexEntry[] = []
        try {
          const r = await fetch(INDEX_URL)
          if (r.ok) {
            const data = await r.json()
            if (Array.isArray(data?.modules)) index = data.modules
          }
        } catch {
          // ignore — index.json is optional
        }
        if (index.length === 0) {
          index = [{ id: 'modul-1', title: 'Modul 1', file: FALLBACK_FILE }]
        }
        const selectedFile = index[0].file
        const res = await fetch(`${MODULES_BASE}/${selectedFile}`)
        if (!res.ok) {
          if (!cancelled) setLoad({ kind: 'error', message: `${labels.loadError} (${res.status})` })
          return
        }
        const json = await res.json()
        const validated = validateModule(json)
        if (!validated.ok) {
          if (!cancelled) setLoad({ kind: 'invalid', failures: validated.failures })
          return
        }
        if (!cancelled) setLoad({ kind: 'ready', index, selectedFile, mod: validated.module })
      } catch (e) {
        if (!cancelled) setLoad({ kind: 'error', message: (e as Error).message || labels.loadError })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const switchModule = async (file: string) => {
    if (load.kind !== 'ready' || file === load.selectedFile) return
    setLoad({ kind: 'loading' })
    try {
      const res = await fetch(`${MODULES_BASE}/${file}`)
      if (!res.ok) {
        setLoad({ kind: 'error', message: `${labels.loadError} (${res.status})` })
        return
      }
      const json = await res.json()
      const validated = validateModule(json)
      if (!validated.ok) {
        setLoad({ kind: 'invalid', failures: validated.failures })
        return
      }
      setLoad({ kind: 'ready', index: load.index, selectedFile: file, mod: validated.module })
    } catch (e) {
      setLoad({ kind: 'error', message: (e as Error).message || labels.loadError })
    }
  }

  if (load.kind === 'loading') {
    return (
      <div className="training-root font-sans">
        <div className="max-w-prose mx-auto px-4 py-10 text-slate-500">{labels.loading}</div>
      </div>
    )
  }
  if (load.kind === 'error') {
    return (
      <div className="training-root font-sans">
        <div className="max-w-prose mx-auto px-4 py-10">
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-800">{load.message}</div>
        </div>
      </div>
    )
  }
  if (load.kind === 'invalid') {
    return (
      <div className="training-root font-sans">
        <SchemaError failures={load.failures} />
      </div>
    )
  }

  return (
    <div className="training-root font-sans">
      {load.index.length > 1 && (
        <div className="max-w-prose mx-auto px-4 pt-6 -mb-6">
          <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
            {labels.moduleSelectLabel}
          </label>
          <select
            value={load.selectedFile}
            onChange={(e) => switchModule(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
          >
            {load.index.map((m) => (
              <option key={m.id} value={m.file}>{m.title}</option>
            ))}
          </select>
        </div>
      )}
      <ModuleView module={load.mod} />
    </div>
  )
}
