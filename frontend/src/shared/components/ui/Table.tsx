import { type ReactNode } from 'react'
import { Spinner } from './Spinner'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  empty?: string
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
}

export function Table<T>({
  columns,
  data,
  loading = false,
  empty = 'Nenhum registro encontrado.',
  keyExtractor,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-secondary-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-secondary-200 bg-secondary-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={[
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-secondary-500',
                  col.className ?? '',
                ].join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100 bg-white">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <div className="flex justify-center">
                  <Spinner />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-secondary-400">
                {empty}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-secondary-50 transition-colors' : ''}
              >
                {columns.map((col) => (
                  <td key={col.key} className={['px-4 py-3 text-secondary-700', col.className ?? ''].join(' ')}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
