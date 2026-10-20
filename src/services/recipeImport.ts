import { buildImport, detectPlatform, type ImportDraft } from '../lib/recipeImport'
import type { ParseVideoResponse } from '../types/recipe'

export interface UrlImportResult extends ImportDraft {
  platform: string
  /** Why the link couldn't be fully read, shown so the user pastes the text instead */
  aviso?: string
}

const PASTE_HINT = 'Copia el texto del post y pégalo en «Ajustar datos manualmente».'

async function getOembed(endpoint: string) {
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  // external payload: only trust string fields we actually use
  const pick = (k: string) => (typeof data === 'object' && data && typeof (data as Record<string, unknown>)[k] === 'string' ? ((data as Record<string, unknown>)[k] as string) : undefined)
  return { title: pick('title') }
}

/**
 * Reads the recipe text a link publicly exposes. TikTok's oEmbed returns the caption (where most recipes live) with CORS;
 * YouTube's only returns the title; Instagram requires a logged-in Graph API token, so it can't be read from the browser.
 */
export async function importFromUrl(url: string): Promise<UrlImportResult> {
  const platform = detectPlatform(url)
  if (!platform) throw new Error('Enlace no válido. Usa un enlace de TikTok, Instagram o YouTube.')
  const q = encodeURIComponent(url)

  try {
    if (platform === 'TikTok') {
      const { title } = await getOembed(`https://www.tiktok.com/oembed?url=${q}`)
      if (!title?.trim()) return { ...buildImport(url, {}), platform, aviso: `El vídeo no tiene descripción. ${PASTE_HINT}` }
      return { ...buildImport(url, { texto: title }), platform }
    }
    if (platform === 'YouTube') {
      const { title } = await getOembed(`https://www.youtube.com/oembed?format=json&url=${q}`)
      return {
        ...buildImport(url, { titulo: title }),
        platform,
        aviso: `YouTube solo comparte el título del vídeo, no su descripción. ${PASTE_HINT}`,
      }
    }
  } catch {
    return {
      ...buildImport(url, {}),
      platform,
      aviso: `No se pudo leer el enlace (vídeo privado, enlace acortado o demasiadas peticiones seguidas). ${PASTE_HINT}`,
    }
  }
  return { ...buildImport(url, {}), platform, aviso: `Instagram no permite leer publicaciones sin iniciar sesión. ${PASTE_HINT}` }
}

export type ImportResult = ParseVideoResponse

/**
 * Server pipeline first (description + creator comments + audio transcript, merged by Claude). When the function
 * isn't reachable (static hosting, `vite preview`, offline) falls back to what the browser can read on its own.
 */
export async function importRecipe(url: string): Promise<ImportResult> {
  let res: Response | undefined
  try {
    res = await fetch('/api/parse-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(70_000),
    })
  } catch {
    res = undefined
  }
  if (res?.status === 400) throw new Error(((await res.json()) as { error?: string }).error ?? 'Enlace no válido')
  if (res?.ok && res.headers.get('content-type')?.includes('application/json')) return (await res.json()) as ImportResult

  const local = await importFromUrl(url)
  return {
    recipe: { ...local.recipe, revisar: !local.completa || local.ingredientesDeducidos },
    fuentes: { descripcion: local.platform === 'TikTok' && !local.aviso, comentarios: 0, transcripcion: false },
    motor: 'reglas',
    completa: local.completa,
    avisos: local.aviso ? [local.aviso] : [],
  }
}
