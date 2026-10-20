import { PANTRY_CATEGORIES, UNITS, type PantryItem, type ShoppingItem, type Utensil } from '../types/inventory.js'
import type { Recipe } from '../types/recipe'

export interface KVStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type Validator<T> = (x: unknown) => T | undefined

/**
 * Reads JSON from storage. Invalid items are dropped individually (see arrayOf) so one bad entry doesn't wipe the list;
 * unparseable data is copied to `<key>__corrupt_backup` before falling back, so it's never silently lost.
 */
export function readStored<T>(storage: KVStorage | undefined, key: string, fallback: T, validate: Validator<T>): T {
  let raw: string | null
  try {
    raw = storage?.getItem(key) ?? null
  } catch {
    return fallback // storage blocked (private mode)
  }
  if (raw === null) return fallback
  let value: T | undefined
  try {
    value = validate(JSON.parse(raw))
  } catch {
    value = undefined
  }
  if (value !== undefined) return value
  try {
    storage!.setItem(`${key}__corrupt_backup`, raw)
  } catch {
    // nowhere to back it up; fallback still keeps the app usable
  }
  return fallback
}

/** Writes JSON; returns false when storage is full or unavailable */
export function writeStored(storage: KVStorage | undefined, key: string, value: unknown): boolean {
  try {
    storage?.setItem(key, JSON.stringify(value))
    return !!storage
  } catch {
    return false
  }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null
const oneOf = (list: readonly unknown[], v: unknown) => list.includes(v)

/** Array validator that keeps the valid items and drops the rest */
export const arrayOf =
  <T>(isItem: (x: unknown) => boolean): Validator<T[]> =>
  (x) =>
    Array.isArray(x) ? (x.filter(isItem) as T[]) : undefined

export const isPantryItem = (x: unknown): x is PantryItem =>
  isObj(x) &&
  typeof x.id === 'string' &&
  typeof x.nombre === 'string' &&
  typeof x.cantidad === 'number' &&
  Number.isFinite(x.cantidad) &&
  oneOf(UNITS, x.unidad) &&
  oneOf(PANTRY_CATEGORIES, x.categoria) &&
  (x.fechaCaducidad === undefined || typeof x.fechaCaducidad === 'string')

export const isShoppingItem = (x: unknown): x is ShoppingItem => isPantryItem(x) && isObj(x) && typeof x.comprado === 'boolean'

export const isUtensil = (x: unknown): x is Utensil =>
  isObj(x) && typeof x.id === 'string' && typeof x.nombre === 'string' && typeof x.categoria === 'string' && typeof x.disponible === 'boolean'

export const isRecipe = (x: unknown): x is Recipe =>
  isObj(x) && typeof x.id === 'string' && typeof x.titulo === 'string' && typeof x.raciones === 'number' && Array.isArray(x.ingredientes) && Array.isArray(x.pasos)

export const servingsMap: Validator<Record<string, number>> = (x) =>
  isObj(x) && Object.values(x).every((v) => typeof v === 'number' && v > 0) ? (x as Record<string, number>) : undefined
