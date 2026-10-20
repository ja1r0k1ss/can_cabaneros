import type { Unit } from '../types/inventory'

// g↔kg and ml↔l are convertible; "ud" only matches "ud"
const BASE: Record<Unit, { family: string; factor: number }> = {
  g: { family: 'mass', factor: 1 },
  kg: { family: 'mass', factor: 1000 },
  ml: { family: 'volume', factor: 1 },
  l: { family: 'volume', factor: 1000 },
  ud: { family: 'count', factor: 1 },
}

/** Converts a quantity between units of the same family; null when they aren't comparable */
export function convert(qty: number, from: Unit, to: Unit): number | null {
  if (BASE[from].family !== BASE[to].family) return null
  return (qty * BASE[from].factor) / BASE[to].factor
}
