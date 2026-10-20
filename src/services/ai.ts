// shortcut: every function here is a mock with a fake delay; swap the bodies for real vision/LLM calls behind a backend (never ship API keys to the client)
import { RECIPE_CATALOG } from '../data/recipes'
import { missingIngredients } from '../lib/recipes'
import { newId } from '../lib/utils'
import type { PantryItem } from '../types/inventory'
import type { Recipe } from '../types/recipe'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const RECEIPT_TYPES = ['image/png', 'image/jpeg', 'application/pdf']

/** Detects ingredients in a supermarket receipt (image or PDF) */
export async function parseReceipt(file: File): Promise<Omit<PantryItem, 'id'>[]> {
  if (!RECEIPT_TYPES.includes(file.type)) throw new Error('Formato no soportado. Usa PNG, JPG o PDF.')
  await wait(1200)
  return [
    { nombre: 'Tomate pera', categoria: 'Verduras/Hortalizas', cantidad: 1, unidad: 'kg' },
    { nombre: 'Huevos', categoria: 'Otros', cantidad: 12, unidad: 'ud' },
    { nombre: 'Leche entera', categoria: 'Lácteos', cantidad: 6, unidad: 'l' },
    { nombre: 'Pechuga de pollo', categoria: 'Carnes', cantidad: 500, unidad: 'g' },
    { nombre: 'Aceite de oliva virgen extra', categoria: 'Salsas/Aceites', cantidad: 1, unidad: 'l' },
    { nombre: 'Yogur griego', categoria: 'Lácteos', cantidad: 4, unidad: 'ud' },
    { nombre: 'Espinacas frescas', categoria: 'Verduras/Hortalizas', cantidad: 300, unidad: 'g' },
    { nombre: 'Patatas', categoria: 'Verduras/Hortalizas', cantidad: 2, unidad: 'kg' },
  ]
}

export interface Suggestion {
  recipe: Recipe
  missing: string[]
}

/** Recipes cookable with the current stock (at most one missing ingredient), best match first */
export async function suggestRecipes(pantry: PantryItem[]): Promise<Suggestion[]> {
  await wait(900)
  return RECIPE_CATALOG.map((r) => ({
    recipe: { ...r, id: newId(), origen: 'ia' as const },
    missing: missingIngredients(r.ingredientes, pantry).map((i) => i.nombre),
  }))
    .filter((s) => s.missing.length <= 1)
    .sort((a, b) => a.missing.length - b.missing.length)
}
