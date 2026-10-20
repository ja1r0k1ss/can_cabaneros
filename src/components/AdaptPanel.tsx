import { RefreshCw, Undo2 } from 'lucide-react'
import { adaptRecipe, adaptationsFor } from '../lib/adapt'
import { useInventory } from '../store/inventory'
import type { Recipe } from '../types/recipe'
import { muted } from './ui'

/** "Adaptación al equipamiento disponible": offers rewrites for the user's utensils, or undo once applied */
export default function AdaptPanel({ recipe, onChange, original }: { recipe: Recipe; onChange: (r: Recipe) => void; original: Recipe }) {
  const { utensils } = useInventory()
  const options = adaptationsFor(recipe, utensils)
  if (!recipe.adaptadaA && !options.length) return null

  const btn = 'flex w-full items-center gap-2 rounded-3xl bg-linen px-3 py-2 text-left text-sm font-semibold text-olive active:opacity-70 dark:bg-moss-light'
  return (
    <div className="flex flex-col gap-1.5 rounded-3xl border border-olive/30 p-2">
      <p className={`px-1 text-xs font-bold uppercase ${muted}`}>Adaptación al equipamiento disponible</p>
      {recipe.adaptadaA ? (
        <button type="button" onClick={() => onChange(original)} className={btn}>
          <Undo2 className="size-4 shrink-0" aria-hidden />
          Volver a la receta original
        </button>
      ) : (
        options.map((o) => (
          <button key={o.kind} type="button" onClick={() => onChange(adaptRecipe(recipe, o))} className={btn}>
            <RefreshCw className="size-4 shrink-0" aria-hidden />
            {o.label}
          </button>
        ))
      )}
    </div>
  )
}
