import { Plus } from 'lucide-react'
import { card, field, muted, primaryBtn } from '../components/ui'
import { useInventory } from '../store/inventory'
import { UTENSIL_CATEGORIES, type UtensilCategory } from '../types/inventory'

function AddUtensilForm() {
  const { addUtensil } = useInventory()

  // React 19 form action: receives FormData and resets the form afterwards
  function add(form: FormData) {
    const nombre = String(form.get('nombre')).trim()
    if (!nombre) return
    addUtensil({
      nombre,
      categoria: form.get('categoria') as UtensilCategory,
      capacidad: String(form.get('capacidad')).trim() || undefined,
      notas: String(form.get('notas')).trim() || undefined,
      disponible: true,
    })
  }

  return (
    <details className={`group ${card}`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-semibold text-olive [&::-webkit-details-marker]:hidden">
        <Plus className="size-4 transition-transform group-open:rotate-45" aria-hidden />
        Añadir utensilio
      </summary>
      <form action={add} className="grid grid-cols-2 gap-2 px-3 pb-3">
        <input name="nombre" required placeholder="Nombre (ej. Olla lenta)" aria-label="Nombre" className={`${field} col-span-2`} />
        <select name="categoria" aria-label="Categoría" className={`${field} px-2`}>
          {UTENSIL_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input name="capacidad" placeholder="Capacidad (3,1 L, 28 cm)" aria-label="Capacidad o tamaño" className={field} />
        <input name="notas" placeholder="Notas (opcional)" aria-label="Notas" className={`${field} col-span-2`} />
        <button type="submit" className={`${primaryBtn} col-span-2`}>
          Guardar
        </button>
      </form>
    </details>
  )
}

export default function Utensilios() {
  const { utensils, toggleUtensil } = useInventory()
  const available = utensils.filter((u) => u.disponible).length

  return (
    <div className="flex flex-col gap-2.5">
      <p className={`px-1 text-xs font-semibold ${muted}`}>
        {available} de {utensils.length} disponibles en mi cocina
      </p>
      <AddUtensilForm />
      {UTENSIL_CATEGORIES.map((cat) => {
        const items = utensils.filter((u) => u.categoria === cat)
        if (!items.length) return null
        return (
          <section key={cat}>
            <h2 className="px-4 pb-1 text-xs font-bold tracking-wide text-ink/50 uppercase dark:text-sage">{cat}</h2>
            <ul className={`divide-y divide-black/5 dark:divide-white/5 ${card}`}>
              {items.map((u) => (
                <li key={u.id}>
                  {/* whole row is the switch: bigger thumb target than the knob alone */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={u.disponible}
                    onClick={() => toggleUtensil(u.id)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left"
                  >
                    <span className={`min-w-0 flex-1 ${u.disponible ? '' : 'opacity-50'}`}>
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{u.nombre}</span>
                        {u.capacidad && (
                          <span className="shrink-0 rounded-full bg-black/5 px-1.5 text-xs font-semibold dark:bg-white/10">{u.capacidad}</span>
                        )}
                      </span>
                      {u.notas && <span className={`block truncate text-xs ${muted}`}>{u.notas}</span>}
                    </span>
                    <span
                      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${
                        u.disponible ? 'bg-olive' : 'bg-black/15 dark:bg-white/20'
                      }`}
                      aria-hidden
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white transition-transform ${
                          u.disponible ? 'translate-x-5' : ''
                        }`}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
