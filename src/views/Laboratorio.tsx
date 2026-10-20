import { Check, ChevronLeft, ChevronRight, CircleCheck, FlaskConical, HelpCircle, Pause, Play, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import AdaptPanel from '../components/AdaptPanel'
import ServingsStepper from '../components/ServingsStepper'
import Sheet from '../components/Sheet'
import { card, muted, primaryBtn } from '../components/ui'
import type { Technique } from '../data/techniques'
import { splitByTechniques } from '../lib/techniques'
import { missingIngredients, missingUtensils, scaleRecipe, stepSeconds } from '../lib/recipes'
import { isOptional, splitByChanges, substitutesFor, type IngredientChange } from '../lib/substitutes'
import { formatQty } from '../lib/utils'
import { servingsOf, useInventory } from '../store/inventory'
import type { Recipe, RecipeIngredient } from '../types/recipe'

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function beep(ctx: AudioContext) {
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    gain.gain.value = 0.3
    osc.frequency.value = 880
    osc.connect(gain).connect(ctx.destination)
    osc.start(ctx.currentTime + i * 0.4)
    osc.stop(ctx.currentTime + i * 0.4 + 0.2)
  }
}

function StepTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds)
  const [endAt, setEndAt] = useState<number | null>(null)
  // iOS only allows audio from a context created inside a user gesture, so it's made on Start
  const audio = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (endAt === null) return
    // deadline-based so a throttled background tab still shows the right time
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setLeft(l)
      if (l === 0) {
        setEndAt(null)
        if (audio.current) beep(audio.current)
      }
    }, 250)
    return () => clearInterval(id)
  }, [endAt])

  const running = endAt !== null
  const big = 'grid size-14 place-items-center rounded-full'
  return (
    <div className={`${card} flex items-center gap-3 p-3`}>
      <span className={`flex-1 text-4xl font-bold tabular-nums ${left === 0 ? 'text-olive' : ''}`}>{left === 0 ? '¡Listo!' : mmss(left)}</span>
      <button
        type="button"
        aria-label={running ? 'Pausar' : 'Iniciar temporizador'}
        disabled={left === 0}
        onClick={() => {
          audio.current ??= new AudioContext()
          setEndAt(running ? null : Date.now() + left * 1000)
        }}
        className={`${big} bg-olive text-on-accent disabled:opacity-40`}
      >
        {running ? <Pause className="size-6" aria-hidden /> : <Play className="size-6" aria-hidden />}
      </button>
      <button
        type="button"
        aria-label="Reiniciar temporizador"
        onClick={() => {
          setEndAt(null)
          setLeft(seconds)
        }}
        className={`${big} bg-linen dark:bg-moss-light`}
      >
        <RotateCcw className="size-5" aria-hidden />
      </button>
    </div>
  )
}

/** Inline note for a substituted/omitted ingredient mention */
function ChangeMark({ texto, cambio }: { texto: string; cambio: IngredientChange }) {
  if (cambio.parcial)
    return (
      <>
        {texto} <span className="text-terracotta">({cambio.sustituto ? `+ ${cambio.sustituto}` : 'usa lo que tengas'})</span>
      </>
    )
  return (
    <>
      <s className="opacity-50">{texto}</s>{' '}
      <span className="rounded-md bg-terracotta/15 px-1 text-terracotta">{cambio.sustituto ?? 'omitido'}</span>
    </>
  )
}

function TechniqueText({ text, onHelp }: { text: string; onHelp: (t: Technique) => void }) {
  return splitByTechniques(text).map((seg, n) =>
    typeof seg === 'string' ? (
      seg
    ) : (
      <span key={n} className="whitespace-nowrap">
        <span className="text-olive underline decoration-olive/60 decoration-dashed underline-offset-4">{seg.texto}</span>
        <button
          type="button"
          onClick={() => onHelp(seg.tecnica)}
          aria-label={`Qué significa ${seg.tecnica.termino}`}
          className="ml-0.5 inline-grid size-8 place-items-center rounded-full align-middle text-olive active:bg-olive/10"
        >
          <HelpCircle className="size-5" aria-hidden />
        </button>
      </span>
    ),
  )
}

/** Step text with substituted/omitted ingredients marked and culinary techniques highlighted */
function StepText({ text, changes, onHelp }: { text: string; changes: IngredientChange[]; onHelp: (t: Technique) => void }) {
  return (
    <p className="text-2xl leading-snug font-semibold md:text-3xl">
      {splitByChanges(text, changes).map((seg, n) =>
        typeof seg === 'string' ? <TechniqueText key={n} text={seg} onHelp={onHelp} /> : <ChangeMark key={n} {...seg} />,
      )}
    </p>
  )
}

function CookMode({ recipe, changes, onExit }: { recipe: Recipe; changes: IngredientChange[]; onExit: () => void }) {
  const { deductIngredients } = useInventory()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [technique, setTechnique] = useState<Technique | null>(null)
  // step 0 is the mise en place (ingredient list), then the recipe steps
  const total = recipe.pasos.length + 1
  const last = step === total - 1
  const withSubs = changes.some((c) => c.sustituto)
  const withOmits = changes.some((c) => !c.sustituto)
  const changeLabel = withSubs && withOmits ? 'Cocinando con sustituciones y faltantes omitidos' : withSubs ? 'Cocinando con sustituciones' : 'Cocinando con faltantes omitidos'

  // keep the screen on while cooking (Safari 16.4+); silently skipped where unsupported
  useEffect(() => {
    let lock: WakeLockSentinel | undefined
    let released = false
    navigator.wakeLock
      ?.request('screen')
      .then((l) => {
        if (released) l.release()
        else lock = l
      })
      .catch(() => {})
    return () => {
      released = true
      lock?.release()
    }
  }, [])

  function finish() {
    deductIngredients(recipe.ingredientes)
    setDone(true)
  }

  const navBtn = 'flex h-14 items-center justify-center gap-1 rounded-3xl text-base font-bold active:opacity-80 disabled:opacity-30'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-linen pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),0.75rem)] dark:bg-basalt">
      <header className="flex items-center gap-2 px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{recipe.titulo}</p>
          {recipe.adaptadaA && <p className="text-xs font-bold text-olive">Adaptada a tu {recipe.adaptadaA}</p>}
          {changes.length > 0 && !done && (
            <span className="mt-0.5 inline-flex rounded-full bg-terracotta/15 px-2 py-0.5 text-xs font-bold text-terracotta">{changeLabel}</span>
          )}
          {!done && <p className={`text-xs ${muted}`}>{step === 0 ? 'Prepara los ingredientes' : `Paso ${step} de ${total - 1}`}</p>}
        </div>
        <button type="button" onClick={onExit} aria-label="Salir del modo cocina" className="grid size-10 place-items-center rounded-full bg-oat dark:bg-moss">
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div className="mx-4 h-1 rounded-full bg-oat dark:bg-moss">
        <div className="h-full rounded-full bg-olive transition-all" style={{ width: `${done ? 100 : ((step + 1) / total) * 100}%` }} />
      </div>

      {done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <CircleCheck className="size-16 text-olive" aria-hidden />
          <p className="text-2xl font-bold">¡Buen provecho!</p>
          <p className={`text-sm ${muted}`}>Despensa actualizada con lo usado para {recipe.raciones} {recipe.raciones === 1 ? 'ración' : 'raciones'}.</p>
          <button type="button" onClick={onExit} className={`${primaryBtn} mt-2 w-full max-w-xs`}>
            Volver al Laboratorio
          </button>
        </div>
      ) : (
        <>
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            <ul hidden={step !== 0} className="space-y-2 text-xl leading-snug font-semibold">
              {recipe.ingredientes.map((i, n) => {
                const cambio = changes.find((c) => c.nombre === i.nombre)
                const line = (
                  <>
                    <span className="text-olive">{formatQty(i.cantidad, i.unidad) || '•'}</span> {i.nombre}
                  </>
                )
                return <li key={n}>{cambio ? <ChangeMark texto={`${formatQty(i.cantidad, i.unidad)} ${i.nombre}`.trim()} cambio={cambio} /> : line}</li>
              })}
            </ul>
            {/* every step stays mounted so a running timer keeps going (and beeps) after moving on */}
            {recipe.pasos.map((text, n) => {
              const secs = stepSeconds(text)
              return (
                <div key={n} hidden={step !== n + 1} className="space-y-4">
                  <StepText text={text} changes={changes} onHelp={setTechnique} />
                  {secs ? <StepTimer seconds={secs} /> : null}
                </div>
              )
            })}
          </div>
          <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-2 px-4">
            <button type="button" onClick={() => setStep(step - 1)} disabled={step === 0} className={`${navBtn} bg-oat dark:bg-moss`}>
              <ChevronLeft className="size-5" aria-hidden />
              Anterior
            </button>
            {last ? (
              <button type="button" onClick={finish} className={`${navBtn} bg-olive text-on-accent`}>
                ¡Receta Finalizada!
              </button>
            ) : (
              <button type="button" onClick={() => setStep(step + 1)} className={`${navBtn} bg-olive text-on-accent`}>
                Siguiente paso
                <ChevronRight className="size-5" aria-hidden />
              </button>
            )}
          </div>
        </>
      )}
      <Sheet open={technique !== null} onClose={() => setTechnique(null)} title={technique?.termino ?? ''}>
        <p className="px-1 pb-2 text-base leading-relaxed">{technique?.definicion}</p>
      </Sheet>
    </div>
  )
}

function CheckRow({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-center gap-2 px-3 py-1.5 text-sm">
      {ok ? <Check className="size-4 shrink-0 text-olive" aria-label="Disponible" /> : <X className="size-4 shrink-0 text-terracotta" aria-label="Falta" />}
      <span className={`flex-1 ${ok ? '' : 'font-semibold'}`}>{label}</span>
      {detail && <span className="text-xs font-semibold text-terracotta">{detail}</span>}
    </li>
  )
}

function MissingRow({ item, recipe, choice, onChoose }: { item: RecipeIngredient; recipe: Recipe; choice: string | null | undefined; onChoose: (c: string | null | undefined) => void }) {
  const { pantry } = useInventory()
  const original = recipe.ingredientes.find((i) => i.nombre === item.nombre)
  const parcial = item.cantidad != null && item.cantidad !== original?.cantidad
  const optional = isOptional(item.nombre)
  // tapping the active choice clears it
  const chip = (value: string | null, label: string, extra?: string) => (
    <button
      key={label}
      type="button"
      aria-pressed={choice === value}
      onClick={() => onChoose(choice === value ? undefined : value)}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
        choice === value ? 'border-olive bg-olive text-on-accent' : 'border-black/10 dark:border-white/15'
      }`}
    >
      {label}
      {extra && <span className={choice === value ? '' : 'text-olive'}> · {extra}</span>}
    </button>
  )

  return (
    <li className="px-3 py-2">
      <p className="flex items-baseline gap-2 text-sm">
        <span className="flex-1 font-semibold">{original?.nombre ?? item.nombre}</span>
        <span className="text-xs font-semibold text-terracotta">{parcial ? `faltan ${formatQty(item.cantidad, item.unidad)}` : 'no hay'}</span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {substitutesFor(item.nombre, pantry).map((s) => chip(s.nombre, s.nombre, s.enDespensa ? 'en despensa' : undefined))}
        {chip(null, parcial ? 'Usar lo que tengo' : optional ? 'Prescindir sin alterar la base' : 'Omitir')}
      </div>
    </li>
  )
}

export default function Laboratorio() {
  const { recipes, pantry, utensils, labRecipeId, setLabRecipeId, servings, setServings } = useInventory()
  const [cooking, setCooking] = useState(false)
  const selected = recipes.find((r) => r.id === labRecipeId)
  // adapted version lives only here; switching recipe discards it
  const [adapted, setAdapted] = useState<Recipe | null>(null)
  // missing ingredient name → substitute, or null = omit; absent = undecided
  const [choices, setChoices] = useState<Record<string, string | null>>({})
  const [cookAnyway, setCookAnyway] = useState(false)
  const recipe = selected && scaleRecipe(adapted ?? selected, servingsOf(selected, servings))

  if (!recipes.length)
    return (
      <div className={`${card} p-4 text-center`}>
        <FlaskConical className="mx-auto mb-2 size-8 text-olive" aria-hidden />
        <p className="text-sm font-semibold">No hay recetas guardadas</p>
        <p className={`text-xs ${muted}`}>Guarda alguna desde Descubrir para cocinarla aquí.</p>
      </div>
    )

  const missing = recipe ? missingIngredients(recipe.ingredientes, pantry) : []
  const noUtensils = recipe ? missingUtensils(recipe, utensils) : []
  const undecided = missing.filter((m) => !(m.nombre in choices))
  const changes: IngredientChange[] = missing
    .filter((m) => m.nombre in choices || cookAnyway)
    .map((m) => ({
      nombre: m.nombre,
      sustituto: choices[m.nombre] ?? null,
      parcial: m.cantidad != null && m.cantidad !== recipe!.ingredientes.find((i) => i.nombre === m.nombre)?.cantidad,
    }))
  const canCook = undecided.length === 0 || cookAnyway

  function choose(nombre: string, value: string | null | undefined) {
    setChoices((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[nombre]
      else next[nombre] = value
      return next
    })
  }

  return (
    <div className="flex flex-col gap-2.5">
      <select
        value={labRecipeId ?? ''}
        onChange={(e) => {
          setLabRecipeId(e.target.value)
          setAdapted(null)
          setChoices({})
          setCookAnyway(false)
        }}
        aria-label="Receta activa"
        className="h-10 rounded-xl bg-oat px-3 text-base font-semibold dark:bg-moss"
      >
        <option value="" disabled>
          Elige una receta para cocinar
        </option>
        {recipes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.titulo}
          </option>
        ))}
      </select>

      {recipe && selected && (
        <>
          {recipe.adaptadaA && (
            <span className="self-start rounded-full bg-olive px-2.5 py-0.5 text-xs font-bold text-on-accent">Adaptada a tu {recipe.adaptadaA}</span>
          )}
          <div className={`${card} px-3 py-2`}>
            <ServingsStepper value={recipe.raciones} base={(adapted ?? selected).raciones} onChange={(n) => setServings(selected.id, n)} />
          </div>
          <section>
            <h2 className={`px-4 pb-1 text-xs font-bold uppercase ${muted}`}>
              Ingredientes · {recipe.ingredientes.length - missing.length}/{recipe.ingredientes.length}
            </h2>
            <ul className={`${card} divide-y divide-black/5 py-1 dark:divide-white/5`}>
              {recipe.ingredientes.map((i, n) => {
                const lack = missing.find((m) => m.nombre === i.nombre)
                return (
                  <CheckRow
                    key={n}
                    ok={!lack}
                    label={`${formatQty(i.cantidad, i.unidad)} ${i.nombre}`.trim()}
                    detail={lack ? (lack.cantidad != null && lack.cantidad !== i.cantidad ? `faltan ${formatQty(lack.cantidad, lack.unidad)}` : 'no hay') : undefined}
                  />
                )
              })}
            </ul>
          </section>

          {!!recipe.utensilios?.length && (
            <section>
              <h2 className={`px-4 pb-1 text-xs font-bold uppercase ${muted}`}>Utensilios</h2>
              <ul className={`${card} divide-y divide-black/5 py-1 dark:divide-white/5`}>
                {recipe.utensilios.map((u) => (
                  <CheckRow key={u} ok={!noUtensils.includes(u)} label={u} detail={noUtensils.includes(u) ? 'no disponible' : undefined} />
                ))}
              </ul>
            </section>
          )}

          {missing.length > 0 &&
            (
              [
                ['Básicos · base de la receta', missing.filter((m) => !isOptional(m.nombre))],
                ['Prescindibles · especias y aromáticos', missing.filter((m) => isOptional(m.nombre))],
              ] as const
            ).map(
              ([title, items]) =>
                items.length > 0 && (
                  <section key={title}>
                    <h2 className="px-4 pb-1 text-xs font-bold text-terracotta uppercase">Faltan · {title}</h2>
                    <ul className={`${card} divide-y divide-black/5 py-1 dark:divide-white/5`}>
                      {items.map((m) => (
                        <MissingRow key={m.nombre} item={m} recipe={recipe} choice={choices[m.nombre]} onChoose={(v) => choose(m.nombre, v)} />
                      ))}
                    </ul>
                  </section>
                ),
            )}

          {undecided.length > 0 && (
            <label className={`${card} flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm font-semibold`}>
              <input type="checkbox" checked={cookAnyway} onChange={(e) => setCookAnyway(e.target.checked)} className="size-5 accent-olive" />
              Omitir faltantes / Hacer la receta de todos modos
            </label>
          )}

          {noUtensils.length > 0 && (
            <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-terracotta">
              <TriangleAlert className="size-3.5" aria-hidden />
              Sin {noUtensils.join(', ')}: puedes cocinar igualmente o adaptar la receta.
            </p>
          )}

          <AdaptPanel recipe={recipe} original={selected} onChange={(r) => setAdapted(r.adaptadaA ? r : null)} />

          <button type="button" onClick={() => setCooking(true)} disabled={!canCook} className={`${primaryBtn} h-12 text-base`}>
            <FlaskConical className="size-5" aria-hidden />
            Empezar a cocinar
          </button>
          {!canCook && <p className={`-mt-1 text-center text-xs ${muted}`}>Elige un sustituto u omite cada faltante, o marca «Hacer la receta de todos modos».</p>}
        </>
      )}

      {cooking && recipe && <CookMode recipe={recipe} changes={changes} onExit={() => setCooking(false)} />}
    </div>
  )
}
