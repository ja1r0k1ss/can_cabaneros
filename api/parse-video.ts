import { buildImport, detectPlatform, parseSpokenRecipe } from '../src/lib/recipeImport.ts'
import { inferUtensils, isBasicIngredient } from '../src/lib/recipes.ts'
import { newId } from '../src/lib/utils.ts'
import type { ParseVideoResponse, Recipe } from '../src/types/recipe.ts'
import { fetchInstagramSources, fetchTikTokSources, fetchYouTubeSources, type VideoSources } from './_sources.ts'
import { structureWithClaude, type ExtractedRecipe } from './_structure.ts'

function fromClaude(url: string, r: ExtractedRecipe): Omit<Recipe, 'id'> {
  const ingredientes = r.ingredientes
    .filter((i) => i.nombre.trim())
    .map((i) => (i.cantidad != null && i.cantidad > 0 ? { nombre: i.nombre.trim(), cantidad: i.cantidad, unidad: i.unidad ?? 'ud' } : { nombre: i.nombre.trim() }))
  const pasos = r.pasos.map((p) => p.trim()).filter(Boolean)
  return {
    origen: 'url',
    fuente: url,
    titulo: r.titulo.trim() || 'Receta importada',
    raciones: r.raciones > 0 ? r.raciones : 2,
    tiempoPrep: Math.max(0, r.tiempoPrep),
    tiempoCoccion: Math.max(0, r.tiempoCoccion),
    utensilios: inferUtensils(pasos),
    ingredientes,
    pasos,
    revisar: r.revisar || !pasos.length || ingredientes.some((i) => i.cantidad == null && !isBasicIngredient(i.nombre)),
  }
}

/** POST { url } → recipe merged from the post description, creator/pinned comments and the audio transcript */
export async function POST(request: Request): Promise<Response> {
  let url = ''
  try {
    const body: unknown = await request.json()
    if (typeof body === 'object' && body && typeof (body as { url?: unknown }).url === 'string') url = (body as { url: string }).url.trim()
  } catch {
    // invalid JSON → treated as missing url
  }
  const platform = url.length <= 500 ? detectPlatform(url) : null
  if (!platform) return Response.json({ error: 'Enlace no válido. Usa un enlace de TikTok, Instagram o YouTube.' }, { status: 400 })

  const avisos: string[] = []
  let sources: VideoSources = { comentarios: [] }
  try {
    sources = await (platform === 'TikTok' ? fetchTikTokSources(url) : platform === 'YouTube' ? fetchYouTubeSources(url) : fetchInstagramSources(url))
  } catch (error) {
    console.error('[parse-video] fetching sources failed', error)
    avisos.push('No se pudo leer el vídeo (privado, eliminado o bloqueado temporalmente).')
  }

  const hasText = !!(sources.descripcion?.trim() || sources.comentarios.length || sources.transcripcion?.trim())
  const extracted = hasText && process.env.ANTHROPIC_API_KEY ? await structureWithClaude(sources) : null

  let recipe: Recipe
  let completa: boolean
  if (extracted?.esReceta) {
    recipe = { ...fromClaude(url, extracted), id: newId() }
    completa = recipe.ingredientes.length > 0 && recipe.pasos.length > 0
    if (extracted.motivoRevision) avisos.push(extracted.motivoRevision)
  } else {
    // no AI available (or it found no recipe): line-based parser over the written sources,
    // then the spoken transcript fills whatever is still missing
    const draft = buildImport(url, { titulo: sources.titulo, texto: [sources.descripcion, ...sources.comentarios].filter(Boolean).join('\n\n') })
    recipe = { ...draft.recipe, revisar: !draft.completa || draft.ingredientesDeducidos }
    const spoken = sources.transcripcion ? parseSpokenRecipe(sources.transcripcion) : null
    if (spoken && (draft.ingredientesDeducidos || !recipe.ingredientes.length) && spoken.ingredientes.length) {
      recipe = { ...recipe, ingredientes: spoken.ingredientes, revisar: true }
    }
    if (spoken && !recipe.pasos.length && spoken.pasos.length) {
      recipe = { ...recipe, pasos: spoken.pasos, utensilios: inferUtensils(spoken.pasos), revisar: true }
    }
    completa = recipe.ingredientes.length > 0 && recipe.pasos.length > 0
    if (extracted && !extracted.esReceta) avisos.push('El vídeo no parece contener una receta.')
  }
  if (!hasText && !avisos.length) avisos.push('El vídeo no tiene descripción, comentarios del creador ni subtítulos que leer.')

  const payload: ParseVideoResponse = {
    recipe,
    fuentes: { descripcion: !!sources.descripcion?.trim(), comentarios: sources.comentarios.length, transcripcion: !!sources.transcripcion?.trim() },
    motor: extracted?.esReceta ? 'claude' : 'reglas',
    completa,
    avisos,
  }
  return Response.json(payload)
}
