export const PANTRY_CATEGORIES = [
  'Especias',
  'Carnes',
  'Pescados',
  'Verduras/Hortalizas',
  'Frutas',
  'Lácteos',
  'Granos/Pastas',
  'Salsas/Aceites',
  'Otros',
] as const
export type PantryCategory = (typeof PANTRY_CATEGORIES)[number]

export const UNITS = ['g', 'kg', 'ml', 'l', 'ud'] as const
export type Unit = (typeof UNITS)[number]

/** Amount added/removed by the quick +/- buttons */
export const UNIT_STEP: Record<Unit, number> = { g: 50, kg: 0.5, ml: 50, l: 0.5, ud: 1 }

export interface PantryItem {
  id: string
  nombre: string
  categoria: PantryCategory
  cantidad: number
  unidad: Unit
  /** ISO date, YYYY-MM-DD */
  fechaCaducidad?: string
}

export const UTENSIL_CATEGORIES = ['Sartén', 'Olla', 'Horno', 'Airfryer', 'Batidora', 'Utensilio manual'] as const
export type UtensilCategory = (typeof UTENSIL_CATEGORIES)[number]

export interface Utensil {
  id: string
  nombre: string
  categoria: UtensilCategory
  disponible: boolean
}

export interface ShoppingItem {
  id: string
  nombre: string
  /** Used when the item is moved into the pantry */
  categoria: PantryCategory
  cantidad: number
  unidad: Unit
  comprado: boolean
}
