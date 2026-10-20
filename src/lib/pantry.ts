import type { PantryItem } from '../types/inventory'
import type { RecipeIngredient } from '../types/recipe'
import { matchesName } from './recipes.ts'
import { convert } from './units.ts'
import { newId, normalize, round2 } from './utils.ts'

type Stock = Pick<PantryItem, 'id' | 'nombre' | 'cantidad' | 'unidad' | 'fechaCaducidad'>

/** Adds items to a list (pantry or shopping), summing into an existing item with the same name and a compatible unit */
export function mergeItems<T extends Stock>(list: T[], incoming: Omit<T, 'id'>[]): T[] {
  const next = [...list]
  for (const item of incoming) {
    const i = next.findIndex((p) => normalize(p.nombre) === normalize(item.nombre) && convert(1, item.unidad, p.unidad) !== null)
    if (i === -1) {
      next.push({ ...item, id: newId() } as T)
      continue
    }
    const existing = next[i]
    next[i] = {
      ...existing,
      cantidad: round2(existing.cantidad + convert(item.cantidad, item.unidad, existing.unidad)!),
      fechaCaducidad: existing.fechaCaducidad ?? item.fechaCaducidad,
    }
  }
  return next
}

/** Subtracts the exact recipe quantities from the pantry, soonest-expiring stock first, never below 0 */
export function deductFromPantry(pantry: PantryItem[], ingredients: RecipeIngredient[]): PantryItem[] {
  const next = pantry.map((p) => ({ ...p }))
  for (const ing of ingredients) {
    const { cantidad, unidad } = ing
    if (cantidad == null || !unidad) continue // "sal", "al gusto": nothing measurable to deduct
    let left = cantidad
    const candidates = next
      .filter((p) => p.cantidad > 0 && matchesName(ing.nombre, p.nombre) && convert(1, unidad, p.unidad) !== null)
      .sort((a, b) => (a.fechaCaducidad ?? '9999').localeCompare(b.fechaCaducidad ?? '9999'))
    for (const p of candidates) {
      if (left <= 0) break
      const used = Math.min(convert(p.cantidad, p.unidad, unidad)!, left)
      p.cantidad = Math.max(0, round2(p.cantidad - convert(used, unidad, p.unidad)!))
      left -= used
    }
  }
  return next
}
