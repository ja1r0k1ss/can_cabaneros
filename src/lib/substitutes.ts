import { OPTIONAL_INGREDIENTS, SUBSTITUTES } from '../data/substitutes.js'
import type { PantryItem } from '../types/inventory'
import { matchesName, shortfall, words } from './recipes.js'

/** Spice/herb/condiment that can be left out without changing the base of the dish */
export const isOptional = (nombre: string) => OPTIONAL_INGREDIENTS.some((o) => matchesName(o, nombre))

export interface Substitute {
  nombre: string
  /** Already in stock, so it's the easy pick */
  enDespensa: boolean
}

/** Suggested swaps for a missing ingredient, the ones already in the pantry first */
export function substitutesFor(nombre: string, pantry: PantryItem[]): Substitute[] {
  const opciones = SUBSTITUTES.filter((s) => matchesName(s.ingrediente, nombre)).flatMap((s) => s.opciones)
  return [...new Set(opciones)]
    .map((o) => ({ nombre: o, enDespensa: shortfall({ nombre: o }, pantry) === null }))
    .sort((a, b) => Number(b.enDespensa) - Number(a.enDespensa))
}

/** How a missing ingredient is handled while cooking */
export interface IngredientChange {
  nombre: string
  /** Replacement, or null when omitted */
  sustituto: string | null
  /** Some stock exists, just not enough */
  parcial: boolean
}

export type ChangeSegment = string | { texto: string; cambio: IngredientChange }

// accent-free and lowercase without changing string length, so match indexes map back to the original text
const plain = (text: string) =>
  [...text]
    .map((c) => {
      const base = c.normalize('NFD').replace(/\p{Diacritic}/gu, '')
      return base.length === c.length ? base : c
    })
    .join('')
    .toLowerCase()

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Splits step text marking where substituted/omitted ingredients are mentioned (by their head word: "muslos de pollo" → "muslos") */
export function splitByChanges(text: string, changes: IngredientChange[]): ChangeSegment[] {
  // head word = first word with letters ("2 dientes de ajo" → "ajo", measure words are already dropped)
  const head = (nombre: string) => words(nombre).find((w) => /\p{L}/u.test(w))
  const usable = changes.filter((c) => head(c.nombre))
  if (!usable.length) return [text]
  const groups = usable.map((c) => `(${escape(head(c.nombre)!.replace(/(es|s)$/, ''))}(?:es|s)?)`)
  const re = new RegExp(`(?<!\\p{L})(?:${groups.join('|')})(?!\\p{L})`, 'gu')
  const out: ChangeSegment[] = []
  let last = 0
  for (const m of plain(text).matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push({ texto: text.slice(m.index, m.index + m[0].length), cambio: usable[m.slice(1).findIndex((g) => g !== undefined)] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
