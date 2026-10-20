import { useInventory } from '../store/inventory'
import { UTENSIL_CATEGORIES } from '../types/inventory'

export default function Utensilios() {
  const { utensils, toggleUtensil } = useInventory()
  const available = utensils.filter((u) => u.disponible).length

  return (
    <div className="flex flex-col gap-2.5">
      <p className="px-1 text-xs font-semibold text-ink/60 dark:text-sage">
        {available} de {utensils.length} disponibles en mi cocina
      </p>
      {UTENSIL_CATEGORIES.map((cat) => {
        const items = utensils.filter((u) => u.categoria === cat)
        if (!items.length) return null
        return (
          <section key={cat}>
            <h2 className="px-4 pb-1 text-xs font-bold tracking-wide text-ink/50 uppercase dark:text-sage">{cat}</h2>
            <ul className="divide-y divide-black/5 rounded-3xl bg-oat dark:divide-white/5 dark:bg-moss">
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
                    <span className={`flex-1 truncate text-sm font-semibold ${u.disponible ? '' : 'opacity-50'}`}>{u.nombre}</span>
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
