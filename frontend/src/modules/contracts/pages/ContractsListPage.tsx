import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Button, Input, Select, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import { ContractStatusBadge } from '../components/ContractStatusBadge'
import { VigenciaCounter } from '../components/VigenciaCounter'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Contract {
  id: string
  title: string
  category: string
  status: string
  value: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  template: { id: string; name: string } | null
  signatureRequests: { id: string; status: string; signerName: string }[]
}

interface ListResponse {
  data: Contract[]
  total: number
  page: number
  limit: number
  pages: number
}

interface Filters {
  search: string
  status: string
  startFrom: string
  startTo: string
}

const LIMIT = 20

const STATUS_OPTIONS = [
  { value: '',                  label: 'Todos os status'      },
  { value: 'DRAFT',             label: 'Rascunho'             },
  { value: 'PENDING_SIGNATURE', label: 'Aguard. Assinatura'   },
  { value: 'SIGNED',            label: 'Assinado'             },
  { value: 'EXPIRED',           label: 'Expirado'             },
  { value: 'CANCELLED',         label: 'Cancelado'            },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ContractsListPage() {
  const navigate = useNavigate()

  const [result, setResult] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    startFrom: '',
    startTo: '',
  })
  const [pendingFilters, setPendingFilters] = useState<Filters>(filters)

  const fetchContracts = useCallback(
    async (f: Filters, p: number) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(p))
        params.set('limit', String(LIMIT))
        if (f.search)    params.set('search', f.search)
        if (f.status)    params.set('status', f.status)
        if (f.startFrom) params.set('startFrom', new Date(f.startFrom).toISOString())
        if (f.startTo)   params.set('startTo',   new Date(f.startTo).toISOString())

        const res = await api.get<ListResponse>(`/contracts?${params.toString()}`)
        setResult(res.data)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchContracts(filters, page)
  }, [filters, page, fetchContracts])

  function applyFilters() {
    setFilters(pendingFilters)
    setPage(1)
  }

  function clearFilters() {
    const empty: Filters = { search: '', status: '', startFrom: '', startTo: '' }
    setPendingFilters(empty)
    setFilters(empty)
    setPage(1)
  }

  function setPending(key: keyof Filters, value: string) {
    setPendingFilters((prev) => ({ ...prev, [key]: value }))
  }

  const hasActiveFilters =
    filters.search || filters.status || filters.startFrom || filters.startTo

  const contracts = result?.data ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Contratos</h1>
          {result && (
            <p className="mt-1 text-sm text-secondary-500">
              {result.total} {result.total === 1 ? 'contrato encontrado' : 'contratos encontrados'}
            </p>
          )}
        </div>
        <Button onClick={() => navigate('/contracts/new')}>+ Novo contrato</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="lg:col-span-2">
            <Input
              placeholder="Buscar por título ou categoria..."
              value={pendingFilters.search}
              onChange={(e) => setPending('search', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <Select
            value={pendingFilters.status}
            onChange={(e) => setPending('status', e.target.value)}
            options={STATUS_OPTIONS}
          />
          <Input
            type="date"
            placeholder="De"
            value={pendingFilters.startFrom}
            onChange={(e) => setPending('startFrom', e.target.value)}
          />
          <Input
            type="date"
            placeholder="Até"
            value={pendingFilters.startTo}
            onChange={(e) => setPending('startTo', e.target.value)}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={applyFilters}>
            Filtrar
          </Button>
          {hasActiveFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="py-16 text-center">
            <svg
              className="mx-auto h-10 w-10 text-secondary-200"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="mt-3 text-sm text-secondary-500">
              {hasActiveFilters ? 'Nenhum contrato encontrado com esses filtros.' : 'Nenhum contrato cadastrado.'}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-primary-600 hover:text-primary-700">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100 bg-secondary-50">
                    {['Contrato', 'Categoria', 'Valor', 'Início', 'Fim', 'Vigência', 'Status', ''].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {contracts.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/contracts/${c.id}`)}
                      className="cursor-pointer transition-colors hover:bg-secondary-50"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-secondary-900">{c.title}</p>
                        {c.template && (
                          <p className="mt-0.5 text-xs text-secondary-400">{c.template.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-secondary-700">{c.category}</td>
                      <td className="px-4 py-3 text-secondary-700">{formatCurrency(c.value)}</td>
                      <td className="px-4 py-3 text-secondary-500">{formatDate(c.startDate)}</td>
                      <td className="px-4 py-3 text-secondary-500">{formatDate(c.endDate)}</td>
                      <td className="px-4 py-3">
                        <VigenciaCounter endDate={c.endDate} />
                      </td>
                      <td className="px-4 py-3">
                        <ContractStatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/contracts/${c.id}`)
                          }}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Ver →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {result && result.pages > 1 && (
              <div className="flex items-center justify-between border-t border-secondary-100 px-4 py-3">
                <p className="text-xs text-secondary-500">
                  Página {result.page} de {result.pages} · {result.total} registros
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ← Anterior
                  </Button>
                  {Array.from({ length: Math.min(result.pages, 7) }, (_, i) => {
                    const p = result.pages <= 7
                      ? i + 1
                      : page <= 4
                        ? i + 1
                        : page >= result.pages - 3
                          ? result.pages - 6 + i
                          : page - 3 + i
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={[
                          'h-8 w-8 rounded-lg text-xs font-medium transition-colors',
                          p === page
                            ? 'bg-primary-600 text-white'
                            : 'text-secondary-600 hover:bg-secondary-100',
                        ].join(' ')}
                      >
                        {p}
                      </button>
                    )
                  })}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page === result.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
