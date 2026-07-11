import type { ReactNode } from 'react'
import { cn } from '~/libs/utils'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-gray-200 pb-7 sm:flex-row sm:items-end sm:justify-between dark:border-gray-800">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-[-0.025em] text-gray-950 dark:text-gray-50">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

export function SectionHeader({ title, count, description }: { title: string; count?: number; description?: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between border-b border-gray-200 px-4 sm:px-5 dark:border-gray-800">
      <div>
        <h2 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
          {title}{typeof count === 'number' && <span className="ml-2 font-normal text-gray-500">{count}</span>}
        </h2>
        {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
    </div>
  )
}

export function Surface({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('overflow-hidden rounded-[10px] border border-gray-200 bg-white dark:border-gray-800 dark:bg-black', className)}>{children}</section>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-10 place-items-center rounded-[10px] border border-gray-200 text-lg text-gray-400 dark:border-gray-800">—</div>
      <h3 className="text-sm font-medium text-gray-950 dark:text-gray-50">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
