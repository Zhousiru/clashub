import * as DialogPrimitive from '@radix-ui/react-dialog'
import { IconX } from '@tabler/icons-react'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button } from './Button'

interface ResponsiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveDialogProps) {
  const isMobile = useMediaQuery('(max-width: 639px)')
  const shouldReduceMotion = useReducedMotion()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <DialogPrimitive.Overlay asChild forceMount>
                <m.div
                  className="dialog-backdrop fixed inset-0 bg-black/45"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
                />
              </DialogPrimitive.Overlay>

              <div className="dialog-layer pointer-events-none fixed inset-0 flex items-end justify-center sm:items-center sm:p-6">
                <DialogPrimitive.Content asChild forceMount>
                  <m.div
                    className="pointer-events-auto relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[20px] border border-gray-200 bg-white p-5 shadow-[0_4px_8px_rgba(0,0,0,0.10)] outline-none dark:border-gray-800 dark:bg-black sm:max-w-lg sm:rounded-[20px] sm:p-7"
                    initial={{
                      opacity: 0,
                      y: shouldReduceMotion ? 0 : isMobile ? '100%' : 16,
                      scale: shouldReduceMotion || isMobile ? 1 : 0.98,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      y: shouldReduceMotion ? 0 : isMobile ? '100%' : 10,
                      scale: shouldReduceMotion || isMobile ? 1 : 0.985,
                    }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.2,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                  >
                    <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700 sm:hidden" />
                    <div className="pr-10">
                      <DialogPrimitive.Title className="text-lg font-semibold leading-tight tracking-[-0.01em] text-gray-950 dark:text-gray-50">
                        {title}
                      </DialogPrimitive.Title>
                      {description && (
                        <DialogPrimitive.Description className="mt-2 max-w-[65ch] text-sm leading-6 text-gray-600 dark:text-gray-300">
                          {description}
                        </DialogPrimitive.Description>
                      )}
                    </div>

                    <DialogPrimitive.Close asChild>
                      <button
                        type="button"
                        className="absolute right-3 top-3 grid size-10 place-items-center rounded-[10px] text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white dark:focus-visible:outline-white"
                        aria-label="关闭"
                      >
                        <IconX size={18} stroke={1.8} />
                      </button>
                    </DialogPrimitive.Close>

                    <div className="mt-5">{children}</div>
                  </m.div>
                </DialogPrimitive.Content>
              </div>
            </>
          )}
        </AnimatePresence>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {children}
    </div>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  pending?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认',
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen)
      }}
      title={title}
      description={description}
    >
      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            onConfirm()
            onOpenChange(false)
          }}
        >
          {pending ? '处理中…' : confirmLabel}
        </Button>
      </DialogFooter>
    </ResponsiveDialog>
  )
}
