import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** iOS-style bottom sheet on iPhone, centered modal on Mac. Native <dialog> gives focus trap and Esc for free */
export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()} // backdrop tap
      aria-label={title}
      className="mx-auto mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-linen p-0 text-ink backdrop:bg-black/40 md:mb-auto md:max-w-lg md:rounded-3xl dark:bg-moss dark:text-linen"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-black/15 md:hidden dark:bg-white/20" aria-hidden />
        <header className="flex items-center gap-2 px-4 pt-2 pb-2">
          <h2 className="flex-1 text-base font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="grid size-8 place-items-center rounded-full bg-oat dark:bg-moss-light">
            <X className="size-4" aria-hidden />
          </button>
        </header>
        <div className="overflow-y-auto px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">{children}</div>
      </div>
    </dialog>
  )
}
