import { formatCurrency, formatDate } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Membro {
  id: string
  nome: string
  funcao: string
  periodoInicio: string
  periodoFim: string | null
  valorContratado: string
}

interface Props {
  porFuncao: Record<string, { membros: Membro[]; subtotal: string }>
  totalContratado: string
  onEdit: (m: Membro) => void
  onDelete: (id: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EquipeTable({ porFuncao, totalContratado, onEdit, onDelete }: Props) {
  const groups = Object.entries(porFuncao)
  const totalMembros = groups.reduce((sum, [, { membros }]) => sum + membros.length, 0)

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3">
        <svg className="h-10 w-10 text-secondary-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
        <p className="text-sm text-secondary-400">Nenhum membro cadastrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards per function */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 px-4 pt-4">
        {groups.map(([funcao, { membros, subtotal }]) => (
          <div key={funcao} className="rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-secondary-700 truncate">{funcao}</p>
            <p className="mt-0.5 text-base font-bold text-secondary-900">
              {membros.length} <span className="text-xs font-normal text-secondary-500">membro{membros.length !== 1 ? 's' : ''}</span>
            </p>
            <p className="text-xs text-secondary-500">{formatCurrency(subtotal)}</p>
          </div>
        ))}
        {/* Total card */}
        <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-primary-700">Total equipe</p>
          <p className="mt-0.5 text-base font-bold text-primary-900">
            {totalMembros} <span className="text-xs font-normal text-primary-600">membros</span>
          </p>
          <p className="text-xs text-primary-600 font-medium">{formatCurrency(totalContratado)}</p>
        </div>
      </div>

      {/* Grouped tables */}
      <div className="divide-y divide-secondary-100">
        {groups.map(([funcao, { membros, subtotal }]) => (
          <div key={funcao}>
            {/* Group header */}
            <div className="flex items-center justify-between bg-secondary-50 px-4 py-2.5 border-y border-secondary-100">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary-400" />
                <span className="text-sm font-semibold text-secondary-700">{funcao}</span>
                <span className="text-xs text-secondary-400">{membros.length} membro{membros.length !== 1 ? 's' : ''}</span>
              </div>
              <span className="text-sm font-medium text-secondary-600">{formatCurrency(subtotal)}</span>
            </div>

            {/* Members rows */}
            <table className="w-full text-sm">
              <tbody className="divide-y divide-secondary-50">
                {membros.map((m) => (
                  <tr key={m.id} className="group hover:bg-secondary-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-secondary-900">{m.nome}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary-500 whitespace-nowrap">
                      {formatDate(m.periodoInicio)}
                      <span className="mx-1">—</span>
                      {m.periodoFim ? formatDate(m.periodoFim) : <span className="text-success-600 font-medium">em andamento</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-secondary-900 whitespace-nowrap">
                      {formatCurrency(m.valorContratado)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEdit(m)}
                          className="text-xs font-medium text-secondary-500 hover:text-secondary-800"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(m.id)}
                          className="text-xs font-medium text-danger-500 hover:text-danger-700"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Footer total */}
      <div className="flex items-center justify-between border-t-2 border-secondary-200 bg-secondary-50 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
          Total contratado equipe
        </span>
        <span className="font-bold text-secondary-900">{formatCurrency(totalContratado)}</span>
      </div>
    </div>
  )
}
