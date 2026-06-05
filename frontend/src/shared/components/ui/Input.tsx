import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-secondary-700">
            {label}
            {props.required && <span className="ml-0.5 text-danger-500">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={[
            'w-full rounded-lg border px-3 py-2 text-sm text-secondary-900 placeholder-secondary-400',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error
              ? 'border-danger-500 bg-danger-50'
              : 'border-secondary-300 bg-white hover:border-secondary-400',
            'disabled:cursor-not-allowed disabled:bg-secondary-100 disabled:text-secondary-500',
            className,
          ].join(' ')}
        />
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {hint && !error && <p className="text-xs text-secondary-500">{hint}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'
