import { forwardRef } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { cn } from '~/libs/utils'

export const List = forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, children, ...props }, ref) => (
    <ul ref={ref} className={cn('divide-y divide-gray-200 dark:divide-gray-800', className)} {...props}>
      <AnimatePresence initial={false} mode="popLayout">{children}</AnimatePresence>
    </ul>
  ),
)
List.displayName = 'List'

interface ListItemProps extends React.ComponentPropsWithoutRef<typeof m.li> {
  selected?: boolean
}

export const ListItem = forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, children, selected, ...props }, ref) => (
    <m.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
      className={cn('relative transition-colors hover:bg-gray-50 dark:hover:bg-gray-950', selected && 'bg-gray-100 dark:bg-gray-900', className)}
      {...props}
    >
      {children}
    </m.li>
  ),
)
ListItem.displayName = 'ListItem'

interface ListContentProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
  onSelect?: () => void
}

export const ListContent = forwardRef<HTMLDivElement, ListContentProps>(
  ({ className, title, description, actions, onSelect, ...props }, ref) => {
    const content = <>
      <span className="block truncate text-sm font-medium text-gray-950 dark:text-gray-50">{title}</span>
      {description && <span className="mt-1 block truncate text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</span>}
    </>

    return (
      <div ref={ref} className={cn('flex min-h-[68px] items-center gap-3 px-4 py-3 sm:px-5', className)} {...props}>
        {onSelect ? (
          <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-black dark:focus-visible:after:ring-white">{content}</button>
        ) : (
          <div className="min-w-0 flex-1">{content}</div>
        )}
        {actions && <div className="relative z-10 flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
    )
  },
)
ListContent.displayName = 'ListContent'
