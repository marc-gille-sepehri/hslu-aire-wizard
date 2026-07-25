// Minimal ZIP writer (STORE / no compression) — no dependencies. Enough to
// bundle a Claude Skill (a few text files) into a downloadable .zip in the browser.

function crc32(bytes: Uint8Array): number {
  let crc = ~0
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return ~crc >>> 0
}

const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff])
const u32 = (n: number) =>
  new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff])

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export interface ZipEntry {
  /** Path inside the archive, e.g. "kurs-autor/SKILL.md". */
  name: string
  content: string
}

/** Build a valid (uncompressed) .zip Blob from text entries. */
export function makeZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const e of entries) {
    const nameBytes = enc.encode(e.name)
    const data = enc.encode(e.content)
    const crc = crc32(data)

    const local = concat([
      u32(0x04034b50), // local file header signature
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method 0 = store
      u16(0),
      u16(0), // mod time / date
      u32(crc),
      u32(data.length), // compressed size
      u32(data.length), // uncompressed size
      u16(nameBytes.length),
      u16(0), // extra length
      nameBytes,
      data,
    ])
    locals.push(local)

    const central = concat([
      u32(0x02014b50), // central directory header signature
      u16(20), // version made by
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method
      u16(0),
      u16(0), // mod time / date
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(nameBytes.length),
      u16(0), // extra
      u16(0), // comment
      u16(0), // disk number
      u16(0), // internal attrs
      u32(0), // external attrs
      u32(offset), // local header offset
      nameBytes,
    ])
    centrals.push(central)
    offset += local.length
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocd = concat([
    u32(0x06054b50), // end of central directory signature
    u16(0), // disk
    u16(0), // disk with central dir
    u16(entries.length),
    u16(entries.length),
    u32(centralSize),
    u32(offset), // central dir offset
    u16(0), // comment length
  ])

  const all = concat([...locals, ...centrals, eocd])
  // Cast around lib.dom's strict BlobPart<ArrayBuffer> (a fresh Uint8Array is fine).
  return new Blob([all as unknown as BlobPart], { type: 'application/zip' })
}
