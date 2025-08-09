import { forwardRef } from 'react'
import { cn } from '~/libs/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    const baseClasses = 'input w-full px-3 py-2 text-base transition-colors'

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            baseClasses,
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
