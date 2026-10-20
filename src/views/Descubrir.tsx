import { Check, Info, Link, LoaderCircle, PenLine, Sparkles } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import AdaptPanel from '../components/AdaptPanel'
import RecipeCard from '../components/RecipeCard'
import { card, field, muted, primaryBtn } from '../components/ui'
import { missingUtensils, parseIngredientLine } from '../lib/recipes'
import { newId } from '../lib/utils'
import { detectPlatform, parseRecipeUrl, suggestRecipes, type Suggestion, type UrlImport } from '../services/ai'
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
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<UrlImport | null>(null)
  const platform = detectPlatform(url.trim())

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      setResult(await parseRecipeUrl(url.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo importar la receta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <form onSubmit={submit} className={`${card} flex flex-col gap-2 p-3`}>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="Pega un enlace de TikTok, Instagram o YouTube"
          aria-label="Enlace de la receta"
          className={field}
        />
        <div className="flex items-center gap-2">
          <span className={`flex-1 text-xs font-semibold ${platform ? 'text-olive' : muted}`}>
            {platform ? `Detectado: ${platform}` : 'Reels, Shorts y vídeos de TikTok'}
          </span>
          <button type="submit" disabled={loading || !platform} className={primaryBtn}>
            {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {loading ? 'Analizando…' : 'Importar'}
          </button>
        </div>
        {error && <p className="text-sm font-semibold text-brick">{error}</p>}
      </form>
      {result && (
        <>
          <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-olive">
            <Info className="size-3.5 shrink-0" aria-hidden />
            {result.usoDescripcion
              ? 'Análisis completado (incluyendo texto de la descripción del vídeo)'
              : 'Análisis completado (transcripción del audio)'}
          </p>
          <PreviewCard key={result.recipe.id} recipe={result.recipe} open />
        </>
      )}
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
