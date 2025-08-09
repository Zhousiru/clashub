import { forwardRef } from 'react'
import { cn } from '~/libs/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', children, ...props },
    ref
  ) => {
    const baseClasses =
      'button font-medium cursor-pointer transition-colors duration-200 focus:outline-none'

    const variants = {
      primary:
        'border-2 border-black bg-white text-black hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black',
      secondary:
        'border-2 border-dashed border-black bg-gray-100 text-gray-900 hover:bg-gray-200 dark:border-white dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800',
      danger:
        'border-2 border-red-700 bg-red-100 text-red-800 hover:bg-red-700 hover:text-white dark:border-red-400 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-500 dark:hover:text-white',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
