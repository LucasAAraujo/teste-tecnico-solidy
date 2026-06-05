import { type HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-secondary-200 ${className}`}
      {...props}
    />
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-secondary-200 bg-white p-5 ${className}`}>
      <Skeleton className="h-5 w-1/3 mb-4" />
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = '',
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-secondary-200 bg-white overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 border-b border-secondary-100 bg-secondary-50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 border-b border-secondary-100 px-4 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className={`h-4 ${col === 0 ? 'w-1/4' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonKpiGrid({ cards = 4, className = '' }: { cards?: number; className?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-xl border border-secondary-200 bg-white p-5">
          <Skeleton className="h-3 w-2/3 mb-3" />
          <Skeleton className="h-7 w-1/2 mb-1" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}
