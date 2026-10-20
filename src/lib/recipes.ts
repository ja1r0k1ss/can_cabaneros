import type { PantryItem, Unit, Utensil } from '../types/inventory'
import type { Recipe, RecipeIngredient } from '../types/recipe'
import { convert } from './units.ts'
import { normalize, round2 } from './utils.ts'

/** Parses a manual ingredient line: "200 g de arroz", "2 huevos", "500ml leche", "sal" */
export function parseIngredientLine(line: string): RecipeIngredient | null {
  const text = line.trim()
  if (!text) return null
  // unit must be followed by whitespace so "1 limón" isn't read as 1 l of "imón"
  const m = text.match(/^(\d+(?:[.,]\d+)?)\s*(?:(kg|g|ml|l|ud)(?=\s))?\s*(?:de\s+)?(.+)$/i)
  if (!m) return { nombre: text }
  return { nombre: m[3].trim(), cantidad: Number(m[1].replace(',', '.')), unidad: (m[2]?.toLowerCase() as Unit) ?? 'ud' }
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'en', 'y', 'con'])
// assumed always at hand, never tracked in the pantry
const BASICS = new Set(['sal', 'agua'])

const words = (s: string) => normalize(s).split(/\s+/).filter((w) => w && !STOPWORDS.has(w))
// crude Spanish plural handling: "tomates" ~ "tomate", "limones" ~ "limon"
const stems = (w: string) => [w, w.replace(/s$/, ''), w.replace(/es$/, '')]
const sameWord = (a: string, b: string) => stems(a).some((s) => stems(b).includes(s))

/** True if every significant word of the ingredient appears in the item name ("aceite de oliva" ~ "Aceite de oliva virgen extra") */
export function matchesName(ingredient: string, itemName: string): boolean {
  const need = words(ingredient)
  const have = words(itemName)
  return need.length > 0 && need.every((w) => have.some((h) => sameWord(w, h)))
}

/** What's still missing of an ingredient given the pantry, or null if covered */
export function shortfall(ing: RecipeIngredient, pantry: PantryItem[]): RecipeIngredient | null {
  if (words(ing.nombre).every((w) => BASICS.has(w))) return null
  const matches = pantry.filter((p) => p.cantidad > 0 && matchesName(ing.nombre, p.nombre))
  if (!matches.length) return ing
  if (ing.cantidad == null || !ing.unidad) return null
  const comparable = matches.map((p) => convert(p.cantidad, p.unidad, ing.unidad!)).filter((q) => q !== null)
  // stock in an incompatible unit (2 ud vs 400 g): present, but can't tell how much, so assume enough
  if (!comparable.length) return null
  const have = comparable.reduce((a, b) => a + b, 0)
  return have >= ing.cantidad ? null : { ...ing, cantidad: round2(ing.cantidad - have) }
}

export const missingIngredients = (ingredientes: RecipeIngredient[], pantry: PantryItem[]) =>
  ingredientes.map((i) => shortfall(i, pantry)).filter((i) => i !== null)

export const missingUtensils = (recipe: Recipe, utensils: Utensil[]) =>
  (recipe.utensilios ?? []).filter((cat) => !utensils.some((u) => u.categoria === cat && u.disponible))

/** Timer length for a step ("Cuece 18 min", "hornea 12-15 min", "1 h"), in seconds; null if none */
export function stepSeconds(text: string): number | null {
  const m = text.match(/(\d+)(?:\s*-\s*\d+)?\s*(h|horas?|min|minutos?)(?![a-z])/i)
  if (!m) return null
  return Number(m[1]) * (m[2].toLowerCase().startsWith('h') ? 3600 : 60)
}
