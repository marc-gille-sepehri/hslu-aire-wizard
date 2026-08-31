// Suchfilter für die Admin-Listen.
//
// Zwei Entscheidungen, die man merkt, wenn sie fehlen:
//
// Umlaute und ß werden eingeebnet. Wer „Zurich" tippt, meint Zürich, und wer
// „Strasse" tippt, meint auch „Straße" — bei Schweizer und deutschen
// Adressdaten nebeneinander ist das kein Sonderfall, sondern der Normalfall.
//
// Mehrere Wörter werden UND-verknüpft und dürfen in verschiedenen Feldern
// stehen. „meier luzern" findet die Meiers in Luzern, ohne dass man wissen muss,
// welches Feld welches ist. Eine Suche, die stattdessen die ganze Eingabe als
// eine Zeichenkette sucht, findet genau dann nichts, wenn man am meisten sucht.

/**
 * Kombinierende Zeichen, die bei der NFD-Zerlegung entstehen.
 *
 * Über die Unicode-Eigenschaft statt über einen Zeichenbereich: ein Bereich
 * `[̀-ͯ]` steht als Literal im Quelltext und übersteht nicht jede
 * Kodierungspanne unbeschadet — und wenn er kaputtgeht, sucht die Suche
 * stillschweigend falsch.
 */
const COMBINING_MARKS = /\p{M}/gu

/** Kleinschreibung, ohne Akzente, ß als ss. */
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    // Vor der Zerlegung: ß hat keine Zerlegung, aus der ss würde.
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
}

/**
 * Passt der Eintrag zur Suche? `fields` ist alles, worauf die Suche wirken
 * soll; leere und fehlende Werte stören nicht.
 */
export function matchesSearch(query: string, fields: (string | undefined | null)[]): boolean {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = normalizeForSearch(fields.filter(Boolean).join(' '))
  return terms.every((term) => haystack.includes(term))
}
