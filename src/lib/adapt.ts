import type { Utensil } from '../types/inventory'
import type { Recipe } from '../types/recipe'
import { newId } from './utils.ts'

export interface Adaptation {
  kind: 'slow' | 'air'
  utensil: Utensil
  label: string
}

export const utensilLabel = (u: Utensil) => (u.capacidad ? `${u.nombre} ${u.capacidad}` : u.nombre)

const TIME = /(\d+)(?:\s*-\s*(\d+))?\s*(min(?:utos)?|h(?:oras?)?)(?![a-z])/gi
const TEMP = /(\d{3})\s*°\s*C/g
const OVEN = /horno|hornea/i
const STOVE_OR_OVEN = /horno|hornea|cazuela|olla|cuece|guisa|cuec/i

/** Longest cooking time mentioned in a step, in minutes */
const stepMinutes = (text: string) =>
  Math.max(0, ...[...text.matchAll(TIME)].map((m) => Number(m[2] ?? m[1]) * (m[3].toLowerCase().startsWith('h') ? 60 : 1)))

/** Keeps the capital letter when a replacement lands at the start of a sentence */
const swap = (text: string, re: RegExp, to: string) =>
  text.replace(re, (m) => (m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to))

/** Equipment-based rewrites the user can apply to a recipe */
export function adaptationsFor(recipe: Recipe, utensils: Utensil[]): Adaptation[] {
  if (recipe.adaptadaA) return []
  const uses = (cat: string) => recipe.utensilios?.includes(cat as never) || false
  const have = (cat: string) => utensils.find((u) => u.categoria === cat && u.disponible)
  const out: Adaptation[] = []

  const slow = have('Olla lenta')
  // slow cookers only make sense for long stews/roasts, not a 12 min salmon
  const longCook = recipe.pasos.some((p) => STOVE_OR_OVEN.test(p) && stepMinutes(p) >= 20)
  if (slow && (uses('Horno') || uses('Olla')) && longCook)
    out.push({ kind: 'slow', utensil: slow, label: `Adaptar receta para tu ${utensilLabel(slow)}` })

  const air = have('Airfryer')
  if (air && uses('Horno')) out.push({ kind: 'air', utensil: air, label: `Adaptar tiempos para tu ${utensilLabel(air)}` })
  return out
}

/** Rewrites steps, times and utensils for the chosen equipment */
export function adaptRecipe(recipe: Recipe, { kind, utensil }: Adaptation): Recipe {
  const name = utensilLabel(utensil)
  const replaceCat = (from: string[], to: Recipe['utensilios']) => [
    ...new Set([...(recipe.utensilios ?? []).filter((c) => !from.includes(c)), ...(to ?? [])]),
  ]

  if (kind === 'slow') {
    const pasos = recipe.pasos
      .filter((p) => !/precalienta/i.test(p))
      .map((p) => {
        // short sautés stay on the hob; only the long cook moves to the slow cooker
        if (!STOVE_OR_OVEN.test(p) || stepMinutes(p) < 20) return swap(p, /la cazuela/gi, 'una sartén')
        const slowTime = stepMinutes(p) <= 45 ? '2-3 h en alto o 4-6 h en bajo' : '4-5 h en alto o 6-8 h en bajo'
        let t = p.replace(/\s*a fuego (?:muy )?(?:lento|bajo|medio(?:-bajo)?|fuerte)/gi, '')
        t = t.replace(TIME, slowTime)
        t = swap(t, /\b(?:hornea|cuece|guisa)\b/gi, 'cocina en la olla lenta')
        t = swap(t, /\b(?:en el|al) horno\b/gi, 'en la olla lenta')
        return swap(t, /\bla (?:bandeja|cazuela)\b/gi, 'la olla lenta')
      })
    const longest = Math.max(...recipe.pasos.map(stepMinutes))
    return {
      ...recipe,
      id: newId(),
      adaptadaA: name,
      utensilios: replaceCat(['Horno', 'Olla'], ['Olla lenta', 'Sartén']),
      tiempoCoccion: longest <= 45 ? 360 : 480,
      pasos: [
        `Lo que haya que dorar o sofreír hazlo antes en una sartén. Después pásalo todo a tu ${name} sin superar 2/3 de su capacidad, y reduce el líquido en un tercio: la olla lenta apenas evapora.`,
        ...pasos,
      ],
    }
  }

  const pasos = recipe.pasos.map((p) => {
    if (/precalienta/i.test(p))
      return p.replace(/.*?(\d{3})\s*°\s*C.*/i, (_, c) => `Precalienta la airfryer a ${Number(c) - 20} °C durante 3 min.`)
    const tray = swap(p, /\bla bandeja\b/gi, 'la cesta')
    if (!OVEN.test(p) && !/\d{3}\s*°\s*C/.test(p)) return tray
    // rule of thumb: 20 °C less and ~20% less time than a conventional oven
    let t = tray.replace(TEMP, (_, c) => `${Number(c) - 20} °C`)
    t = t.replace(TIME, (_, a: string, b: string | undefined, unit: string) =>
      [a, b].filter(Boolean).map((n) => Math.max(1, Math.round(Number(n) * 0.8))).join('-') + ` ${unit}`,
    )
    t = swap(t, /\bhornea\b/gi, 'cocina en la airfryer')
    return swap(t, /\b(?:en el|al) horno\b/gi, 'en la airfryer')
  })
  return {
    ...recipe,
    id: newId(),
    adaptadaA: name,
    utensilios: replaceCat(['Horno'], ['Airfryer']),
    tiempoCoccion: Math.round(recipe.tiempoCoccion * 0.8),
    pasos: [...pasos, `Cocina en una sola capa: si no cabe todo en la cesta de tu ${name}, hazlo en tandas. Comprueba el punto unos minutos antes.`],
  }
}
