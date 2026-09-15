// Welche Sprache gerade gilt — und wie man es erfährt, wenn sie wechselt.
//
// Absichtlich ausserhalb von React: `labels` wird an 31 Stellen auf Modulebene
// abgegriffen (`const t = labels.editor`), und Modulhelfer wie `fieldProblem`
// können keine Hooks aufrufen. Ein Hook als einziger Zugang hätte bedeutet,
// diese Funktionen umzubauen und `t` durchzureichen — viel Bewegung an Code,
// der mit Sprache nichts zu tun hat.
//
// Der Zustand liegt deshalb hier, und `index.ts` legt eine lebende Sicht
// darüber. React erfährt über `subscribe` davon und rendert neu.

export const LOCALES = ['de', 'en', 'it'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABEL: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  it: 'Italiano',
}

/** Die Sprache, in der die Plattform entstanden ist und auf die zurückgefallen wird. */
export const FALLBACK_LOCALE: Locale = 'de'

const STORAGE_KEY = 'aire_locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/**
 * Erstwahl beim Laden: gespeicherte Wahl, sonst Browsersprache, sonst Deutsch.
 *
 * Die gespeicherte Wahl schlägt den Browser, weil sie die jüngere und
 * ausdrücklichere Aussage ist: wer einmal umgeschaltet hat, meint es auch beim
 * nächsten Besuch so.
 */
function initial(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLocale(stored)) return stored
  } catch {
    // Speicher nicht verfügbar — dann eben der Browser.
  }
  for (const tag of typeof navigator !== 'undefined' ? navigator.languages ?? [] : []) {
    const base = tag.toLowerCase().split('-')[0]
    if (isLocale(base)) return base
  }
  return FALLBACK_LOCALE
}

let current: Locale = initial()
const listeners = new Set<() => void>()

export function getLocale(): Locale {
  return current
}

export function setLocale(next: Locale): void {
  if (next === current) return
  current = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Die Wahl gilt für diese Sitzung; beim nächsten Besuch entscheidet der Browser.
  }
  // Dokumentsprache mitziehen: Vorlesesoftware und die Silbentrennung des
  // Browsers richten sich danach, und beides fällt niemandem auf, der es nicht
  // braucht.
  if (typeof document !== 'undefined') document.documentElement.lang = next
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof document !== 'undefined') document.documentElement.lang = current
