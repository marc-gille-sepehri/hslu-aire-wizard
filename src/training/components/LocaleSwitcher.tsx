import { LOCALES, LOCALE_LABEL, setLocale, useLocale } from '../labels'

/**
 * Sprachwahl.
 *
 * Drei Sprachen, also Knöpfe statt Auswahlliste: bei drei Einträgen kostet eine
 * Liste einen Klick mehr und verbirgt, dass es überhaupt eine Wahl gibt.
 *
 * Kurzformen (DE · EN · IT) mit vollem Namen als Titel — in einer Kopfzeile
 * konkurriert „Deutsch English Italiano" mit allem anderen um Platz, und wer
 * die Sprache wechseln will, erkennt sein Kürzel.
 */
export default function LocaleSwitcher({ className = '' }: { className?: string }) {
  const active = useLocale()
  return (
    <div className={`flex items-center gap-0.5 ${className}`} role="group" aria-label="Sprache">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setLocale(locale)}
          lang={locale}
          title={LOCALE_LABEL[locale]}
          aria-current={locale === active ? 'true' : undefined}
          className={
            'rounded px-1.5 py-0.5 font-sans text-xs font-semibold uppercase transition-colors ' +
            (locale === active
              ? 'bg-navy text-white'
              : 'text-slate-400 hover:bg-mist hover:text-slate-700')
          }
        >
          {locale}
        </button>
      ))}
    </div>
  )
}
