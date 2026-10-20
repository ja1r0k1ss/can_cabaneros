import { BookOpen, ChefHat, FlaskConical, Moon, Refrigerator, Search, ShoppingCart, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import Compra from './views/Compra'
import Descubrir from './views/Descubrir'
import Despensa from './views/Despensa'
import Laboratorio from './views/Laboratorio'
import Recetario from './views/Recetario'
import type { ViewProps } from './views/types'
import Utensilios from './views/Utensilios'

type Section = { id: string; label: string; icon: LucideIcon; hint: string; view: ComponentType<ViewProps> }

const SECTIONS: Section[] = [
  { id: 'compra', label: 'Compra', icon: ShoppingCart, hint: 'Lista de la compra compartida.', view: Compra },
  { id: 'despensa', label: 'Despensa', icon: Refrigerator, hint: 'Lo que hay en nevera, congelador y armarios.', view: Despensa },
  { id: 'utensilios', label: 'Utensilios', icon: ChefHat, hint: 'Inventario de cocina y electrodomésticos.', view: Utensilios },
  { id: 'recetario', label: 'Recetario', icon: BookOpen, hint: 'Mis recetas guardadas.', view: Recetario },
  { id: 'laboratorio', label: 'Laboratorio', icon: FlaskConical, hint: 'Modo cocina paso a paso.', view: Laboratorio },
  { id: 'descubrir', label: 'Descubrir', icon: Search, hint: 'Importa, crea o genera recetas.', view: Descubrir },
]

export default function App() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id)
  const active = SECTIONS.find((s) => s.id === activeId)!
  // initial class is set by the inline script in index.html
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    // browser/status bar tint; matches the linen and basalt page backgrounds
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#121511' : '#f7f6f0')
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      // storage blocked (private mode): theme just won't persist
    }
  }, [dark])

  return (
    <div className="flex h-full">
      {/* Mac: compact sidebar */}
      <aside className="hidden w-52 shrink-0 flex-col gap-1 border-r border-line p-3 md:flex dark:border-moss-light">
        <div className="mb-3 flex items-center gap-2 px-2">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-bold">Can Cabañeros</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              aria-current={id === activeId ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-sm font-semibold transition-colors ${
                id === activeId ? 'bg-oat text-olive dark:bg-moss' : 'hover:bg-oat dark:hover:bg-moss'
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* iPhone: compact large-title header */}
        <header className="flex items-start gap-3 border-b border-line px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 md:px-6 md:pt-4 dark:border-moss-light">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-bold">{active.label}</h1>
            <p className="truncate text-sm text-ink/60 dark:text-sage">{active.hint}</p>
          </div>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-oat active:opacity-70 dark:bg-moss"
          >
            {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
          </button>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 pb-24 md:px-6 md:pb-6">
          <div className="mx-auto max-w-3xl">
            <active.view navigate={setActiveId} />
          </div>
        </main>
      </div>

      {/* iPhone: fixed bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-line bg-linen/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-moss-light dark:bg-basalt/90"
        aria-label="Secciones"
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveId(id)}
            aria-current={id === activeId ? 'page' : undefined}
            className={`flex min-w-0 flex-col items-center gap-0.5 pt-1.5 pb-1 text-[10px] font-semibold ${
              id === activeId ? 'text-olive' : 'text-ink/50 dark:text-sage'
            }`}
          >
            <Icon className="size-5" aria-hidden />
            <span className="w-full truncate text-center">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
