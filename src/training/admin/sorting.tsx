import { useState } from 'react'

export type SortDir = 'asc' | 'desc'
export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

/** Sortierzustand einer Tabelle: erneuter Klick auf dieselbe Spalte dreht die Richtung. */
export function useSort<K extends string>(initial: K) {
  const [sort, setSort] = useState<SortState<K>>({ key: initial, dir: 'asc' })
  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))
  return { sort, toggle }
}

const collator = new Intl.Collator('de-CH', { sensitivity: 'base', numeric: true })

/** Sortiert nach dem Schlüssel; leere Werte stehen immer am Ende, egal in welcher Richtung. */
export function sortBy<T>(items: T[], value: (item: T) => string | number | null | undefined, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const va = value(a)
    const vb = value(b)
    const ea = va === null || va === undefined || va === ''
    const eb = vb === null || vb === undefined || vb === ''
    if (ea || eb) return ea === eb ? 0 : ea ? 1 : -1
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sign
    return collator.compare(String(va), String(vb)) * sign
  })
}

/** Spaltenkopf als Knopf, mit Pfeil für die aktive Spalte. */
export function SortTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className = '',
}: {
  label: string
  sortKey: K
  sort: SortState<K>
  onSort: (key: K) => void
  className?: string
}) {
  const active = sort.key === sortKey
  return (
    <th
      className={`px-4 py-3 font-semibold ${className}`}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-semibold uppercase tracking-kicker hover:text-navy ${
          active ? 'text-navy' : 'text-slate-500'
        }`}
        style={{ font: 'inherit', letterSpacing: 'inherit' }}
      >
        {label}
        <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
          {active && sort.dir === 'desc' ? '▼' : '▲'}
        </span>
      </button>
    </th>
  )
}
