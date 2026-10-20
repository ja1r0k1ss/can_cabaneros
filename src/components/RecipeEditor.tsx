import { Check, Pencil, Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { buildImport } from '../lib/recipeImport'
import { inferUtensils } from '../lib/recipes'
import { newId } from '../lib/utils'
import { useInventory } from '../store/inventory'
import { UNITS, type Unit } from '../types/inventory'
import type { Recipe } from '../types/recipe'
import { card, field, muted, primaryBtn } from './ui'

// numbers kept as text while editing so inputs can be momentarily empty
interface IngRow {
  key: string
  cantidad: string
  unidad: Unit | ''
  nombre: string
}
interface Draft {
  titulo: string
  raciones: string
  tiempoPrep: string
  tiempoCoccion: string
  ingredientes: IngRow[]
  pasos: { key: string; texto: string }[]
}

const toDraft = (r: Recipe): Draft => ({
  titulo: r.titulo,
  raciones: String(r.raciones),
  tiempoPrep: String(r.tiempoPrep),
  tiempoCoccion: String(r.tiempoCoccion),
  ingredientes: r.ingredientes.map((i) => ({ key: newId(), cantidad: i.cantidad == null ? '' : String(i.cantidad).replace('.', ','), unidad: i.unidad ?? '', nombre: i.nombre })),
  pasos: r.pasos.map((texto) => ({ key: newId(), texto })),
})

const num = (s: string) => Number(s.replace(',', '.'))

/** "Revisar receta importada": every field editable before it lands in Mis Recetas */
export default function RecipeEditor({ recipe, notice, startPasting }: { recipe: Recipe; notice?: ReactNode; startPasting?: boolean }) {
  const { saveRecipe, recipes } = useInventory()
  const [draft, setDraft] = useState(() => toDraft(recipe))
  const [pasting, setPasting] = useState(!!startPasting)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState('')
  const saved = recipes.find((r) => r.id === recipe.id)

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))
  const setIng = (key: string, patch: Partial<IngRow>) => set({ ingredientes: draft.ingredientes.map((i) => (i.key === key ? { ...i, ...patch } : i)) })

  function analyzePasted() {
    const { recipe: parsed } = buildImport(recipe.fuente ?? '', { texto: pasted })
    if (!parsed.ingredientes.length && !parsed.pasos.length) {
      setError('No se encontraron ingredientes ni pasos en el texto pegado.')
      return
    }
    const next = toDraft(parsed)
    // keep what the user already has where the pasted text brings nothing
    setDraft((d) => ({
      titulo: d.titulo && d.titulo !== 'Receta importada' ? d.titulo : next.titulo,
      raciones: next.raciones,
      tiempoPrep: next.tiempoPrep,
      tiempoCoccion: next.tiempoCoccion !== '0' ? next.tiempoCoccion : d.tiempoCoccion,
      ingredientes: next.ingredientes.length ? next.ingredientes : d.ingredientes,
      pasos: next.pasos.length ? next.pasos : d.pasos,
    }))
    setError('')
    setPasting(false)
  }

  function save() {
    const ingredientes = draft.ingredientes
      .filter((i) => i.nombre.trim())
      .map((i) => {
        const cantidad = num(i.cantidad)
        return i.cantidad.trim() && Number.isFinite(cantidad) && cantidad > 0
          ? { nombre: i.nombre.trim(), cantidad, unidad: i.unidad || 'ud' }
          : { nombre: i.nombre.trim() }
      })
    const pasos = draft.pasos.map((p) => p.texto.trim()).filter(Boolean)
    const problem = !draft.titulo.trim() ? 'Pon un título.' : !ingredientes.length ? 'Añade al menos un ingrediente.' : !pasos.length ? 'Añade al menos un paso.' : ''
    setError(problem)
    if (problem) return
    saveRecipe({
      ...recipe,
      titulo: draft.titulo.trim(),
      raciones: Math.max(1, Math.round(num(draft.raciones)) || 2),
      tiempoPrep: Math.max(0, Math.round(num(draft.tiempoPrep)) || 0),
      tiempoCoccion: Math.max(0, Math.round(num(draft.tiempoCoccion)) || 0),
      utensilios: inferUtensils(pasos),
      ingredientes,
      pasos,
      revisar: false, // the user has reviewed it here
    })
  }

  const label = `text-xs font-semibold ${muted}`
  const iconBtn = `grid size-10 shrink-0 place-items-center rounded-full ${muted} active:bg-black/5`
  const addBtn = 'flex items-center gap-1 text-xs font-semibold text-olive'

  return (
    <section className={`${card} flex flex-col gap-2.5 p-3`}>
      <h2 className="px-1 text-base font-bold">Revisar receta importada</h2>
      {notice}

      <button
        type="button"
        onClick={() => setPasting((p) => !p)}
        aria-expanded={pasting}
        className="flex h-10 items-center justify-center gap-1.5 rounded-3xl border-2 border-olive text-sm font-semibold text-olive active:opacity-70"
      >
        <Pencil className="size-4" aria-hidden />
        Ajustar datos manualmente
      </button>
      {pasting && (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={6}
            placeholder={'Pega aquí la descripción o el texto del vídeo.\nIngredientes:\n- 300 g de lentejas\nPreparación:\n1. …'}
            aria-label="Texto del vídeo"
            className={`${field} h-auto py-2`}
          />
          <button type="button" onClick={analyzePasted} disabled={!pasted.trim()} className={primaryBtn}>
            Analizar texto
          </button>
        </div>
      )}

      <input value={draft.titulo} onChange={(e) => set({ titulo: e.target.value })} placeholder="Título" aria-label="Título" className={field} />
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['raciones', 'Raciones base'],
            ['tiempoPrep', 'Prep. (min)'],
            ['tiempoCoccion', 'Cocción (min)'],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className={`flex flex-col gap-0.5 ${label}`}>
            {text}
            <input value={draft[key]} onChange={(e) => set({ [key]: e.target.value })} inputMode="numeric" className={`${field} text-ink dark:text-linen`} />
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className={label}>Ingredientes ({draft.ingredientes.length})</h3>
        <button type="button" onClick={() => set({ ingredientes: [...draft.ingredientes, { key: newId(), cantidad: '', unidad: 'g', nombre: '' }] })} className={addBtn}>
          <Plus className="size-3.5" aria-hidden />
          Añadir
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {draft.ingredientes.map((i) => (
          <li key={i.key} className="grid grid-cols-[3.5rem_4.25rem_1fr_2.5rem] gap-1.5">
            <input value={i.cantidad} onChange={(e) => setIng(i.key, { cantidad: e.target.value })} inputMode="decimal" placeholder="—" aria-label="Cantidad" className={`${field} px-2 text-right`} />
            <select value={i.unidad} onChange={(e) => setIng(i.key, { unidad: e.target.value as Unit | '' })} aria-label="Unidad" className={`${field} px-1.5`}>
              <option value="">—</option>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <input value={i.nombre} onChange={(e) => setIng(i.key, { nombre: e.target.value })} placeholder="Ingrediente" aria-label="Ingrediente" className={field} />
            <button type="button" onClick={() => set({ ingredientes: draft.ingredientes.filter((x) => x.key !== i.key) })} aria-label={`Quitar ${i.nombre}`} className={iconBtn}>
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between px-1">
        <h3 className={label}>Pasos ({draft.pasos.length})</h3>
        <button type="button" onClick={() => set({ pasos: [...draft.pasos, { key: newId(), texto: '' }] })} className={addBtn}>
          <Plus className="size-3.5" aria-hidden />
          Añadir
        </button>
      </div>
      {!draft.pasos.length && <p className={`px-1 text-xs ${muted}`}>Sin pasos: añádelos o pega el texto del vídeo arriba.</p>}
      <ol className="flex flex-col gap-1.5">
        {draft.pasos.map((p, n) => (
          <li key={p.key} className="flex items-start gap-1.5">
            <span className="w-5 pt-2.5 text-right text-sm font-bold text-olive">{n + 1}</span>
            <textarea
              value={p.texto}
              onChange={(e) => set({ pasos: draft.pasos.map((x) => (x.key === p.key ? { ...x, texto: e.target.value } : x)) })}
              rows={2}
              aria-label={`Paso ${n + 1}`}
              className={`${field} h-auto flex-1 py-2`}
            />
            <button type="button" onClick={() => set({ pasos: draft.pasos.filter((x) => x.key !== p.key) })} aria-label={`Quitar paso ${n + 1}`} className={iconBtn}>
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ol>

      {error && <p className="px-1 text-sm font-semibold text-brick">{error}</p>}
      <button type="button" onClick={save} className={primaryBtn}>
        {saved && <Check className="size-4" aria-hidden />}
        {saved ? 'Guardada · guardar cambios' : 'Guardar en Mis Recetas'}
      </button>
    </section>
  )
}
