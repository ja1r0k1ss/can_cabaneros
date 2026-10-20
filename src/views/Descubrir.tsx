import { Check, ClipboardPaste, Info, Link, LoaderCircle, PenLine, Sparkles, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import AdaptPanel from '../components/AdaptPanel'
import RecipeCard from '../components/RecipeCard'
import RecipeEditor from '../components/RecipeEditor'
import { card, field, muted, primaryBtn } from '../components/ui'
import { missingUtensils, parseIngredientLine } from '../lib/recipes'
import { newId } from '../lib/utils'
import { detectPlatform } from '../lib/recipeImport'
import { suggestRecipes, type Suggestion } from '../services/ai'
import { importRecipe, type ImportResult } from '../services/recipeImport'
import { useInventory } from '../store/inventory'
import { UTENSIL_CATEGORIES, type UtensilCategory } from '../types/inventory'
import { RECIPE_CATEGORIES, type Recipe, type RecipeCategory, type RecipeIngredient } from '../types/recipe'

const MODES = [
  { id: 'url', label: 'Enlace', icon: Link },
  { id: 'manual', label: 'Manual', icon: PenLine },
  { id: 'ia', label: 'IA', icon: Sparkles },
] as const

function SaveButton({ recipe }: { recipe: Recipe }) {
  const { recipes, saveRecipe } = useInventory()
  const saved = recipes.some((r) => r.id === recipe.id)
  return (
    <button type="button" onClick={() => saveRecipe(recipe)} disabled={saved} className={`${primaryBtn} w-full`}>
      {saved ? <Check className="size-4" aria-hidden /> : null}
      {saved ? 'Guardada en Mis Recetas' : 'Guardar en Mis Recetas'}
    </button>
  )
}

/** Discovered recipe: equipment check, optional adaptation and save */
function PreviewCard({ recipe: original, open, children }: { recipe: Recipe; open?: boolean; children?: ReactNode }) {
  const { utensils } = useInventory()
  const [recipe, setRecipe] = useState(original)
  const lacking = missingUtensils(recipe, utensils)

  return (
    <RecipeCard recipe={recipe} open={open}>
      {children}
      {lacking.length > 0 && <p className="text-xs font-semibold text-terracotta">No tienes disponible: {lacking.join(', ')}</p>}
      <AdaptPanel recipe={recipe} original={original} onChange={setRecipe} />
      <SaveButton recipe={recipe} />
    </RecipeCard>
  )
}

function UrlImport() {
  const { saveRecipe } = useInventory()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [toast, setToast] = useState('')
  const platform = detectPlatform(url.trim())

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(t)
  }, [toast])

  async function run(link: string) {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const r = await importRecipe(link)
      setResult(r)
      // save straight away when there is something to save; empty reads go to the editor instead
      if (r.recipe.ingredientes.length || r.recipe.pasos.length) {
        saveRecipe(r.recipe)
        setToast('¡Receta extraída e importada con éxito! 🎉')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar la receta')
    } finally {
      setLoading(false)
    }
  }

  async function pasteFromClipboard() {
    try {
      // iOS shows its "Pegar" bubble: reading the clipboard always needs this tap
      const text = (await navigator.clipboard.readText()).trim()
      const link = text.match(/https?:\/\/\S+/)?.[0] ?? text
      setUrl(link)
      if (detectPlatform(link)) run(link)
      else setError('El portapapeles no contiene un enlace de TikTok, Instagram o YouTube.')
    } catch {
      setError('No se pudo leer el portapapeles. Pega el enlace a mano.')
    }
  }

  const sourceList = result
    ? [result.fuentes.descripcion && 'descripción', result.fuentes.comentarios > 0 && 'comentarios del creador', result.fuentes.transcripcion && 'audio'].filter(Boolean).join(', ')
    : ''
  const notice = result && (
    <div className="flex flex-col gap-1 px-1 text-xs font-semibold">
      {sourceList && (
        <p className={`flex gap-1.5 ${result.completa ? 'text-olive' : 'text-terracotta'}`}>
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          Análisis completado con: {sourceList}
          {result.motor === 'claude' ? ' · combinado con IA' : ''}
        </p>
      )}
      {result.avisos.map((a) => (
        <p key={a} className="flex gap-1.5 text-terracotta">
          <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {a}
        </p>
      ))}
      {result.recipe.revisar && <p className={muted}>Marcada «Revisar ingredientes»: corrige lo que falte y pulsa guardar.</p>}
    </div>
  )

  return (
    <div className="flex flex-col gap-2.5">
      {toast && (
        <div role="status" className="fixed inset-x-4 top-[max(env(safe-area-inset-top),0.75rem)] z-40 mx-auto max-w-sm rounded-3xl bg-olive px-4 py-3 text-center text-sm font-bold text-on-accent">
          {toast}
        </div>
      )}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          run(url.trim())
        }}
        className={`${card} flex flex-col gap-2 p-3`}
      >
        <div className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="Enlace de TikTok, Instagram o YouTube"
            aria-label="Enlace de la receta"
            className={`${field} flex-1`}
          />
          <button type="button" onClick={pasteFromClipboard} disabled={loading} aria-label="Pegar enlace del portapapeles" className="grid size-10 shrink-0 place-items-center rounded-full bg-linen text-olive active:opacity-70 dark:bg-moss-light">
            <ClipboardPaste className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex-1 text-xs font-semibold ${platform ? 'text-olive' : muted}`}>
            {loading ? 'Leyendo descripción, comentarios y audio…' : platform ? `Detectado: ${platform}` : 'Reels, Shorts y vídeos de TikTok'}
          </span>
          <button type="submit" disabled={loading || !platform} className={primaryBtn}>
            {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {loading ? 'Importando…' : 'Importar'}
          </button>
        </div>
        {error && <p className="text-sm font-semibold text-brick">{error}</p>}
      </form>
      {result && <RecipeEditor key={result.recipe.id} recipe={result.recipe} notice={notice} startPasting={!result.recipe.ingredientes.length && !result.recipe.pasos.length} />}
    </div>
  )
}

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)

function ManualForm() {
  const { saveRecipe } = useInventory()
  const [savedTitle, setSavedTitle] = useState('')

  // React 19 form action: receives FormData and resets the form afterwards
  function create(form: FormData) {
    const titulo = String(form.get('titulo')).trim()
    if (!titulo) return
    const num = (k: string) => Math.max(0, Number(form.get(k)) || 0)
    saveRecipe({
      id: newId(),
      titulo,
      origen: 'manual',
      categoria: form.get('categoria') as RecipeCategory,
      utensilios: form.getAll('utensilios') as UtensilCategory[],
      raciones: num('raciones') || 2,
      tiempoPrep: num('prep'),
      tiempoCoccion: num('coccion'),
      ingredientes: lines(String(form.get('ingredientes'))).map(parseIngredientLine).filter((i): i is RecipeIngredient => i !== null),
      pasos: lines(String(form.get('pasos'))),
    })
    setSavedTitle(titulo)
  }

  return (
    <form action={create} className={`${card} grid grid-cols-3 gap-2 p-3`}>
      <input name="titulo" required placeholder="Título" aria-label="Título" className={`${field} col-span-2`} />
      <select name="categoria" defaultValue="Principal" aria-label="Categoría" className={`${field} px-2`}>
        {RECIPE_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      {[
        ['raciones', 'Raciones'],
        ['prep', 'Prep. (min)'],
        ['coccion', 'Cocción (min)'],
      ].map(([name, label]) => (
        <label key={name} className={`flex flex-col gap-0.5 text-xs font-semibold ${muted}`}>
          {label}
          <input name={name} type="number" inputMode="numeric" min="0" placeholder="0" className={`${field} text-ink dark:text-linen`} />
        </label>
      ))}
      <textarea
        name="ingredientes"
        rows={4}
        placeholder={'Ingredientes, uno por línea\n200 g de arroz\n2 huevos'}
        aria-label="Ingredientes"
        className={`${field} col-span-3 h-auto py-2`}
      />
      <textarea name="pasos" rows={4} placeholder="Pasos, uno por línea" aria-label="Pasos" className={`${field} col-span-3 h-auto py-2`} />
      <fieldset className="col-span-3 flex flex-wrap gap-1.5">
        <legend className={`mb-1 text-xs font-semibold ${muted}`}>Utensilios necesarios</legend>
        {UTENSIL_CATEGORIES.map((c) => (
          <label
            key={c}
            className="cursor-pointer rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold has-checked:border-olive has-checked:bg-olive has-checked:text-on-accent dark:border-white/15"
          >
            <input type="checkbox" name="utensilios" value={c} className="sr-only" />
            {c}
          </label>
        ))}
      </fieldset>
      <button type="submit" className={`${primaryBtn} col-span-3`}>
        Guardar en Mis Recetas
      </button>
      {savedTitle && <p className="col-span-3 text-center text-sm font-semibold text-olive">«{savedTitle}» guardada</p>}
    </form>
  )
}

function AiSuggest() {
  const { pantry } = useInventory()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Suggestion[] | null>(null)

  async function suggest() {
    setLoading(true)
    setResults(await suggestRecipes(pantry))
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button type="button" onClick={suggest} disabled={loading} className={`${primaryBtn} w-full`}>
        {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {loading ? 'Pensando…' : 'Sugerir receta según mi despensa actual'}
      </button>
      {results?.length === 0 && <p className={`py-4 text-center text-sm ${muted}`}>No hay recetas con tu stock actual. Prueba a cargar un ticket.</p>}
      {results?.map(({ recipe, missing }) => (
        <PreviewCard key={recipe.id} recipe={recipe}>
          <p className={`text-xs font-semibold ${missing.length ? 'text-terracotta' : 'text-olive'}`}>
            {missing.length ? `Te falta: ${missing.join(', ')}` : 'Tienes todos los ingredientes'}
          </p>
        </PreviewCard>
      ))}
    </div>
  )
}

export default function Descubrir() {
  const [mode, setMode] = useState<(typeof MODES)[number]['id']>('url')

  return (
    <div className="flex flex-col gap-2.5">
      {/* iOS segmented control */}
      <div role="tablist" className={`${card} grid grid-cols-3 gap-0.5 rounded-xl p-0.5`}>
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={`flex h-8 items-center justify-center gap-1.5 rounded-[10px] text-sm font-semibold ${
              mode === id ? 'bg-linen text-olive dark:bg-moss-lighter dark:text-linen' : muted
            }`}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {/* all three stay mounted so switching tabs keeps typed text and results */}
      <div hidden={mode !== 'url'}>
        <UrlImport />
      </div>
      <div hidden={mode !== 'manual'}>
        <ManualForm />
      </div>
      <div hidden={mode !== 'ia'}>
        <AiSuggest />
      </div>
    </div>
  )
}
