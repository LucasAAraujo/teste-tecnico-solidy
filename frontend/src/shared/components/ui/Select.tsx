import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-secondary-700">
            {label}
            {props.required && <span className="ml-0.5 text-danger-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          {...props}
          className={[
            'w-full rounded-lg border px-3 py-2 text-sm text-secondary-900 bg-white',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            error
              ? 'border-danger-500 bg-danger-50'
              : 'border-secondary-300 hover:border-secondary-400',
            'disabled:cursor-not-allowed disabled:bg-secondary-100 disabled:text-secondary-500',
            className,
          ].join(' ')}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-danger-600">{error}</p>}
        {hint && !error && <p className="text-xs text-secondary-500">{hint}</p>}
      </div>
    )
  },
)
Select.displayName = 'Select'
