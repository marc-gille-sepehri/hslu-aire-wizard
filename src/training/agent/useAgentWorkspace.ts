// Shared workspace state for every `agent_trace` block on the page.
//
// The spec's first acceptance criterion is that two widget instances in
// different modules show the same state and the same streaming run. Across
// modules that follows from the server-side stream. Within one page it would
// not: two instances would open two connections and drift apart on the first
// dropped frame. So the subscription lives here, at module level, reference
// counted — one connection per tab, however many blocks are mounted.

import { useEffect, useRef, useState } from 'react'
import {
  fetchState,
  streamWorkspace,
  type AgentEvent,
  type AgentState,
  type Run,
} from './agentApi'

export interface WorkspaceView {
  state: AgentState | null
  run: Run | null
  loading: boolean
  error: string | null
  /** Re-reads everything from the server; used after a scenario swap or delete. */
  refresh: () => Promise<void>
}

type Snapshot = { state: AgentState | null; run: Run | null; error: string | null }

let shared: Snapshot = { state: null, run: null, error: null }
let subscribers = new Set<(s: Snapshot) => void>()
let disconnect: (() => void) | null = null
let loadingPromise: Promise<void> | null = null

function emit(next: Partial<Snapshot>): void {
  shared = { ...shared, ...next }
  for (const s of subscribers) s(shared)
}

/** Runs arrive both as whole documents and as individual steps; merge both. */
function applyEvent(event: AgentEvent): void {
  const current = shared.run

  switch (event.type) {
    case 'snapshot':
      emit({
        state: shared.state ? { ...shared.state, workspace: event.workspace } : shared.state,
        // Only adopt the server's run if we have nothing, or it is a different
        // one — a snapshot arriving after a reconnect must not roll back steps
        // that came in while the request was in flight.
        run: event.run && (!current || current.runId !== event.run.runId) ? event.run : current,
        error: null,
      })
      return

    case 'workspace':
      emit({ state: shared.state ? { ...shared.state, workspace: event.workspace } : shared.state })
      return

    case 'queue':
      emit({
        state: shared.state
          ? { ...shared.state, workspace: { ...shared.state.workspace, queue: event.queue } }
          : shared.state,
      })
      return

    case 'run_started':
      emit({ run: event.run })
      return

    case 'step': {
      if (!current || current.runId !== event.runId) return
      // Steps are appended by number, not by arrival: a reconnect can replay.
      if (current.steps.some((s) => s.n === event.step.n)) return
      emit({ run: { ...current, steps: [...current.steps, event.step] } })
      return
    }

    case 'intent': {
      if (!current || current.runId !== event.runId) return
      if (current.intents.some((i) => i.intentId === event.intent.intentId)) return
      emit({ run: { ...current, intents: [...current.intents, event.intent] } })
      return
    }

    case 'intent_resolved': {
      if (!current || current.runId !== event.runId) return
      emit({
        run: {
          ...current,
          intents: current.intents.map((i) =>
            i.intentId === event.intent.intentId ? event.intent : i,
          ),
        },
      })
      return
    }

    case 'run_ended':
      // Keep the streamed steps: the final document is authoritative about the
      // outcome, the stream about what the learner has already watched happen.
      emit({
        run:
          current && current.runId === event.run.runId
            ? { ...event.run, steps: current.steps.length >= event.run.steps.length ? current.steps : event.run.steps }
            : event.run,
      })
      return
  }
}

async function load(): Promise<void> {
  try {
    const state = await fetchState()
    emit({ state, run: shared.run ?? state.run, error: null })
  } catch (err) {
    emit({ error: err instanceof Error ? err.message : 'Der Arbeitsbereich ist nicht erreichbar.' })
  }
}

export function refreshWorkspace(): Promise<void> {
  // Force a re-read even if a run is in flight (scenario swap, delete).
  shared = { ...shared, run: null }
  return load()
}

export function useAgentWorkspace(): WorkspaceView {
  const [snapshot, setSnapshot] = useState<Snapshot>(shared)
  const [loading, setLoading] = useState(!shared.state)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    subscribers.add(setSnapshot)

    if (!disconnect) {
      disconnect = streamWorkspace(applyEvent, (message) => emit({ error: message }))
    }
    if (!shared.state && !loadingPromise) {
      loadingPromise = load().finally(() => {
        loadingPromise = null
      })
    }
    void (loadingPromise ?? Promise.resolve()).then(() => {
      if (mounted.current) setLoading(false)
    })

    return () => {
      mounted.current = false
      subscribers.delete(setSnapshot)
      if (subscribers.size === 0) {
        disconnect?.()
        disconnect = null
      }
    }
  }, [])

  return {
    state: snapshot.state,
    run: snapshot.run,
    loading: loading && !snapshot.state,
    error: snapshot.error,
    refresh: refreshWorkspace,
  }
}
