// shortcut: every function here is a mock with a fake delay; swap the bodies for real vision/LLM calls behind a backend (never ship API keys to the client)
import { RECIPE_CATALOG } from '../data/recipes'
import { MOCK_POSTS } from '../data/posts'
import { inferUtensils, missingIngredients, parseRecipeText, stepSeconds } from '../lib/recipes'
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

export interface UrlImport {
  recipe: Recipe
  /** True when ingredients or steps came from the post caption because the audio didn't have them */
  usoDescripcion: boolean
}

/** Extracts a recipe from a TikTok / Instagram Reel / YouTube link, reading both the audio transcript and the caption */
export async function parseRecipeUrl(url: string): Promise<UrlImport> {
  const platform = detectPlatform(url)
  if (!platform) throw new Error('Enlace no válido. Usa un enlace de TikTok, Instagram o YouTube.')
  await wait(1400)
  const post = MOCK_POSTS[platform]

  const audio = parseRecipeText(post.transcripcion)
  const caption = parseRecipeText(post.descripcion)
  // many videos are music-only: the recipe lives in the caption, so fall back to it field by field
  const ingredientes = audio.ingredientes.length ? audio.ingredientes : caption.ingredientes
  const pasos = audio.pasos.length ? audio.pasos : caption.pasos
  if (!ingredientes.length || !pasos.length)
    throw new Error('No se encontró una receta completa ni en el audio ni en la descripción del vídeo.')

  const stepMinutes = pasos.reduce((sum, p) => sum + (stepSeconds(p) ?? 0) / 60, 0)
  return {
    usoDescripcion: !audio.ingredientes.length || !audio.pasos.length,
    recipe: {
      id: newId(),
      origen: 'url',
      fuente: url,
      titulo: post.titulo.replace(/#\S+/g, '').replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/\s+/g, ' ').trim(),
      raciones: audio.raciones ?? caption.raciones ?? 2,
      tiempoPrep: audio.tiempoPrep ?? caption.tiempoPrep ?? 10,
      tiempoCoccion: audio.tiempoCoccion ?? caption.tiempoCoccion ?? Math.round(stepMinutes),
      utensilios: inferUtensils(pasos),
      ingredientes,
      pasos,
    },
  }
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
