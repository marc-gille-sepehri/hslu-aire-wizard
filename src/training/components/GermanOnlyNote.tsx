import { getLocale, labels, useLocale } from '../labels'

/**
 * „Nur auf Deutsch verfügbar".
 *
 * Erscheint ausschliesslich, wenn eine andere Sprache gewählt ist. Einer
 * deutschsprachigen Person zu sagen, dass etwas auf Deutsch vorliegt, ist
 * Rauschen — und Rauschen an einer Stelle, an der sonst eine echte Warnung
 * stehen könnte, macht die Stelle wertlos.
 *
 * `useLocale()` steht hier, obwohl `labels` ohnehin lebend ist: dieser Kasten
 * ERSCHEINT oder verschwindet mit der Sprache, und dafür braucht es ein
 * Neurendern, nicht nur einen anderen Text.
 */
export default function GermanOnlyNote({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  useLocale()
  if (getLocale() === 'de') return null
  return (
    <p
      lang="en"
      className={`rounded-md border-0 border-l-4 border-solid border-l-gold bg-gold-soft px-4 py-2 font-sans text-sm text-slate-800 ${className}`}
    >
      {text}
    </p>
  )
}

/** Bequemer Zugriff für die `.jsx`-Seiten, die den Katalog nicht getypt sehen. */
export function checkNote(): string {
  return labels.germanOnly.check
}
export function transformationNote(): string {
  return labels.germanOnly.transformation
}
