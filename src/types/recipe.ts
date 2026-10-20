import type { Unit, UtensilCategory } from './inventory'

export const RECIPE_CATEGORIES = ['Desayuno', 'Entrante', 'Principal', 'Guarnición', 'Postre'] as const
export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number]

export interface RecipeIngredient {
  nombre: string
  cantidad?: number
  unidad?: Unit
}

export interface Recipe {
  id: string
  titulo: string
  origen: 'url' | 'manual' | 'ia'
  /** Source link for imported recipes */
  fuente?: string
  categoria?: RecipeCategory
  /** Utensil categories the recipe needs; any available utensil of that category counts */
  utensilios?: UtensilCategory[]
  raciones: number
  /** Minutes */
  tiempoPrep: number
  /** Minutes */
  tiempoCoccion: number
  ingredientes: RecipeIngredient[]
  pasos: string[]
}
