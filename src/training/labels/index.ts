// Der Zugang zum Beschriftungskatalog.
//
// `labels` ist KEINE Momentaufnahme, sondern eine lebende Sicht auf den gerade
// aktiven Katalog. Das ist der Grund, warum 50 Dateien unverändert bleiben
// konnten: `const t = labels.editor` auf Modulebene greift einen Stellvertreter
// ab, der bei jedem Zugriff neu nachsieht, welche Sprache gilt — kein
// eingefrorenes Objekt, das nach dem Umschalten Deutsch zeigt.
//
// Das Umschalten selbst löst kein Neurendern aus; dafür sorgt `useLocale()` an
// der Wurzel des Lernbereichs. Beides getrennt zu halten ist Absicht: der
// Katalog gehört nicht React, sondern dem Modul, und Modulhelfer wie
// `fieldProblem` dürfen ihn ohne Hook lesen.

import { useSyncExternalStore } from 'react'
import { de } from './de'
import { en } from './en'
import { it } from './it'
import { FALLBACK_LOCALE, getLocale, subscribe, type Locale } from './locale'

export type Labels = typeof de

const CATALOGUES: Record<Locale, Labels> = { de, en, it }

/**
 * Stellvertreter, der beim Zugriff nachsieht.
 *
 * Verschachtelte Sichten werden zwischengespeichert, damit `labels.editor` bei
 * jedem Zugriff dasselbe Objekt ist — sonst wäre es eine neue Identität je
 * Render und jede `useMemo`-Abhängigkeit darauf nutzlos.
 */
function liveView<T extends object>(read: () => T): T {
  const cache = new Map<PropertyKey, unknown>()
  return new Proxy(Object.create(null) as T, {
    get(_target, prop) {
      const value = (read() as Record<PropertyKey, unknown>)[prop]
      // Funktionen und Zeichenketten unverändert durchreichen — sie stammen
      // ohnehin aus dem gerade gültigen Katalog.
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
      if (!cache.has(prop)) {
        cache.set(
          prop,
          liveView(() => (read() as Record<PropertyKey, unknown>)[prop] as object),
        )
      }
      return cache.get(prop)
    },
    has(_target, prop) {
      return prop in (read() as object)
    },
    ownKeys() {
      return Reflect.ownKeys(read())
    },
    getOwnPropertyDescriptor(_target, prop) {
      const descriptor = Object.getOwnPropertyDescriptor(read(), prop)
      // `configurable` muss gesetzt sein: der Stellvertreter hat die Eigenschaft
      // selbst nicht, und ohne dieses Zugeständnis verweigert die Laufzeit die
      // Auskunft.
      return descriptor ? { ...descriptor, configurable: true } : undefined
    },
  })
}

export const labels: Labels = liveView(() => CATALOGUES[getLocale()] ?? CATALOGUES[FALLBACK_LOCALE])

/**
 * Die aktive Sprache als React-Zustand.
 *
 * Wer das an der Wurzel aufruft, sorgt dafür, dass ein Sprachwechsel den Baum
 * neu rendert — die Beschriftungen wären sonst korrekt und unsichtbar.
 */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => FALLBACK_LOCALE)
}

export { LOCALES, LOCALE_LABEL, FALLBACK_LOCALE, getLocale, setLocale, isLocale } from './locale'
export type { Locale } from './locale'
