import { INGREDIENT_VOCAB } from '../data/ingredientVocab.ts'
import type { Recipe } from '../types/recipe'
import { inferUtensils, matchesName, parseRecipeText, stepSeconds } from './recipes.ts'
import { newId } from './utils.ts'

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
