/**
 * Build a youtube.com/embed URL from a watch, short, or embed link.
 * Supports t / start (e.g. t=4s → ?start=4).
 */
export function getYoutubeEmbedSrc(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    let videoId = null

    if (host === 'youtu.be') {
      videoId = u.pathname.split('/').filter(Boolean)[0] || null
    } else if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/')[2] || null
      } else if (u.pathname === '/watch' || u.pathname.startsWith('/watch')) {
        videoId = u.searchParams.get('v')
      }
    } else if (host === 'youtube-nocookie.com') {
      if (u.pathname.startsWith('/embed/')) {
        videoId = u.pathname.split('/')[2] || null
      }
    }

    if (!videoId) return null

    const t = u.searchParams.get('t') ?? u.searchParams.get('start')
    let start = 0
    if (t) {
      const m = String(t).match(/^(\d+)/)
      if (m) start = parseInt(m[1], 10)
    }

    const params = new URLSearchParams()
    if (start > 0) params.set('start', String(start))
    const qs = params.toString()
    return `https://www.youtube.com/embed/${videoId}${qs ? `?${qs}` : ''}`
  } catch {
    return null
  }
}
