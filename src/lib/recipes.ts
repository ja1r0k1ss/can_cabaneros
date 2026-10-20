import type { PantryItem, Unit, Utensil, UtensilCategory } from '../types/inventory'
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

// connectors and measure words: "2 dientes de ajo" should still match "Ajo"
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'en', 'y', 'con', 'diente', 'dientes', 'pizca', 'chorrito', 'cucharada', 'cucharadas', 'cucharadita', 'cucharaditas'])
// assumed always at hand, never tracked in the pantry
const BASICS = new Set(['sal', 'agua', 'pimienta'])

export const words = (s: string) => normalize(s).split(/\s+/).filter((w) => w && !STOPWORDS.has(w))

/** Salt, water, pepper: assumed at hand, never tracked or required */
export const isBasicIngredient = (nombre: string) => words(nombre).every((w) => BASICS.has(w))

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
  if (isBasicIngredient(ing.nombre)) return null
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

export interface ParsedRecipeText {
  raciones?: number
  tiempoPrep?: number
  tiempoCoccion?: number
  ingredientes: RecipeIngredient[]
  pasos: string[]
}

const SECTION = /^(?:\p{Extended_Pictographic}\uFE0F?\s*)*(ingredientes|preparaci[oó]n|pasos|elaboraci[oó]n|instrucciones)\s*:?$/iu
const BULLET = /^(?:[-•*·]|\p{Extended_Pictographic}\uFE0F?)+\s*/u
const NUMBERED = /^(?:paso\s*)?\d+\s*[.)º:-]\s*/i

/** Extracts a recipe from free text: a post caption or a transcript split in lines */
export function parseRecipeText(text: string): ParsedRecipeText {
  const out: ParsedRecipeText = { ingredientes: [], pasos: [] }
  let section: 'ing' | 'steps' | null = null
  let numbered = false
  for (const raw of text.split('\n')) {
    const line = raw.replace(/(?:\s+#\S+)+\s*$/, '').trim() // trailing hashtags
    if (!line || line.startsWith('#')) continue
    const header = line.match(SECTION)
    if (header) {
      section = /ingred/i.test(header[1]) ? 'ing' : 'steps'
      continue
    }
    const raciones = line.match(/(\d+)\s*(?:raciones|personas|porciones)/i)
    const prep = line.match(/prep\p{L}*\.?\s*:?\s*(\d+)\s*min/iu)
    const coccion = line.match(/cocci[oó]n\s*:?\s*(\d+)\s*min/i)
    if (raciones) out.raciones ??= Number(raciones[1])
    if (prep) out.tiempoPrep ??= Number(prep[1])
    if (coccion) out.tiempoCoccion ??= Number(coccion[1])
    if (raciones || prep || coccion) continue

    if (NUMBERED.test(line)) {
      out.pasos.push(line.replace(NUMBERED, ''))
      numbered = true
    }
    // once steps are numbered, unnumbered lines are sign-offs ("¡Guárdalo! 👇"), not steps
    else if (section === 'steps' && !numbered) out.pasos.push(line.replace(BULLET, ''))
    else if (section === 'ing') {
      // "300 g de lentejas, 1 cebolla, sal" on one line; ",\s" so "1,5 kg" stays whole
      for (const part of line.replace(BULLET, '').split(/,\s+/)) {
        const ing = parseIngredientLine(part)
        if (ing) out.ingredientes.push(ing)
      }
    }
    // anything else is chatter ("¡quedan increíbles!", links...) and is ignored
  }
  return out
}

const UTENSIL_HINTS: [RegExp, UtensilCategory][] = [
  [/horno|hornea/i, 'Horno'],
  [/sart[eé]n/i, 'Sartén'],
  [/cazuela|olla(?! lenta)|cuece/i, 'Olla'],
  [/olla lenta/i, 'Olla lenta'],
  [/airfryer|freidora de aire/i, 'Airfryer'],
  [/batidora|tritura/i, 'Batidora'],
]

/** Utensil categories mentioned in the steps */
export const inferUtensils = (pasos: string[]) => {
  const text = pasos.join(' ')
  return UTENSIL_HINTS.filter(([re]) => re.test(text)).map(([, cat]) => cat)
}

// "ud" can't be split finely (1,5 huevos is fine, 1,37 isn't); small g/ml keep a decimal
const roundQty = (q: number, unit?: Unit) =>
  !unit || unit === 'ud' ? Math.max(0.5, Math.round(q * 2) / 2) : (unit === 'g' || unit === 'ml') && q >= 10 ? Math.round(q) : round2(q)

/** Recipe with ingredient quantities scaled from its base `raciones` to `servings` */
export function scaleRecipe(recipe: Recipe, servings: number): Recipe {
  const base = recipe.raciones || 1
  if (servings === base) return recipe
  const f = servings / base
  return {
    ...recipe,
    raciones: servings,
    ingredientes: recipe.ingredientes.map((i) => (i.cantidad == null ? i : { ...i, cantidad: roundQty(i.cantidad * f, i.unidad) })),
  }
}
