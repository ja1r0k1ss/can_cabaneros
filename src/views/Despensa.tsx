import { ChevronRight, Minus, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { field } from '../components/ui'
import { normalize } from '../lib/utils'
import { useInventory } from '../store/inventory'
import { PANTRY_CATEGORIES, UNITS, type PantryCategory, type PantryItem, type Unit } from '../types/inventory'
import TicketImport from './TicketImport'

function Expiry({ date }: { date?: string }) {
  if (!date) return null
  const today = new Date().setHours(0, 0, 0, 0)
  const days = Math.round((new Date(`${date}T00:00`).getTime() - today) / 86_400_000)
  const [label, tone] =
    days < 0
      ? ['Caducado', 'text-brick']
      : days === 0
        ? ['Caduca hoy', 'text-brick']
        : days <= 3
          ? [`Caduca en ${days} d`, 'text-terracotta']
          : [`Cad. ${new Date(`${date}T00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}`, 'text-ink/50 dark:text-sage']
  return <p className={`text-xs font-semibold ${tone}`}>{label}</p>
}

function ItemRow({ item }: { item: PantryItem }) {
  const { stepQuantity } = useInventory()
  const empty = item.cantidad === 0
  const stepBtn =
    'grid size-10 shrink-0 place-items-center rounded-full bg-linen active:bg-black/10 disabled:opacity-30 dark:bg-moss-light dark:active:bg-white/15'

  return (
    <li className="flex items-center gap-2 py-1.5 pr-1.5 pl-3">
      <div className={`min-w-0 flex-1 ${empty ? 'opacity-50' : ''}`}>
        <p className="truncate text-sm font-semibold">{item.nombre}</p>
        {empty ? <p className="text-xs font-semibold">Agotado</p> : <Expiry date={item.fechaCaducidad} />}
      </div>
      <button type="button" className={stepBtn} disabled={empty} onClick={() => stepQuantity(item.id, -1)} aria-label={`Quitar ${item.nombre}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="w-14 text-center text-sm font-semibold tabular-nums">
        {item.cantidad.toLocaleString('es-ES')} <span className="text-xs font-normal opacity-60">{item.unidad}</span>
      </span>
      <button type="button" className={stepBtn} onClick={() => stepQuantity(item.id, 1)} aria-label={`Añadir ${item.nombre}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </li>
  )
}

function AddItemForm() {
  const { addPantryItems } = useInventory()

  // React 19 form action: receives FormData and resets the form afterwards
  function add(form: FormData) {
    const nombre = String(form.get('nombre')).trim()
    const cantidad = Number(form.get('cantidad'))
    if (!nombre || !Number.isFinite(cantidad) || cantidad < 0) return
    addPantryItems([{
      nombre,
      categoria: form.get('categoria') as PantryCategory,
      cantidad,
      unidad: form.get('unidad') as Unit,
      fechaCaducidad: String(form.get('fecha')) || undefined,
    }])
  }

  return (
    <details className="group rounded-3xl bg-oat dark:bg-moss">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-olive [&::-webkit-details-marker]:hidden">
        <Plus className="size-4 transition-transform group-open:rotate-45" aria-hidden />
        Añadir ítem
      </summary>
      <form action={add} className="grid grid-cols-2 gap-2 px-3 pb-3">
        <input name="nombre" required placeholder="Nombre" aria-label="Nombre" className={`${field} col-span-2`} />
        <select name="categoria" aria-label="Categoría" className={`${field} col-span-2`}>
          {PANTRY_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input name="cantidad" type="number" inputMode="decimal" min="0" step="any" required placeholder="Cantidad" aria-label="Cantidad" className={field} />
        <select name="unidad" aria-label="Unidad" className={field}>
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <label className="col-span-2 flex items-center gap-2 text-sm text-ink/60 dark:text-sage">
          Caducidad
          <input name="fecha" type="date" className={`${field} flex-1`} />
        </label>
        <button type="submit" className="col-span-2 h-10 rounded-3xl bg-olive text-sm font-semibold text-on-accent active:opacity-80">
          Guardar
        </button>
      </form>
    </details>
  )
}

export default function Despensa() {
  const { pantry } = useInventory()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<PantryCategory | ''>('')

  const q = normalize(query.trim())
  const visible = pantry.filter((i) => (!category || i.categoria === category) && normalize(i.nombre).includes(q))
  const groups = PANTRY_CATEGORIES.map((cat) => ({ cat, items: visible.filter((i) => i.categoria === cat) })).filter((g) => g.items.length)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 opacity-40" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar en la despensa"
            className="h-10 w-full rounded-xl bg-oat pr-3 pl-9 text-base dark:bg-moss"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PantryCategory | '')}
          aria-label="Filtrar por categoría"
          className="h-10 w-32 shrink-0 rounded-xl bg-oat px-2 text-base dark:bg-moss"
        >
          <option value="">Todas</option>
          {PANTRY_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <TicketImport />
      <AddItemForm />

      {groups.map(({ cat, items }) => (
        <details key={cat} open className="group rounded-3xl bg-oat dark:bg-moss">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="size-4 opacity-50 transition-transform group-open:rotate-90" aria-hidden />
            <span className="flex-1 text-sm font-bold">{cat}</span>
            <span className="text-xs font-semibold text-ink/50 tabular-nums dark:text-sage">{items.length}</span>
          </summary>
          <ul className="divide-y divide-black/5 pb-1.5 dark:divide-white/5">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </details>
      ))}

      {groups.length === 0 && <p className="py-6 text-center text-sm text-ink/50 dark:text-sage">Sin resultados</p>}
    </div>
  )
}
