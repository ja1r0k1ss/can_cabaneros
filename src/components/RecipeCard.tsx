import { ChevronRight, Clock, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Recipe } from '../types/recipe'
import { formatQty } from '../lib/utils'
import { card, muted } from './ui'

const ORIGEN = { url: 'Importada', manual: 'Manual', ia: 'IA' }

export default function RecipeCard({ recipe, open, badge, children }: { recipe: Recipe; open?: boolean; badge?: ReactNode; children?: ReactNode }) {
  return (
    <details open={open} className={`group ${card}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{recipe.titulo}</p>
          <p className={`flex items-center gap-2.5 text-xs ${muted}`}>
            <span className="flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {recipe.tiempoPrep + recipe.tiempoCoccion} min
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" aria-hidden />
              {recipe.raciones}
            </span>
            <span className="rounded-full bg-black/5 px-1.5 font-semibold dark:bg-white/10">{recipe.categoria ?? ORIGEN[recipe.origen]}</span>
          </p>
          {recipe.revisar && (
            <span className="mt-1 mr-1 inline-flex rounded-full bg-terracotta px-2 py-0.5 text-xs font-bold text-on-accent">Revisar ingredientes</span>
          )}
          {recipe.adaptadaA && (
            <span className="mt-1 inline-flex rounded-full bg-olive px-2 py-0.5 text-xs font-bold text-on-accent">Adaptada a tu {recipe.adaptadaA}</span>
          )}
        </div>
        {badge}
        <ChevronRight className="size-4 opacity-50 transition-transform group-open:rotate-90" aria-hidden />
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-3 text-sm">
        <p className={`text-xs ${muted}`}>
          Prep. {recipe.tiempoPrep} min · Cocción {recipe.tiempoCoccion} min
          {recipe.utensilios?.length ? ` · ${recipe.utensilios.join(', ')}` : ''}
          {recipe.fuente && (
            <>
              {' · '}
              <a href={recipe.fuente} target="_blank" rel="noreferrer" className="text-olive underline">
                Fuente
              </a>
            </>
          )}
        </p>
        {recipe.ingredientes.length > 0 && (
          <div>
            <h3 className={`text-xs font-bold uppercase ${muted}`}>Ingredientes</h3>
            <ul>
              {recipe.ingredientes.map((i, n) => (
                <li key={n}>
                  • {formatQty(i.cantidad, i.unidad)} {i.nombre}
                </li>
              ))}
            </ul>
          </div>
        )}
        {recipe.pasos.length > 0 && (
          <div>
            <h3 className={`text-xs font-bold uppercase ${muted}`}>Pasos</h3>
            <ol className="list-decimal space-y-1 pl-5">
              {recipe.pasos.map((p, n) => (
                <li key={n}>{p}</li>
              ))}
            </ol>
          </div>
        )}
        {children}
      </div>
    </details>
  )
}
