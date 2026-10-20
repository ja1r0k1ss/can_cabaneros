import { TECHNIQUES, type Technique } from '../data/techniques.ts'

export type Segment = string | { texto: string; tecnica: Technique }

// one alternation with a group per technique; lookarounds instead of \b because \b breaks on accented letters
const PATTERN = new RegExp(`(?<!\\p{L})(?:${TECHNIQUES.map((t) => `(${t.patron})`).join('|')})(?!\\p{L})`, 'giu')

/** Splits step text into plain strings and highlighted culinary techniques */
export function splitByTechniques(text: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(PATTERN)) {
    const tecnica = TECHNIQUES[m.slice(1).findIndex((g) => g !== undefined)]
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push({ texto: m[0], tecnica })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
