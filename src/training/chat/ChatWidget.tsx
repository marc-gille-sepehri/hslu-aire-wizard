import { useEffect, useRef, useState, type FormEvent } from 'react'
import { labels } from '../labels'
import { streamAnswer, type ChatChoice, type ChatSource } from './chatApi'
import { mdToHtml } from './markdownLite'

const t = labels.chat

type Role = 'user' | 'bot'
interface Message {
  id: string
  role: Role
  text: string
  streaming?: boolean
  sources?: ChatSource[]
  choices?: ChatChoice[]
}

let seq = 0
const nextId = () => `m${Date.now().toString(36)}-${seq++}`

// Agent answers arrive as text with interleaved `<div class="progress">…</div>`
// status markup (and occasionally other HTML). We never render raw HTML (the
// answer can include untrusted web content); instead we split the text into
// ordered segments — agent status vs. answer — and render each as plain text
// with its own styling (status = small + grey).
type BotSegment = { kind: 'answer' | 'progress'; text: string }

const PROGRESS_OPEN_RE = /<div\b[^>]*class=["']progress["'][^>]*>/i
const stripTags = (s: string) => s.replace(/<\/?[^>]+>/g, '')

function parseBotSegments(raw: string): BotSegment[] {
  const out: BotSegment[] = []
  const pushAnswer = (t: string) => {
    const x = stripTags(t).replace(/^\s+/, '')
    if (x.trim()) out.push({ kind: 'answer', text: x })
  }
  const pushProgress = (t: string) => {
    const x = stripTags(t).trim()
    if (x) out.push({ kind: 'progress', text: x })
  }
  let rest = raw
  for (;;) {
    const m = PROGRESS_OPEN_RE.exec(rest)
    if (!m) {
      pushAnswer(rest)
      break
    }
    pushAnswer(rest.slice(0, m.index))
    const afterOpen = rest.slice(m.index + m[0].length)
    const closeIdx = afterOpen.indexOf('</div>')
    if (closeIdx === -1) {
      // Still streaming: the progress line isn't closed yet.
      pushProgress(afterOpen)
      break
    }
    pushProgress(afterOpen.slice(0, closeIdx))
    rest = afterOpen.slice(closeIdx + '</div>'.length)
  }
  return out
}

/** Render a bot message: grey status lines + normal answer text + live cursor. */
function BotContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const segments = parseBotSegments(text)
  const hasAnswer = segments.some((s) => s.kind === 'answer')
  return (
    <>
      {segments.map((s, i) =>
        s.kind === 'progress' ? (
          <div key={i} className="mb-1 text-[11px] italic leading-snug text-slate-400">
            {s.text}
          </div>
        ) : (
          <div key={i} className="chat-md" dangerouslySetInnerHTML={{ __html: mdToHtml(s.text) }} />
        ),
      )}
      {streaming && !hasAnswer && <TypingDots />}
      {streaming && hasAnswer && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-navy/60 align-middle" />}
    </>
  )
}

/**
 * Floating course-material assistant — the familiar corner chat bubble found on
 * banking / marketplace sites. Answers stream from the RAG service via the
 * hslu-aire-server relay (see chatApi.ts).
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<null | (() => void)>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the transcript scrolled to the bottom as it grows / streams.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open])

  // Focus the input when the panel opens.
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Abort any in-flight stream on unmount.
  useEffect(() => () => abortRef.current?.(), [])

  const send = (question: string, opts?: { userText?: string; toolsFilter?: unknown }) => {
    const q = question.trim()
    if (!q || streaming) return
    setInput('')

    const botId = nextId()
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: opts?.userText?.trim() || q },
      { id: botId, role: 'bot', text: '', streaming: true },
    ])
    setStreaming(true)

    abortRef.current = streamAnswer(
      q,
      {
        onToken: (chunk) =>
          setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text: m.text + chunk } : m))),
        onDone: (sources, choices) => {
          setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, streaming: false, sources, choices } : m)))
          setStreaming(false)
          abortRef.current = null
        },
        onError: () => {
          setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, streaming: false, text: t.error } : m)))
          setStreaming(false)
          abortRef.current = null
        },
      },
      opts?.toolsFilter ? { toolsFilter: opts.toolsFilter } : undefined,
    )
  }

  /** A tool/suggestion chip was clicked: show its label, route to its tool. */
  const chooseChip = (choice: ChatChoice) => {
    send(choice.prompt, {
      userText: choice.userText,
      toolsFilter: choice.exclusiveToolId ? { exclusiveToolsFilter: [choice.exclusiveToolId] } : undefined,
    })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="training-root font-sans">
      {/* Launcher */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition-transform hover:scale-105 hover:bg-navy-light"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
          </svg>
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-navy bg-gold" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[560px] max-h-[calc(100vh-3rem)] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-mist bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-3 bg-navy px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg">🤖</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{t.title}</p>
              <p className="truncate text-xs text-white/70">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="text-white/70 transition-colors hover:text-white"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-cream/50 px-4 py-4">
            <BotBubble>{t.welcome}</BotBubble>

            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="px-1 text-xs font-semibold uppercase tracking-kicker text-slate-400">{t.suggestionsTitle}</p>
                {t.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-mist bg-white px-3 py-2 text-left text-sm text-navy transition-colors hover:border-navy hover:bg-white"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <UserBubble key={m.id}>{m.text}</UserBubble>
              ) : (
                <BotBubble
                  key={m.id}
                  sources={m.sources}
                  // Chips are actionable only on the latest message and when idle.
                  choices={i === messages.length - 1 && !streaming ? m.choices : undefined}
                  onChoose={chooseChip}
                >
                  <BotContent text={m.text} streaming={m.streaming} />
                </BotBubble>
              ),
            )}
          </div>

          {/* Composer */}
          <form onSubmit={onSubmit} className="border-t border-mist bg-white px-3 py-3">
            <div className="flex items-end gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.placeholder}
                className="flex-1 rounded-full border border-mist bg-cream/60 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-navy focus:ring-4 focus:ring-gold/30"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                aria-label={t.send}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-navy transition-colors hover:bg-gold-dark disabled:opacity-50"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
            <p className="mt-2 px-1 text-center text-[11px] text-slate-400">{t.disclaimer}</p>
          </form>
        </div>
      )}
    </div>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-navy px-3.5 py-2 text-sm text-white">
        {children}
      </div>
    </div>
  )
}

function BotBubble({
  children,
  sources,
  choices,
  onChoose,
}: {
  children: React.ReactNode
  sources?: ChatSource[]
  choices?: ChatChoice[]
  onChoose?: (choice: ChatChoice) => void
}) {
  return (
    <div className="flex justify-start gap-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-sm text-white">🤖</span>
      <div className="max-w-[85%]">
        <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-mist bg-white px-3.5 py-2 text-sm leading-relaxed text-slate-800">
          {children}
        </div>
        {sources && sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 pl-1">
            <span className="text-[11px] font-semibold uppercase tracking-kicker text-slate-400">{labels.chat.sources}:</span>
            {sources.map((s, i) => (
              <span key={i} className="rounded-full bg-cream px-2 py-0.5 text-[11px] text-slate-600">
                {s.label}
              </span>
            ))}
          </div>
        )}
        {choices && choices.length > 0 && onChoose && (
          <div className="mt-2 flex flex-col items-start gap-1.5">
            {choices.map((c, i) => (
              <button
                key={`${c.label}-${i}`}
                type="button"
                onClick={() => onChoose(c)}
                title={c.description}
                className="max-w-full rounded-full border border-navy/30 bg-white px-3 py-1.5 text-left text-[13px] font-medium text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="…">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </span>
  )
}
