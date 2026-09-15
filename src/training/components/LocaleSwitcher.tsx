import { LOCALES, LOCALE_LABEL, getLocale, isLocale, setLocale, useLocale } from '../labels'

/**
 * Sprachwahl — eine Auswahlliste, kein Knopfband.
 *
 * Drei Knöpfe nebeneinander kosten in der Kopfzeile so viel Platz wie ein
 * Menüpunkt, und sie kämpfen mit den Menüpunkten um Aufmerksamkeit, die sie
 * nicht verdienen: Sprache wählt man einmal, Menüpunkte benutzt man dauernd.
 *
 * Die Liste zeigt das Kürzel der aktiven Sprache; die vollen Namen stehen in
 * den Einträgen, wo sie beim Aufklappen gebraucht werden. `title` nennt den
 * vollen Namen auch im zugeklappten Zustand — für alle, denen „IT" nichts sagt.
 */
export default function LocaleSwitcher({ className = '' }: { className?: string }) {
  const active = useLocale()
  return (
    <select
      className={`locale-switcher ${className}`}
      value={active}
      title={LOCALE_LABEL[active]}
      aria-label={LOCALE_LABEL[active]}
      onChange={(e) => {
        const next = e.target.value
        if (isLocale(next)) setLocale(next)
      }}
    >
      {LOCALES.map((locale) => (
        <option key={locale} value={locale} lang={locale}>
          {locale.toUpperCase()} · {LOCALE_LABEL[locale]}
        </option>
      ))}
    </select>
  )
}

/** Für Stellen, die nur wissen wollen, was gerade gilt. */
export { getLocale }
