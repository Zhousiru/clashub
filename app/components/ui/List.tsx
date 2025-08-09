import { forwardRef } from 'react'
import { cn } from '~/libs/utils'

interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode
}

const List = forwardRef<HTMLUListElement, ListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn(
          'divide-y divide-gray-200 border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-black',
          className
        )}
        {...props}
      >
        {children}
      </ul>
    )
  }
)

List.displayName = 'List'

interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  children: React.ReactNode
  selected?: boolean
  onSelect?: () => void
}

const ListItem = forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, children, selected, onSelect, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn(
          'px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900',
          selected && 'bg-gray-100 dark:bg-gray-900',
          className
        )}
        onClick={onSelect}
        {...props}
      >
        {children}
      </li>
    )
  }
)

ListItem.displayName = 'ListItem'

interface ListContentProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
}

const ListContent = forwardRef<HTMLDivElement, ListContentProps>(
  ({ className, title, description, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between', className)}
        {...props}
      >
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h4>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="ml-4 flex-shrink-0">{actions}</div>}
      </div>
    )
  }
)

ListContent.displayName = 'ListContent'

export { List, ListContent, ListItem }
