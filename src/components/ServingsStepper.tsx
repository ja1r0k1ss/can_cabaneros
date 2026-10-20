import { Minus, Plus, Users } from 'lucide-react'
import { muted } from './ui'

const MAX = 24

/** Compact "- 4 raciones +" control; shows the recipe's base when scaled */
export default function ServingsStepper({ value, base, onChange }: { value: number; base: number; onChange: (n: number) => void }) {
  const btn = 'grid size-9 place-items-center rounded-full bg-linen active:opacity-70 disabled:opacity-30 dark:bg-moss-light'
  return (
    <div className="flex items-center gap-2">
      <Users className="size-4 text-olive" aria-hidden />
      <span className="flex-1 text-sm font-semibold">
        {value} {value === 1 ? 'ración' : 'raciones'}
        {value !== base && <span className={`ml-1 text-xs font-normal ${muted}`}>(receta base: {base})</span>}
      </span>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Menos raciones" className={btn}>
        <Minus className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX} aria-label="Más raciones" className={btn}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
