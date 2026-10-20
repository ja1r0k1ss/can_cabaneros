import { useState, type ReactNode } from 'react'
import { MOCK_PANTRY, MOCK_RECIPES, MOCK_SHOPPING, MOCK_UTENSILS } from '../data/mock'
import { deductFromPantry, mergeItems } from '../lib/pantry'
import { matchesName } from '../lib/recipes'
import { round2 } from '../lib/utils'
import { UNIT_STEP, type PantryItem } from '../types/inventory'
import { InventoryContext, type InventoryStore } from './inventory'

// shortcut: in-memory only, data resets on reload; persist (localStorage/backend) once the model settles
export function InventoryProvider({ children }: { children: ReactNode }) {
  const [pantry, setPantry] = useState(MOCK_PANTRY)
  const [utensils, setUtensils] = useState(MOCK_UTENSILS)
  const [recipes, setRecipes] = useState(MOCK_RECIPES)
  const [shopping, setShopping] = useState(MOCK_SHOPPING)
  const [labRecipeId, setLabRecipeId] = useState<string | null>(null)

  const addShopping = (items: Omit<PantryItem, 'id'>[]) =>
    setShopping((prev) => mergeItems(prev, items.map((i) => ({ ...i, comprado: false }))))

  const store: InventoryStore = {
    pantry,
    utensils,
    recipes,
    shopping,
    labRecipeId,
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
    saveRecipe: (recipe) => setRecipes((prev) => [recipe, ...prev.filter((r) => r.id !== recipe.id)]),
    setLabRecipeId,
    addShoppingItems: addShopping,
    addMissingToShopping: (ingredients) => {
      // only skip what was already pending before this call, so the same ingredient from two recipes still sums
      const fresh = ingredients.filter((i) => !shopping.some((s) => !s.comprado && matchesName(i.nombre, s.nombre)))
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
      const bought = shopping.filter((s) => s.comprado)
      setPantry((prev) => mergeItems(prev, bought.map(({ nombre, categoria, cantidad, unidad }) => ({ nombre, categoria, cantidad, unidad }))))
      setShopping((prev) => prev.filter((s) => !s.comprado))
    },
  }

  return <InventoryContext value={store}>{children}</InventoryContext>
}
