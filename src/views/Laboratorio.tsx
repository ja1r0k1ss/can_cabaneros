import { Check, ChevronLeft, ChevronRight, CircleCheck, FlaskConical, Pause, Play, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { card, muted, primaryBtn } from '../components/ui'
import { missingIngredients, missingUtensils, stepSeconds } from '../lib/recipes'
import { formatQty } from '../lib/utils'
import { useInventory } from '../store/inventory'
import type { Recipe } from '../types/recipe'

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

function CookMode({ recipe, onExit }: { recipe: Recipe; onExit: () => void }) {
  const { deductIngredients } = useInventory()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  // step 0 is the mise en place (ingredient list), then the recipe steps
  const total = recipe.pasos.length + 1
  const last = step === total - 1

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
          <p className={`text-sm ${muted}`}>Stock de la despensa actualizado con los ingredientes usados.</p>
          <button type="button" onClick={onExit} className={`${primaryBtn} mt-2 w-full max-w-xs`}>
            Volver al Laboratorio
          </button>
        </div>
      ) : (
        <>
          <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            <ul hidden={step !== 0} className="space-y-2 text-xl leading-snug font-semibold">
              {recipe.ingredientes.map((i, n) => (
                <li key={n}>
                  <span className="text-olive">{formatQty(i.cantidad, i.unidad) || '•'}</span> {i.nombre}
                </li>
              ))}
            </ul>
            {/* every step stays mounted so a running timer keeps going (and beeps) after moving on */}
            {recipe.pasos.map((text, n) => {
              const secs = stepSeconds(text)
              return (
                <div key={n} hidden={step !== n + 1} className="space-y-4">
                  <p className="text-2xl leading-snug font-semibold md:text-3xl">{text}</p>
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

export default function Laboratorio() {
  const { recipes, pantry, utensils, labRecipeId, setLabRecipeId } = useInventory()
  const [cooking, setCooking] = useState(false)
  const recipe = recipes.find((r) => r.id === labRecipeId)

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

  return (
    <div className="flex flex-col gap-2.5">
      <select
        value={labRecipeId ?? ''}
        onChange={(e) => setLabRecipeId(e.target.value)}
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

      {recipe && (
        <>
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

          {(missing.length > 0 || noUtensils.length > 0) && (
            <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-terracotta">
              <TriangleAlert className="size-3.5" aria-hidden />
              Puedes cocinar igualmente; solo se descontará lo que haya en stock.
            </p>
          )}

          <button type="button" onClick={() => setCooking(true)} className={`${primaryBtn} h-12 text-base`}>
            <FlaskConical className="size-5" aria-hidden />
            Empezar a cocinar
          </button>
        </>
      )}

      {cooking && recipe && <CookMode recipe={recipe} onExit={() => setCooking(false)} />}
    </div>
  )
}
