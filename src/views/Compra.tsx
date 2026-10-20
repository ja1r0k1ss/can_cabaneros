import { ArrowDownToLine, Check, Plus, ShoppingCart, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { card, field, muted, primaryBtn } from '../components/ui'
import { matchesName, missingIngredients } from '../lib/recipes'
import { formatQty } from '../lib/utils'
import { useInventory } from '../store/inventory'
import { UNITS, type Unit } from '../types/inventory'

export default function Compra() {
  const { shopping, recipes, pantry, toggleBought, removeShoppingItem, addShoppingItems, addMissingToShopping, moveBoughtToPantry } =
    useInventory()
  const [msg, setMsg] = useState('')
  const bought = shopping.filter((s) => s.comprado).length
  // pending first, bought sink to the bottom
  const sorted = [...shopping].sort((a, b) => Number(a.comprado) - Number(b.comprado))

  function generate() {
    const n = addMissingToShopping(recipes.flatMap((r) => missingIngredients(r.ingredientes, pantry)))
    setMsg(n ? `${n} ingredientes añadidos desde tus recetas` : 'No falta nada nuevo para tus recetas')
  }

  function moveToPantry() {
    moveBoughtToPantry()
    setMsg(`${bought} productos volcados a la despensa`)
  }

  // React 19 form action: receives FormData and resets the form afterwards
  function add(form: FormData) {
    const nombre = String(form.get('nombre')).trim()
    const cantidad = Number(String(form.get('cantidad')).replace(',', '.')) || 1
    if (!nombre || cantidad < 0) return
    addShoppingItems([
      {
        nombre,
        cantidad,
        unidad: form.get('unidad') as Unit,
        categoria: pantry.find((p) => matchesName(nombre, p.nombre))?.categoria ?? 'Otros',
      },
    ])
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={generate} className={`${card} flex h-10 items-center justify-center gap-1.5 text-sm font-semibold text-olive`}>
          <Sparkles className="size-4" aria-hidden />
          Generar desde recetas
        </button>
        <button type="button" onClick={moveToPantry} disabled={!bought} className={primaryBtn}>
          <ArrowDownToLine className="size-4" aria-hidden />
          Volcar a despensa{bought ? ` (${bought})` : ''}
        </button>
      </div>
      {msg && <p className="px-1 text-xs font-semibold text-olive">{msg}</p>}

      <form action={add} className="flex gap-1.5">
        <input name="nombre" required placeholder="Añadir producto" aria-label="Producto" className={`${field} flex-1`} />
        <input name="cantidad" inputMode="decimal" placeholder="1" aria-label="Cantidad" className={`${field} w-14 px-2 text-right`} />
        <select name="unidad" defaultValue="ud" aria-label="Unidad" className={`${field} w-16 px-2`}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button type="submit" aria-label="Añadir" className="grid size-10 shrink-0 place-items-center rounded-full bg-olive text-on-accent active:opacity-80">
          <Plus className="size-5" aria-hidden />
        </button>
      </form>

      {sorted.length ? (
        <ul className={`${card} divide-y divide-black/5 py-1 dark:divide-white/5`}>
          {sorted.map((s) => (
            <li key={s.id} className="flex items-center gap-1 pr-1.5 pl-1">
              <button
                type="button"
                role="checkbox"
                aria-checked={s.comprado}
                aria-label={`Comprado: ${s.nombre}`}
                onClick={() => toggleBought(s.id)}
                className="grid size-11 shrink-0 place-items-center"
              >
                <span
                  className={`grid size-[22px] place-items-center rounded-full border-2 ${
                    s.comprado ? 'border-olive bg-olive text-on-accent' : 'border-black/20 dark:border-white/25'
                  }`}
                >
                  {s.comprado && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </span>
              </button>
              <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${s.comprado ? 'line-through opacity-40' : ''}`}>{s.nombre}</span>
              <span className={`text-sm tabular-nums ${muted}`}>{formatQty(s.cantidad, s.unidad)}</span>
              <button type="button" onClick={() => removeShoppingItem(s.id)} aria-label={`Quitar ${s.nombre}`} className={`grid size-9 shrink-0 place-items-center ${muted}`}>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={`${card} p-4 text-center`}>
          <ShoppingCart className="mx-auto mb-2 size-8 text-olive" aria-hidden />
          <p className="text-sm font-semibold">Lista vacía</p>
          <p className={`text-xs ${muted}`}>Añade productos o genéralos desde tus recetas.</p>
        </div>
      )}
    </div>
  )
}
