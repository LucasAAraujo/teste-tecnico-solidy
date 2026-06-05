import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl border border-secondary-200 shadow-sm',
        padding ? 'p-6' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-base font-semibold text-secondary-900">{title}</h3>
        {subtitle && <p className="text-sm text-secondary-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  )
}
