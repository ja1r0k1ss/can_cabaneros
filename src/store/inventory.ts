import { createContext, useContext } from 'react'
import type { PantryItem, ShoppingItem, Utensil } from '../types/inventory'
import type { Recipe, RecipeIngredient } from '../types/recipe'

export interface InventoryStore {
  pantry: PantryItem[]
  utensils: Utensil[]
  recipes: Recipe[]
  shopping: ShoppingItem[]
  /** Recipe selected in the Laboratorio */
  labRecipeId: string | null
  /** Adds items, summing quantities into matching existing items */
  addPantryItems: (items: Omit<PantryItem, 'id'>[]) => void
  /** Moves the quantity one UNIT_STEP up or down, never below 0 */
  stepQuantity: (id: string, direction: 1 | -1) => void
  /** Subtracts the exact quantities a cooked recipe consumed */
  deductIngredients: (ingredients: RecipeIngredient[]) => void
  toggleUtensil: (id: string) => void
  saveRecipe: (recipe: Recipe) => void
  setLabRecipeId: (id: string) => void
  addShoppingItems: (items: Omit<ShoppingItem, 'id' | 'comprado'>[]) => void
  /** Adds missing recipe ingredients not already pending on the list; returns how many were added */
  addMissingToShopping: (ingredients: RecipeIngredient[]) => number
  toggleBought: (id: string) => void
  removeShoppingItem: (id: string) => void
  /** Moves bought items into the pantry and off the list */
  moveBoughtToPantry: () => void
}

export const InventoryContext = createContext<InventoryStore | null>(null)

export function useInventory() {
  const store = useContext(InventoryContext)
  if (!store) throw new Error('useInventory must be used inside <InventoryProvider>')
  return store
}
