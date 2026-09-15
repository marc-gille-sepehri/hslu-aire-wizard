import { LOCALES, LOCALE_LABEL, getLocale, isLocale, setLocale, useLocale } from '../labels'

/**
 * Sprachwahl — eine Auswahlliste, kein Knopfband.
 *
 * Drei Knöpfe nebeneinander kosten in der Kopfzeile so viel Platz wie ein
 * Menüpunkt, und sie kämpfen mit den Menüpunkten um Aufmerksamkeit, die sie
 * nicht verdienen: Sprache wählt man einmal, Menüpunkte benutzt man dauernd.
 *
 * Die Einträge nennen die Sprache so, wie sie sich selbst nennt: Deutsch,
 * English, Italiano. Kürzel wie „IT" spart zwar Platz, verlangt aber gerade von
 * denen eine Übersetzungsleistung, die die Sprache suchen — und „Deutsch" ist
 * immer noch schmaler als drei Knöpfe nebeneinander.
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
          {LOCALE_LABEL[locale]}
        </option>
      ))}
    </select>
  )
}

/** Für Stellen, die nur wissen wollen, was gerade gilt. */
export { getLocale }
