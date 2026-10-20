import { useState, type ReactNode } from 'react'
import { MOCK_PANTRY, MOCK_RECIPES, MOCK_SHOPPING, MOCK_UTENSILS } from '../data/mock'
import { usePersistentState } from '../hooks/usePersistentState'
import { deductFromPantry, mergeItems } from '../lib/pantry'
import { matchesName } from '../lib/recipes'
import { arrayOf, isPantryItem, isRecipe, isShoppingItem, isUtensil, servingsMap } from '../lib/storage'
import { newId, round2 } from '../lib/utils'
import { UNIT_STEP, type PantryItem, type ShoppingItem, type Utensil } from '../types/inventory'
import type { Recipe } from '../types/recipe'
import { InventoryContext, type InventoryStore } from './inventory'

// module-level so the hook's effect deps stay stable
const NO_SERVINGS: Record<string, number> = {}
const validPantry = arrayOf<PantryItem>(isPantryItem)
const validShopping = arrayOf<ShoppingItem>(isShoppingItem)
const validUtensils = arrayOf<Utensil>(isUtensil)
const validRecipes = arrayOf<Recipe>(isRecipe)

// shortcut: localStorage is per device; sharing the list between phones needs a backend
export function InventoryProvider({ children }: { children: ReactNode }) {
  // mock data only seeds a first run; after that everything comes from localStorage
  const [pantry, setPantry] = usePersistentState('can_cabaneros_pantry', MOCK_PANTRY, validPantry)
  const [utensils, setUtensils] = usePersistentState('can_cabaneros_utensils', MOCK_UTENSILS, validUtensils)
  const [recipes, setRecipes] = usePersistentState('can_cabaneros_recipes', MOCK_RECIPES, validRecipes)
  const [shopping, setShopping, latestShopping] = usePersistentState('can_cabaneros_shopping_list', MOCK_SHOPPING, validShopping)
  const [servings, setServingsMap] = usePersistentState('can_cabaneros_servings', NO_SERVINGS, servingsMap)
  const [labRecipeId, setLabRecipeId] = useState<string | null>(null)

  const addShopping = (items: Omit<PantryItem, 'id'>[]) =>
    setShopping((prev) => mergeItems(prev, items.map((i) => ({ ...i, comprado: false }))))

  const store: InventoryStore = {
    pantry,
    utensils,
    recipes,
    shopping,
    labRecipeId,
    servings,
    addPantryItems: (items) => setPantry((prev) => mergeItems(prev, items)),
    stepQuantity: (id, direction) =>
      setPantry((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, cantidad: Math.max(0, round2(i.cantidad + direction * UNIT_STEP[i.unidad])) } : i,
        ),
      ),
    deductIngredients: (ingredients) => setPantry((prev) => deductFromPantry(prev, ingredients)),
    toggleUtensil: (id) =>
      setUtensils((prev) => prev.map((u) => (u.id === id ? { ...u, disponible: !u.disponible } : u))),
    addUtensil: (utensil) => setUtensils((prev) => [...prev, { ...utensil, id: newId() }]),
    updateUtensil: (id, utensil) => setUtensils((prev) => prev.map((u) => (u.id === id ? { ...utensil, id } : u))),
    removeUtensil: (id) => setUtensils((prev) => prev.filter((u) => u.id !== id)),
    saveRecipe: (recipe) => setRecipes((prev) => [recipe, ...prev.filter((r) => r.id !== recipe.id)]),
    setLabRecipeId,
    setServings: (id, n) => setServingsMap((prev) => ({ ...prev, [id]: n })),
    addShoppingItems: addShopping,
    addMissingToShopping: (ingredients) => {
      // only skip what was already pending before this call, so the same ingredient from two recipes still sums
      const fresh = ingredients.filter((i) => !latestShopping.current.some((s) => !s.comprado && matchesName(i.nombre, s.nombre)))
      addShopping(
        fresh.map((i) => ({
          nombre: i.nombre,
          cantidad: i.cantidad ?? 1,
          unidad: i.unidad ?? 'ud',
          categoria: pantry.find((p) => matchesName(i.nombre, p.nombre))?.categoria ?? 'Otros',
        })),
      )
      return fresh.length
    },
    toggleBought: (id) => setShopping((prev) => prev.map((s) => (s.id === id ? { ...s, comprado: !s.comprado } : s))),
    removeShoppingItem: (id) => setShopping((prev) => prev.filter((s) => s.id !== id)),
    moveBoughtToPantry: () => {
      // both writes hit localStorage synchronously, back to back, from the same snapshot; pantry first so a crash
      // in between can at worst leave an item in both places, never in neither
      const bought = latestShopping.current.filter((s) => s.comprado)
      if (!bought.length) return
      const moved = new Set(bought.map((s) => s.id))
      setPantry((prev) => mergeItems(prev, bought.map(({ nombre, categoria, cantidad, unidad }) => ({ nombre, categoria, cantidad, unidad }))))
      setShopping((prev) => prev.filter((s) => !moved.has(s.id)))
    },
  }

  return <InventoryContext value={store}>{children}</InventoryContext>
}
