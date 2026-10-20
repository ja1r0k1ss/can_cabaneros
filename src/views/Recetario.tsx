import { BookOpen, ChefHat, Search, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import RecipeCard from '../components/RecipeCard'
import { card, muted, primaryBtn } from '../components/ui'
import ServingsStepper from '../components/ServingsStepper'
import { missingIngredients, missingUtensils, scaleRecipe } from '../lib/recipes'
import { normalize } from '../lib/utils'
import { servingsOf, useInventory } from '../store/inventory'
import { UTENSIL_CATEGORIES } from '../types/inventory'
import { RECIPE_CATEGORIES, type Recipe, type RecipeIngredient } from '../types/recipe'
import type { ViewProps } from './types'

const select = 'h-9 min-w-0 rounded-xl bg-oat px-2 text-base dark:bg-moss'

function StatusBadge({ missing }: { missing: number }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-on-accent ${missing ? 'bg-terracotta' : 'bg-olive'}`}
    >
      {missing ? `Faltan ${missing}` : 'Listo'}
    </span>
  )
}

function RecipeActions({ recipe, missing, navigate }: { recipe: Recipe; missing: RecipeIngredient[] } & ViewProps) {
  const { setLabRecipeId, addMissingToShopping } = useInventory()
  const [added, setAdded] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => {
          setLabRecipeId(recipe.id)
          navigate('laboratorio')
        }}
        className={primaryBtn}
      >
        <ChefHat className="size-4" aria-hidden />
        Cocinar
      </button>
      <button
        type="button"
        disabled={!missing.length || added !== null}
        onClick={() => setAdded(addMissingToShopping(missing))}
        className="flex h-10 items-center justify-center gap-1.5 rounded-3xl bg-linen px-3 text-sm font-semibold text-olive disabled:opacity-50 dark:bg-moss-light"
      >
        <ShoppingCart className="size-4" aria-hidden />
        {added !== null ? (added ? `${added} a la lista` : 'Ya en la lista') : 'Faltantes a lista'}
      </button>
    </div>
  )
}

export default function Recetario({ navigate }: ViewProps) {
  const { recipes, pantry, utensils, servings, setServings } = useInventory()
  const [query, setQuery] = useState('')
  const [maxTime, setMaxTime] = useState(0)
  const [category, setCategory] = useState('')
  const [utensil, setUtensil] = useState('')

  if (!recipes.length)
    return (
      <div className={`${card} p-4 text-center`}>
        <BookOpen className="mx-auto mb-2 size-8 text-olive" aria-hidden />
        <p className="text-sm font-semibold">Aún no tienes recetas</p>
        <p className={`text-xs ${muted}`}>Guárdalas desde Descubrir.</p>
      </div>
    )

  const q = normalize(query)
  const list = recipes
    .map((base) => {
      // badge, missing list and shopping all follow the servings chosen on the card
      const recipe = scaleRecipe(base, servingsOf(base, servings))
      return { base, recipe, missing: missingIngredients(recipe.ingredientes, pantry), noUtensils: missingUtensils(recipe, utensils) }
    })
    .filter(
      ({ recipe: r, noUtensils }) =>
        [r.titulo, ...r.ingredientes.map((i) => i.nombre)].some((t) => normalize(t).includes(q)) &&
        (!maxTime || r.tiempoPrep + r.tiempoCoccion <= maxTime) &&
        (!category || r.categoria === category) &&
        (!utensil || (utensil === 'mine' ? !noUtensils.length : r.utensilios?.includes(utensil as (typeof UTENSIL_CATEGORIES)[number]))),
    )

  return (
    <div className="flex flex-col gap-2">
      <label className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-40" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar receta o ingrediente"
          aria-label="Buscar recetas"
          className="h-10 w-full rounded-xl bg-oat pr-3 pl-9 text-base dark:bg-moss"
        />
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        <select value={maxTime} onChange={(e) => setMaxTime(Number(e.target.value))} aria-label="Tiempo máximo" className={select}>
          <option value={0}>Tiempo</option>
          {[15, 30, 45, 60].map((m) => (
            <option key={m} value={m}>
              ≤ {m} min
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoría" className={select}>
          <option value="">Categoría</option>
          {RECIPE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={utensil} onChange={(e) => setUtensil(e.target.value)} aria-label="Utensilios" className={select}>
          <option value="">Utensilios</option>
          <option value="mine">Con mis utensilios</option>
          {UTENSIL_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {list.map(({ base, recipe, missing, noUtensils }) => (
        <RecipeCard key={recipe.id} recipe={recipe} badge={<StatusBadge missing={missing.length} />}>
          <ServingsStepper value={recipe.raciones} base={base.raciones} onChange={(n) => setServings(base.id, n)} />
          {missing.length > 0 && (
            <p className="text-xs font-semibold text-terracotta">Falta: {missing.map((i) => i.nombre).join(', ')}</p>
          )}
          {noUtensils.length > 0 && (
            <p className="text-xs font-semibold text-brick">Sin utensilio: {noUtensils.join(', ')}</p>
          )}
          {/* keyed by servings so "added to list" resets when the amounts change */}
          <RecipeActions key={recipe.raciones} recipe={recipe} missing={missing} navigate={navigate} />
        </RecipeCard>
      ))}
      {list.length === 0 && <p className={`py-6 text-center text-sm ${muted}`}>Sin resultados</p>}
    </div>
  )
}
