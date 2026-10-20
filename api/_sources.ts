// Underscore prefix: Vercel doesn't expose this file as a function. Pure parsing helpers + the network fetchers they feed.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const TIMEOUT = 8000

export interface VideoSources {
  titulo?: string
  descripcion?: string
  /** Pinned or creator-written comments, where full recipes are often posted */
  comentarios: string[]
  /** Speech transcript (TikTok's own auto-captions of the audio) */
  transcripcion?: string
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
const str = (x: unknown) => (typeof x === 'string' ? x : undefined)

/** TikTok video id and author handle from a canonical URL (/@user/video/123) */
export function parseTikTokUrl(url: string): { id?: string; author?: string } {
  const m = new URL(url).pathname.match(/^\/@([^/]+)\/(?:video|photo)\/(\d+)/)
  return { author: m?.[1], id: m?.[2] }
}

export interface TikTokItem {
  desc?: string
  author?: string
  /** Caption track URLs, Spanish first */
  captionUrls: string[]
  /** The video's own sound as MP3 ("sonido original"), downloadable without cookies */
  audioUrl?: string
  /** Video MP4; needs the cookies TikTok sets on the page response */
  videoUrl?: string
}

// caption/audio/video files live on TikTok's CDNs; any other host in the payload is ignored
export const isTikTokCdn = (url: string) => {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && /(^|\.)(tiktok|tiktokcdn|tiktokcdn-eu|tiktokcdn-us|byteoversea|ibytedtos|muscdn)\.(com|net)$/.test(u.hostname)
  } catch {
    return false
  }
}

/** Reads the video data TikTok embeds in its page (`__UNIVERSAL_DATA_FOR_REHYDRATION__`) */
export function extractTikTokItem(html: string): TikTokItem | null {
  const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  let data: unknown
  try {
    data = JSON.parse(m[1])
  } catch {
    return null
  }
  const item = (data as { __DEFAULT_SCOPE__?: { 'webapp.video-detail'?: { itemInfo?: { itemStruct?: unknown } } } })?.__DEFAULT_SCOPE__?.[
    'webapp.video-detail'
  ]?.itemInfo?.itemStruct
  if (!isObj(item)) return null
  const video = isObj(item.video) ? item.video : {}
  const cla = isObj(video.claInfo) ? video.claInfo : {}
  // two places TikTok exposes captions: claInfo.captionInfos (auto-captions) and subtitleInfos
  const tracks = [...(Array.isArray(cla.captionInfos) ? cla.captionInfos : []), ...(Array.isArray(video.subtitleInfos) ? video.subtitleInfos : [])]
    .filter(isObj)
    .map((t) => ({
      url: str(t.url) ?? str(t.Url) ?? (Array.isArray(t.urlList) ? str(t.urlList[0]) : undefined),
      lang: (str(t.language) ?? str(t.LanguageCodeName) ?? '').toLowerCase(),
    }))
    .filter((t): t is { url: string; lang: string } => !!t.url && /^https:\/\//.test(t.url))
    .sort((a, b) => Number(b.lang.startsWith('spa') || b.lang.startsWith('es')) - Number(a.lang.startsWith('spa') || a.lang.startsWith('es')))
  const music = isObj(item.music) ? item.music : {}
  const audioUrl = music.original === true ? str(music.playUrl) : undefined
  const videoUrl = str(video.playAddr) || str(video.downloadAddr)
  return {
    desc: str(item.desc),
    author: isObj(item.author) ? str(item.author.uniqueId) : undefined,
    captionUrls: tracks.map((t) => t.url),
    audioUrl: audioUrl && isTikTokCdn(audioUrl) ? audioUrl : undefined,
    videoUrl: videoUrl && isTikTokCdn(videoUrl) ? videoUrl : undefined,
  }
}

/** Plain text of a WebVTT caption file: no header, cue ids, timings or tags; repeated lines collapsed */
export function vttToText(vtt: string): string {
  const out: string[] = []
  for (const raw of vtt.split(/\r?\n/)) {
    const line = raw.replace(/<[^>]+>/g, '').trim()
    if (!line || line === 'WEBVTT' || /^\d+$/.test(line) || line.includes('-->') || /^(NOTE|STYLE|REGION)\b/.test(line)) continue
    if (out[out.length - 1] !== line) out.push(line)
  }
  return out.join('\n')
}

/** Pinned comments and the creator's own comments, longest first (recipes are long) */
export function pickRecipeComments(payload: unknown, author: string | undefined): string[] {
  const comments = isObj(payload) && Array.isArray(payload.comments) ? payload.comments.filter(isObj) : []
  return comments
    .filter((c) => c.author_pin === true || (Number(c.stick_position) || 0) > 0 || (!!author && isObj(c.user) && c.user.unique_id === author))
    .map((c) => str(c.text)?.trim() ?? '')
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
}

async function get(url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9', ...init.headers }, signal: AbortSignal.timeout(TIMEOUT) })
  if (!res.ok) throw new Error(`${url.split('?')[0]} → HTTP ${res.status}`)
  return res
}

const isTikTokHost = (u: URL) => /(^|\.)tiktok\.com$/.test(u.hostname)

/** Expands vm./vt.tiktok.com short links, refusing redirects that leave tiktok.com */
export async function resolveTikTokUrl(url: string): Promise<string> {
  if (parseTikTokUrl(url).id) return url
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT) })
  const location = res.headers.get('location')
  if (!location) throw new Error('El enlace corto de TikTok no redirige a ningún vídeo')
  const target = new URL(location, url)
  if (!isTikTokHost(target)) throw new Error('El enlace corto no apunta a tiktok.com')
  return target.origin + target.pathname
}

/**
 * Description, comments and audio transcript of a TikTok video. Description (page + oEmbed) and comments run in
 * parallel; captions need the track URLs from the page. Every source is best-effort: one failing never sinks the rest.
 */
export async function fetchTikTokSources(rawUrl: string): Promise<VideoSources> {
  const url = await resolveTikTokUrl(rawUrl)
  const { id, author: urlAuthor } = parseTikTokUrl(url)

  const [page, oembed, comments] = await Promise.allSettled([
    get(url).then(async (r) => ({
      item: extractTikTokItem(await r.text()),
      // session cookies (tt_chain_token…) the CDN asks for when downloading the video
      cookie: r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; '),
    })),
    get(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`).then((r) => r.json()).then((d: unknown) => (isObj(d) ? str(d.title) : undefined)),
    id
      ? get(`https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=${id}&count=50&cursor=0`, { headers: { Referer: 'https://www.tiktok.com/' } })
          .then((r) => r.json())
          .then((d: unknown) => pickRecipeComments(d, urlAuthor))
      : Promise.resolve([] as string[]),
  ])

  const item = page.status === 'fulfilled' ? page.value.item : null
  const cookie = page.status === 'fulfilled' ? page.value.cookie : ''
  let transcripcion: string | undefined
  for (const captionUrl of item?.captionUrls ?? []) {
    if (!isTikTokCdn(captionUrl)) continue
    try {
      transcripcion = vttToText(await (await get(captionUrl)).text()) || undefined
      if (transcripcion) break
    } catch {
      // next track
    }
  }
  // no captions: transcribe the audio ourselves (original-sound MP3 is ~10x smaller than the MP4)
  if (!transcripcion && item && process.env.GROQ_API_KEY) {
    for (const [mediaUrl, withCookie] of [
      [item.audioUrl, false],
      [item.videoUrl, true],
    ] as const) {
      if (!mediaUrl) continue
      try {
        const media = await downloadMedia(mediaUrl, withCookie ? cookie : undefined)
        transcripcion = await transcribeWithGroq(media)
        if (transcripcion) break
      } catch (error) {
        console.error('[parse-video] audio transcription failed', error)
      }
    }
  }

  return {
    descripcion: item?.desc || (oembed.status === 'fulfilled' ? oembed.value : undefined),
    comentarios: comments.status === 'fulfilled' ? comments.value : [],
    transcripcion,
  }
}

const metaContent = (html: string, prop: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${prop}"`))?.[1]

const decodeEntities = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))

/** YouTube: title + full description from the watch page (oEmbed only has the title) */
export async function fetchYouTubeSources(url: string): Promise<VideoSources> {
  const html = await (await get(url)).text()
  const desc = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1]
  return {
    titulo: decodeEntities(metaContent(html, 'og:title') ?? ''),
    descripcion: desc ? (JSON.parse(`"${desc}"`) as string) : undefined,
    comentarios: [],
  }
}

/** Instagram: only what the public page exposes in og:description (often a truncated caption, often a login wall) */
export async function fetchInstagramSources(url: string): Promise<VideoSources> {
  const html = await (await get(url)).text()
  const og = metaContent(html, 'og:description')
  // og:description looks like `123 likes, 4 comments - user on date: "caption"`
  const caption = og && decodeEntities(og).replace(/^[^:]*:\s*"?/, '').replace(/"\.?$/, '')
  return { descripcion: caption || undefined, comentarios: [] }
}

// Groq's free tier accepts uploads up to 25 MB
const MAX_MEDIA_BYTES = 24 * 1024 * 1024

/** Downloads TikTok audio/video into memory, refusing anything over the transcription upload limit */
export async function downloadMedia(url: string, cookie?: string): Promise<Blob> {
  if (!isTikTokCdn(url)) throw new Error('media URL outside TikTok CDNs')
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: 'https://www.tiktok.com/', ...(cookie ? { Cookie: cookie } : {}) },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`media download HTTP ${res.status}`)
  if (Number(res.headers.get('content-length')) > MAX_MEDIA_BYTES) throw new Error('media too large to transcribe')
  const buf = await res.arrayBuffer()
  if (buf.byteLength > MAX_MEDIA_BYTES) throw new Error('media too large to transcribe')
  return new Blob([buf], { type: res.headers.get('content-type') ?? 'video/mp4' })
}

/**
 * Speech-to-text with Whisper large-v3 on Groq (free plan: 2,000 requests and 8 h of audio per day, 25 MB per file).
 * No language is forced so non-Spanish videos still transcribe correctly; the prompt only biases cooking vocabulary.
 */
export async function transcribeWithGroq(media: Blob): Promise<string | undefined> {
  const form = new FormData()
  form.append('file', media, media.type.includes('mpeg') ? 'audio.mp3' : 'video.mp4')
  form.append('model', 'whisper-large-v3')
  form.append('response_format', 'text')
  form.append('temperature', '0')
  form.append('prompt', 'Receta de cocina: ingredientes, gramos, cucharadas, sartén, horno, sofríe, añade, mezcla.')
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`Groq transcription HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return (await res.text()).trim() || undefined
}
