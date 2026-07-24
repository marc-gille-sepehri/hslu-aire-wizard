// Chat client for the course-material RAG assistant.
//
// The browser never talks to the RAG service directly: it POSTs the question to
// hslu-aire-server (POST /chat/stream, guarded by the training JWT), which
// relays to the real streaming service server-to-server and streams normalised
// events back as Server-Sent Events. Each `data:` line is one JSON ChatEvent:
//   { type: 'token', text }      — append to the current answer
//   { type: 'sources', sources } — citations for the finished answer
//   { type: 'done' }             — the answer is complete
//   { type: 'error', message }   — something went wrong

import { apiBaseUrl } from '../../config/configuration'
import { getStoredToken } from '../auth/AuthContext'

export interface ChatSource {
  label: string
  url?: string
}

/** A clickable follow-up the agent offered (tool choice / action chip / suggestion). */
export interface ChatChoice {
  label: string
  prompt: string
  userText: string
  exclusiveToolId?: string
  description?: string
}

export interface StreamHandlers {
  /** Called for each streamed chunk of text (append to the current message). */
  onToken: (chunk: string) => void
  /** Called once when the answer is complete, with any retrieved sources + choices. */
  onDone: (sources: ChatSource[], choices: ChatChoice[]) => void
  onError: (err: Error) => void
}

export interface StreamOptions {
  /** Pins routing to one tool, e.g. `{ exclusiveToolsFilter: [toolId] }`. */
  toolsFilter?: unknown
}

/** Start streaming an answer. Returns an abort function. */
export type StreamAnswer = (question: string, handlers: StreamHandlers, options?: StreamOptions) => () => void

type ChatEvent =
  | { type: 'token'; text: string }
  | { type: 'sources'; sources: ChatSource[] }
  | { type: 'choices'; choices: ChatChoice[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

export const streamAnswer: StreamAnswer = (question, { onToken, onDone, onError }, options) => {
  const controller = new AbortController()

  ;(async () => {
    let sources: ChatSource[] = []
    let choices: ChatChoice[] = []
    try {
      const token = getStoredToken()
      const res = await fetch(`${apiBaseUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, ...(options?.toolsFilter ? { toolsFilter: options.toolsFilter } : {}) }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        onError(new Error(`Chat-Dienst nicht erreichbar (${res.status})`))
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      const handle = (evt: ChatEvent): boolean => {
        if (evt.type === 'token') onToken(evt.text)
        else if (evt.type === 'sources') sources = evt.sources
        else if (evt.type === 'choices') choices = evt.choices
        else if (evt.type === 'error') {
          onError(new Error(evt.message))
          return true
        } else if (evt.type === 'done') {
          onDone(sources, choices)
          return true
        }
        return false
      }

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // SSE frames are separated by a blank line.
        let sep: number
        while ((sep = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, sep)
          buf = buf.slice(sep + 2)
          const dataLine = frame
            .split('\n')
            .find((l) => l.startsWith('data:'))
          if (!dataLine) continue
          const json = dataLine.slice(5).trim()
          if (!json) continue
          let evt: ChatEvent
          try {
            evt = JSON.parse(json)
          } catch {
            continue
          }
          if (handle(evt)) return
        }
      }

      // Stream ended without an explicit done event — settle gracefully.
      onDone(sources, choices)
    } catch (e) {
      if (controller.signal.aborted) return
      onError(e as Error)
    }
  })()

  return () => controller.abort()
}
