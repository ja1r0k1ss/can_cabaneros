/** Lowercase and accent-free, so "limon" matches "Limón" */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

// crypto.randomUUID only exists in secure contexts; plain-http LAN testing on the iPhone isn't one
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/** Avoids 0.1 + 0.2 style float drift in quantities */
export const round2 = (n: number) => Math.round(n * 100) / 100

export const formatQty = (cantidad?: number, unidad?: string) =>
  cantidad == null ? '' : `${cantidad.toLocaleString('es-ES')} ${unidad ?? ''}`.trim()
