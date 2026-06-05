import { formatCurrency } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Fornecedor {
  id: string
  nome: string
  cnpj: string
  contato: string
  servicoPrestado: string
  valorContratado: string
}

interface Props {
  fornecedores: Fornecedor[]
  totalContratado: string
  onEdit: (f: Fornecedor) => void
  onDelete: (id: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FornecedoresTable({ fornecedores, totalContratado, onEdit, onDelete }: Props) {
  if (fornecedores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3">
        <svg className="h-10 w-10 text-secondary-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
        <p className="text-sm text-secondary-400">Nenhum fornecedor cadastrado.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-secondary-100 bg-secondary-50">
            {['Fornecedor', 'CNPJ', 'Contato', 'Serviço Prestado', 'Valor Contratado', ''].map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {fornecedores.map((f) => (
            <tr key={f.id} className="group hover:bg-secondary-50 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium text-secondary-900">{f.nome}</p>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-secondary-600 whitespace-nowrap">
                {f.cnpj}
              </td>
              <td className="px-4 py-3 text-secondary-600 max-w-xs truncate">
                {f.contato}
              </td>
              <td className="px-4 py-3 text-secondary-600 max-w-xs truncate">
                {f.servicoPrestado}
              </td>
              <td className="px-4 py-3 font-semibold text-secondary-900 whitespace-nowrap">
                {formatCurrency(f.valorContratado)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(f)}
                    className="text-xs font-medium text-secondary-500 hover:text-secondary-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onDelete(f.id)}
                    className="text-xs font-medium text-danger-500 hover:text-danger-700"
                  >
                    Remover
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-secondary-200 bg-secondary-50">
            <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-secondary-500">
              Total contratado
            </td>
            <td className="px-4 py-2.5 font-bold text-secondary-900 whitespace-nowrap">
              {formatCurrency(totalContratado)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
