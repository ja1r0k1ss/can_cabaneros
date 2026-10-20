import { Camera, LoaderCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import Sheet from '../components/Sheet'
import { card, field, muted, primaryBtn } from '../components/ui'
import { newId } from '../lib/utils'
import { RECEIPT_TYPES, parseReceipt } from '../services/ai'
import { useInventory } from '../store/inventory'
import { PANTRY_CATEGORIES, UNITS, type PantryItem } from '../types/inventory'

// cantidad kept as text while editing so the input can be momentarily empty
type Row = Omit<PantryItem, 'id' | 'cantidad'> & { key: string; cantidad: string }

export default function TicketImport() {
  const { addPantryItems } = useInventory()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)

  function close() {
    setOpen(false)
    setRows(null)
    setError('')
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const items = await parseReceipt(file)
      setRows(items.map((i) => ({ ...i, key: newId(), cantidad: String(i.cantidad) })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el ticket')
    } finally {
      setLoading(false)
    }
  }

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs!.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const valid = (rows ?? [])
    .map((r) => ({ ...r, nombre: r.nombre.trim(), cantidad: Number(r.cantidad.replace(',', '.')) }))
    .filter((r) => r.nombre && Number.isFinite(r.cantidad) && r.cantidad > 0)

  function confirm() {
    addPantryItems(valid.map(({ nombre, categoria, cantidad, unidad }) => ({ nombre, categoria, cantidad, unidad })))
    close()
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${card} flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-olive`}>
        <Camera className="size-4" aria-hidden />
        Cargar ticket
      </button>

      <Sheet open={open} onClose={close} title={rows ? 'Revisa los productos' : 'Cargar ticket'}>
        {!rows ? (
          <div className="flex flex-col gap-2 pb-1">
            <label
              className={`flex h-36 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed border-black/15 text-sm font-semibold dark:border-white/15 ${loading ? 'pointer-events-none' : ''}`}
            >
              {loading ? <LoaderCircle className="size-6 animate-spin text-olive" aria-hidden /> : <Camera className="size-6 text-olive" aria-hidden />}
              {loading ? 'Analizando ticket…' : 'Foto o archivo del ticket'}
              <span className={`text-xs font-normal ${muted}`}>PNG, JPG o PDF</span>
              <input
                type="file"
                accept={RECEIPT_TYPES.join(',')}
                className="sr-only"
                disabled={loading}
                onChange={(e) => {
                  onFile(e.target.files?.[0])
                  e.target.value = '' // allow re-picking the same file
                }}
              />
            </label>
            {error && <p className="text-center text-sm font-semibold text-brick">{error}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className={`px-1 text-xs ${muted}`}>Edita o borra antes de guardar. Si un producto ya existe se suma su cantidad.</p>
            <ul className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <li key={r.key} className={`${card} grid grid-cols-[1fr_4.5rem_4.5rem_2.5rem] gap-1.5 p-2`}>
                  <input value={r.nombre} onChange={(e) => update(r.key, { nombre: e.target.value })} aria-label="Nombre" className={`${field} col-span-3`} />
                  <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label={`Borrar ${r.nombre}`} className="grid size-10 place-items-center rounded-full text-brick active:bg-black/5">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                  <select value={r.categoria} onChange={(e) => update(r.key, { categoria: e.target.value as Row['categoria'] })} aria-label="Categoría" className={`${field} px-2`}>
                    {PANTRY_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input value={r.cantidad} onChange={(e) => update(r.key, { cantidad: e.target.value })} inputMode="decimal" aria-label="Cantidad" className={`${field} px-2 text-right`} />
                  <select value={r.unidad} onChange={(e) => update(r.key, { unidad: e.target.value as Row['unidad'] })} aria-label="Unidad" className={`${field} col-span-2 px-2`}>
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <div className="sticky bottom-0 flex gap-2 bg-linen pt-1 dark:bg-moss">
              <button type="button" onClick={() => setRows(null)} className="h-10 flex-1 rounded-3xl bg-oat text-sm font-semibold dark:bg-moss-light">
                Otro ticket
              </button>
              <button type="button" onClick={confirm} disabled={!valid.length} className={`${primaryBtn} flex-[2]`}>
                Añadir {valid.length} a la despensa
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}
