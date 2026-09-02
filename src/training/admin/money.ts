// Geldanzeige. Beträge kommen als Rappen vom Server und werden nur hier zu
// Franken — dieselbe Regel wie serverseitig in billing.ts, damit im Dialog
// nicht ein anderer Betrag steht als auf der Rechnung.

/** Schweizer Normalsatz. Nur für die Vorschau; massgeblich ist der Server. */
export const VAT_RATE_PERCENT = 8.1

export function formatChf(rappen: number): string {
  const sign = rappen < 0 ? '-' : ''
  const abs = Math.abs(rappen)
  const francs = Math.floor(abs / 100)
  const cents = abs % 100
  const grouped = String(francs).replace(/\B(?=(\d{3})+(?!\d))/g, '’')
  return `${sign}${grouped}.${String(cents).padStart(2, '0')}`
}

/**
 * Beträge für eine Anzahl Plätze — dieselbe Rechnung wie auf dem Server:
 * Mehrwertsteuer einmal auf den Positionsbetrag, nicht je Platz.
 */
export function computeAmounts(seats: number, unitRappen: number) {
  const net = Math.round(seats * unitRappen)
  const vat = Math.round((net * VAT_RATE_PERCENT) / 100)
  return { netRappen: net, vatRappen: vat, grossRappen: net + vat }
}

/**
 * Kurzform des Preises für eine Übersicht: „CHF 199.00 pro Platz" bzw.
 * „CHF 2'500.00 pauschal, bis 15 Plätze". Gibt null, wenn kein Preis
 * hinterlegt ist — dann steht dort nichts statt „CHF 0.00".
 */
export function priceLabel(course: {
  pricingModel?: 'per_seat' | 'flat'
  pricePerSeatRappen?: number
  flatPriceRappen?: number
  maxSeats?: number
}): string | null {
  const flat = (course.pricingModel ?? 'per_seat') === 'flat'
  if (flat) {
    if (!course.flatPriceRappen) return null
    const cap = course.maxSeats ? `, bis ${course.maxSeats} Plätze` : ''
    return `CHF ${formatChf(course.flatPriceRappen)} pauschal${cap}`
  }
  if (!course.pricePerSeatRappen) return null
  return `CHF ${formatChf(course.pricePerSeatRappen)} pro Platz`
}
