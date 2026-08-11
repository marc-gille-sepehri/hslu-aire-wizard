// Splitting a long text the way a RAG pipeline does, so the seams are visible.
//
// The lesson this exists to teach is that retrieval never sees a document. It
// sees fragments somebody cut, and where the cut fell decides what can be found
// afterwards. A widget that swallowed a pasted page whole would hide exactly
// that.
//
// Size is counted in characters, not tokens: a browser has no tokenizer, and
// pretending otherwise would put a fictional number on the screen. As a rule of
// thumb one token is roughly four characters of German prose, so 800 characters
// is on the order of 200 tokens.

/** Cut points, best first. A chunk should end where a reader would pause. */
const SENTENCE_END = /[.!?…](?=\s|$)/g
const PARAGRAPH_END = /\n\s*\n/g

/** Never cut before this share of the window — a boundary is not worth a stub. */
const MIN_FILL = 0.6

export interface Chunk {
  text: string
  /** 1-based, for the label in the list. */
  index: number
  total: number
}

/**
 * Find where to end a chunk that starts at `from`.
 *
 * Prefers a paragraph break, then a sentence end, then a word boundary, then a
 * hard cut — the same ladder a recursive character splitter walks. Each step is
 * only taken if it leaves the chunk at least {@link MIN_FILL} full, otherwise a
 * single early full stop would produce a two-word chunk.
 */
function breakAt(text: string, from: number, size: number): number {
  const hardEnd = Math.min(from + size, text.length)
  if (hardEnd >= text.length) return text.length

  const window = text.slice(from, hardEnd)
  const floor = Math.floor(size * MIN_FILL)

  const lastMatch = (re: RegExp): number => {
    let found = -1
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(window)) !== null) {
      if (m.index + m[0].length >= floor) found = m.index + m[0].length
      if (m.index === re.lastIndex) re.lastIndex++ // zero-width guard
    }
    return found
  }

  const paragraph = lastMatch(PARAGRAPH_END)
  if (paragraph > 0) return from + paragraph

  const sentence = lastMatch(SENTENCE_END)
  if (sentence > 0) return from + sentence

  const space = window.lastIndexOf(' ')
  if (space >= floor) return from + space

  return hardEnd // a word longer than the window, or a language without spaces
}

/** Start the next chunk on a word, not inside one. */
function snapToWord(text: string, at: number): number {
  if (at <= 0 || at >= text.length) return at
  if (/\s/.test(text[at - 1])) return at
  const space = text.indexOf(' ', at)
  // Only if the word ends nearby; otherwise the overlap would evaporate.
  return space > 0 && space - at < 40 ? space + 1 : at
}

/**
 * Split `text` into overlapping chunks of at most `size` characters.
 *
 * `overlap` is how many characters of the previous chunk the next one repeats —
 * the usual remedy for a fact that straddles a cut.
 *
 * Clamped to half the window. Beyond that each chunk is mostly its predecessor,
 * the count grows without the content doing so, and at `overlap >= size` the
 * walk would not advance at all. Half is also past anything a real pipeline
 * uses; typical values are a tenth to a fifth.
 */
export function chunkText(text: string, size: number, overlap: number): Chunk[] {
  const source = text.trim()
  if (!source) return []
  const window = Math.max(1, Math.floor(size))
  if (source.length <= window) return [{ text: source, index: 1, total: 1 }]

  const step = Math.max(0, Math.min(Math.floor(overlap), Math.floor(window / 2)))
  const parts: string[] = []
  let from = 0

  while (from < source.length) {
    const end = breakAt(source, from, window)
    const piece = source.slice(from, end).trim()
    if (piece) parts.push(piece)
    if (end >= source.length) break
    // Always advance, whatever the overlap and wherever the break landed.
    from = snapToWord(source, Math.max(end - step, from + 1))
  }

  return parts.map((t, i) => ({ text: t, index: i + 1, total: parts.length }))
}
