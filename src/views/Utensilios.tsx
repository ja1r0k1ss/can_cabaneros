import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { card, field, muted, primaryBtn } from '../components/ui'
import { useInventory } from '../store/inventory'
import { UTENSIL_CATEGORIES, type Utensil, type UtensilCategory } from '../types/inventory'

/** Shared add/edit form; delete needs a second tap to confirm */
function UtensilForm({ initial, onSave, onCancel, onDelete }: { initial?: Utensil; onSave: (u: Omit<Utensil, 'id'>) => void; onCancel?: () => void; onDelete?: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  // React 19 form action: receives FormData and resets the form afterwards
  function save(form: FormData) {
    const nombre = String(form.get('nombre')).trim()
    if (!nombre) return
    onSave({
      nombre,
      categoria: form.get('categoria') as UtensilCategory,
      capacidad: String(form.get('capacidad')).trim() || undefined,
      notas: String(form.get('notas')).trim() || undefined,
      disponible: form.get('disponible') === 'on',
    })
  }

  return (
    <form action={save} className="grid grid-cols-2 gap-2">
      <input name="nombre" required defaultValue={initial?.nombre} placeholder="Nombre (ej. Airfryer Cecotec)" aria-label="Nombre" className={`${field} col-span-2`} />
      <select name="categoria" defaultValue={initial?.categoria ?? 'Utensilio manual'} aria-label="Categoría" className={`${field} px-2`}>
        {UTENSIL_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input name="capacidad" defaultValue={initial?.capacidad} placeholder="Capacidad (5,5 L, 28 cm)" aria-label="Capacidad o dimensiones" className={field} />
      <input name="notas" defaultValue={initial?.notas} placeholder="Notas (opcional)" aria-label="Notas" className={`${field} col-span-2`} />
      <label className="col-span-2 flex items-center gap-2.5 px-1 text-sm font-semibold">
        <input type="checkbox" name="disponible" defaultChecked={initial?.disponible ?? true} className="size-5 accent-olive" />
        Disponible en mi cocina
      </label>
      <div className="col-span-2 flex gap-2">
        {onDelete && (
          <button
            type="button"
            onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-3xl px-3 text-sm font-semibold ${confirmDelete ? 'bg-brick text-on-accent' : 'text-brick'}`}
          >
            <Trash2 className="size-4" aria-hidden />
            {confirmDelete ? '¿Eliminar?' : 'Eliminar'}
          </button>
        )}
        <span className="flex-1" />
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-10 rounded-3xl px-3 text-sm font-semibold">
            Cancelar
          </button>
        )}
        <button type="submit" className={primaryBtn}>
          Guardar
        </button>
      </div>
    </form>
  )
}

export default function Utensilios() {
  const { utensils, toggleUtensil, addUtensil, updateUtensil, removeUtensil } = useInventory()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const available = utensils.filter((u) => u.disponible).length

  return (
    <div className="flex flex-col gap-2.5">
      <p className={`px-1 text-xs font-semibold ${muted}`}>
        {available} de {utensils.length} disponibles en mi cocina
      </p>

      <div className={card}>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          aria-expanded={adding}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-olive"
        >
          <Plus className={`size-4 transition-transform ${adding ? 'rotate-45' : ''}`} aria-hidden />
          Añadir utensilio personalizado
        </button>
        {adding && (
          <div className="px-3 pb-3">
            <UtensilForm
              onSave={(u) => {
                addUtensil(u)
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}
      </div>

      {UTENSIL_CATEGORIES.map((cat) => {
        const items = utensils.filter((u) => u.categoria === cat)
        if (!items.length) return null
        return (
          <section key={cat}>
            <h2 className="px-4 pb-1 text-xs font-bold tracking-wide text-ink/50 uppercase dark:text-sage">{cat}</h2>
            <ul className={`divide-y divide-black/5 dark:divide-white/5 ${card}`}>
              {items.map((u) =>
                editingId === u.id ? (
                  <li key={u.id} className="p-3">
                    <UtensilForm
                      initial={u}
                      onSave={(next) => {
                        updateUtensil(u.id, next)
                        setEditingId(null)
                      }}
                      onCancel={() => setEditingId(null)}
                      onDelete={() => {
                        removeUtensil(u.id)
                        setEditingId(null)
                      }}
                    />
                  </li>
                ) : (
                  <li key={u.id} className="flex items-center gap-1 py-1.5 pr-3 pl-4">
                    <div className={`min-w-0 flex-1 ${u.disponible ? '' : 'opacity-50'}`}>
                      <p className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{u.nombre}</span>
                        {u.capacidad && <span className="shrink-0 rounded-full bg-black/5 px-1.5 text-xs font-semibold dark:bg-white/10">{u.capacidad}</span>}
                      </p>
                      {u.notas && <p className={`truncate text-xs ${muted}`}>{u.notas}</p>}
                    </div>
                    <button type="button" onClick={() => setEditingId(u.id)} aria-label={`Editar ${u.nombre}`} className={`grid size-10 shrink-0 place-items-center rounded-full ${muted} active:bg-black/5`}>
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={u.disponible}
                      aria-label={`${u.nombre} disponible`}
                      onClick={() => toggleUtensil(u.id)}
                      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${u.disponible ? 'bg-olive' : 'bg-black/15 dark:bg-white/20'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white transition-transform ${u.disponible ? 'translate-x-5' : ''}`} />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
