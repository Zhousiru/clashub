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
    ref,
  ) => {
    const baseClasses =
      'button gap-2 rounded-[10px] font-medium cursor-pointer active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white'

    const variants = {
      primary:
        'border-black bg-black text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200',
      secondary:
        'border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-100 dark:hover:border-gray-600 dark:hover:bg-gray-900',
      danger:
        'border-red-200 bg-red-50 text-red-800 hover:border-red-700 hover:bg-red-700 hover:text-white dark:border-red-900 dark:bg-red-950 dark:text-red-200 dark:hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white',
    }

    const sizes = {
      sm: 'min-h-9 px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-5 py-2.5 text-base',
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
  },
)

Button.displayName = 'Button'

export { Button }
