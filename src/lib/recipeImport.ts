import { INGREDIENT_VOCAB } from '../data/ingredientVocab.ts'
import type { Unit } from '../types/inventory'
import type { Recipe, RecipeIngredient } from '../types/recipe'
import { inferUtensils, matchesName, parseRecipeText, stepSeconds } from './recipes.ts'
import { newId, normalize, round2 } from './utils.ts'

const PLATFORMS: [RegExp, string][] = [
  [/(^|\.)tiktok\.com$/, 'TikTok'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
]

/** Platform name for a supported recipe link, or null */
export function detectPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname
    return PLATFORMS.find(([re]) => re.test(host))?.[1] ?? null
  } catch {
    return null
  }
}

/** Captions often arrive as one line: break before section headers, numbered steps and bullets so the line parser can read them */
export const normalizeCaption = (text: string) =>
  text
    .replace(/\s*((?:\p{Extended_Pictographic}️?\s*)*(?:ingredientes|preparaci[oó]n|pasos|elaboraci[oó]n|instrucciones)\s*:)\s*/giu, '\n$1\n')
    .replace(/\s+(?=(?:paso\s*)?\d+\s*[.)]\s+\p{L})/giu, '\n')
    .replace(/\s+(?=[•✅▪]\s*)/gu, '\n')
    .trim()

/** First line without hashtags/emojis, capped for a card title */
export function cleanTitle(text: string) {
  const line = (text.split('\n').find((l) => l.replace(/#\S+/g, '').trim()) ?? '')
    .replace(/#\S+/g, '')
    .replace(/\p{Extended_Pictographic}️?/gu, '')
    .replace(/\s+/g, ' ')
    // one-line captions continue with servings/times: keep only the dish name
    .replace(/\s*(?:[|·]\s*)?(?:para\s+\d+|\d+\s*(?:raciones|personas|porciones)|prep\p{L}*|cocci[oó]n|⏱).*$/iu, '')
    .trim()
  return line.length > 80 ? `${line.slice(0, 77).replace(/\s+\S*$/, '')}…` : line
}

/** Known ingredients mentioned in free text, dropping ones covered by a more specific match ("pollo" inside "pechuga de pollo") */
export function guessIngredients(text: string): string[] {
  const found = INGREDIENT_VOCAB.filter((v) => matchesName(v, text))
  return found.filter((v) => !found.some((w) => w !== v && w.length > v.length && matchesName(v, w)))
}

export interface ImportDraft {
  recipe: Recipe
  /** Both ingredients and steps were read from the text */
  completa: boolean
  /** No ingredient list in the text: names were deduced from keywords, without quantities */
  ingredientesDeducidos: boolean
}

/** Builds an editable recipe from whatever text a link exposed (caption and/or title). Never invents steps */
export function buildImport(url: string, meta: { titulo?: string; texto?: string }): ImportDraft {
  const texto = normalizeCaption(meta.texto ?? '')
  const parsed = parseRecipeText(texto)
  const deducidos = !parsed.ingredientes.length
  const ingredientes = deducidos ? guessIngredients(`${meta.titulo ?? ''}\n${texto}`).map((nombre) => ({ nombre })) : parsed.ingredientes
  const stepMinutes = parsed.pasos.reduce((sum, p) => sum + (stepSeconds(p) ?? 0) / 60, 0)
  return {
    completa: !deducidos && parsed.pasos.length > 0,
    ingredientesDeducidos: deducidos && ingredientes.length > 0,
    recipe: {
      id: newId(),
      origen: 'url',
      fuente: url,
      titulo: cleanTitle(meta.titulo || texto) || 'Receta importada',
      raciones: parsed.raciones ?? 2,
      tiempoPrep: parsed.tiempoPrep ?? 10,
      tiempoCoccion: parsed.tiempoCoccion ?? Math.round(stepMinutes),
      utensilios: inferUtensils(parsed.pasos),
      ingredientes,
      pasos: parsed.pasos,
    },
  }
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, medio: 0.5, media: 0.5, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  doce: 12, quince: 15, veinte: 20, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, mil: 1000,
}
// spoken unit → [unit, factor]; household measures use the same equivalences as the AI path
const SPOKEN_UNITS: [RegExp, Unit, number][] = [
  [/^(gramos?|gr|g)$/, 'g', 1],
  [/^(kilos?|kilogramos?|kg)$/, 'kg', 1],
  [/^(mililitros?|ml)$/, 'ml', 1],
  [/^(litros?|l)$/, 'l', 1],
  [/^cucharadas?$/, 'ml', 15],
  [/^cucharaditas?$/, 'ml', 5],
  [/^vasos?$/, 'ml', 200],
  [/^tazas?$/, 'ml', 240],
  [/^(dientes?|unidades?|piezas?|latas?|botes?)$/, 'ud', 1],
]
const NOT_INGREDIENT = /^(minutos?|horas?|segundos?|grados?|veces|personas?|raciones|porciones|poco|poquito|chorrito|pizca|momento|rato|lado|vuelta|cosas?|pasos?)\b/
const COOKING_VERB =
  /^(?:(?:y|luego|después|ahora|primero|entonces|por último|finalmente|cuando\s[^,]+,)\s*,?\s*)*(añad|agreg|incorpor|ech|pon|coloc|cort|pic|ralla|mezcl|remuev|bat|cocin|cuec|hierv|hornea|fríe|fre|sofr|salte|dor|marc|calient|precalient|dej|reserv|retir|sirv|emplat|tritur|amas|unt|pel|lav|escurr|tap|baj|sub|espolvore|riega|vierte|vert)\p{L}*/iu

/** Ingredients and steps from a spoken transcript ("pon 300 gramos de lentejas…"). Free, approximate: always flagged for review */
export function parseSpokenRecipe(transcript: string): { ingredientes: RecipeIngredient[]; pasos: string[] } {
  const text = transcript.replace(/\s+/g, ' ').trim()
  const ingredientes: RecipeIngredient[] = []
  const seen = new Set<string>()
  const numberWord = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join('|')
  const qty = new RegExp(String.raw`(?<!\p{L})(\d+(?:[.,]\d+)?|${numberWord})\s+(?:(gramos?|gr|g|kilos?|kilogramos?|kg|mililitros?|ml|litros?|l|cucharadas?|cucharaditas?|vasos?|tazas?|dientes?|unidades?|piezas?|latas?|botes?)\s+)?(?:de\s+)?([a-záéíóúñ]+(?:\s+(?:de\s+)?[a-záéíóúñ]+){0,3}?)(?=\s*(?:[,.;:!?]|\sy\s|\scon\s|\spara\s|\sen\s|$))`, 'giu')
  for (const m of text.matchAll(qty)) {
    const n = /^\d/.test(m[1]) ? Number(m[1].replace(',', '.')) : NUMBER_WORDS[m[1].toLowerCase()]
    const nombre = m[3].toLowerCase().trim()
    if (n === undefined || NOT_INGREDIENT.test(nombre)) continue
    const unit = m[2] && SPOKEN_UNITS.find(([re]) => re.test(m[2].toLowerCase()))
    // without a unit, only trust names that are known ingredients ("dos huevos", not "dos minutos")
    if (!unit && !INGREDIENT_VOCAB.some((v) => matchesName(v, nombre))) continue
    const key = normalize(nombre)
    if (seen.has(key)) continue
    seen.add(key)
    ingredientes.push({ nombre, cantidad: round2(n * (unit ? unit[2] : 1)), unidad: unit ? unit[1] : 'ud' })
  }
  // known ingredients mentioned without a quantity ("un poco de sal y aceite")
  for (const nombre of guessIngredients(text)) {
    if (!ingredientes.some((i) => matchesName(nombre, i.nombre) || matchesName(i.nombre, nombre))) ingredientes.push({ nombre })
  }

  const pasos = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^(?:y|luego|después|ahora|entonces|primero|finalmente|por último)\s*,?\s+/i, ''))
    .filter((s) => s.length > 8 && COOKING_VERB.test(s))
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .slice(0, 20)
  return { ingredientes, pasos }
}
