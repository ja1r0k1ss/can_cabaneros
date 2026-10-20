import { useCallback, useEffect, useRef, useState } from 'react'
import { readStored, writeStored, type Validator } from '../lib/storage'

const storage = () => {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

/**
 * useState backed by localStorage. Reads lazily on first render, writes synchronously on every update
 * (iOS may kill a backgrounded PWA before any effect runs) and follows changes made in other tabs/windows.
 * `latest` always holds the newest value, for actions that must read state between two updates.
 */
export function usePersistentState<T>(key: string, fallback: T, validate: Validator<T>) {
  const [value, setValue] = useState(() => readStored(storage(), key, fallback, validate))
  const latest = useRef(value)

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const v = typeof next === 'function' ? (next as (prev: T) => T)(latest.current) : next
      latest.current = v
      writeStored(storage(), key, v)
      setValue(v)
    },
    [key],
  )

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== key) return
      const v = e.newValue === null ? fallback : readStored(storage(), key, latest.current, validate)
      latest.current = v
      setValue(v)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, fallback, validate])

  return [value, set, latest] as const
}
