import { useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportTab = 'contracts' | 'obras' | 'purchase-orders'

interface ContractReport {
  id: string
  title: string
  category: string
  status: string
  value: string | null
  startDate: string | null
  endDate: string | null
  signerName: string | null
  createdAt: string
}

interface ObraReport {
  id: string
  name: string
  address: string
  status: string
  budget: string
  totalRealizado: string
  pctOrcamento: number
  startDate: string | null
  endDate: string | null
  fornecedoresCount: number
  equipeMembrosCount: number
}

interface POReport {
  id: string
  number: string
  obra: string
  supplier: string
  payerCnpj: string
  total: string
  status: string
  issuedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_STATUSES = [
  { value: '',                   label: 'Todos'               },
  { value: 'DRAFT',              label: 'Rascunho'            },
  { value: 'PENDING_SIGNATURE',  label: 'Aguardando assinatura' },
  { value: 'SIGNED',             label: 'Assinado'            },
  { value: 'EXPIRED',            label: 'Expirado'            },
  { value: 'CANCELLED',          label: 'Cancelado'           },
]

const CONTRACT_CATEGORIES = [
  { value: '',           label: 'Todas categorias' },
  { value: 'work',       label: 'Obra'             },
  { value: 'service',    label: 'Serviço'          },
  { value: 'rent',       label: 'Locação'          },
  { value: 'employment', label: 'Trabalho'         },
]

const OBRA_STATUSES = [
  { value: '',            label: 'Todos'         },
  { value: 'PLANNING',    label: 'Planejamento'  },
  { value: 'IN_PROGRESS', label: 'Em execução'   },
  { value: 'COMPLETED',   label: 'Concluída'     },
  { value: 'CANCELLED',   label: 'Cancelada'     },
]

const PO_STATUSES = [
  { value: '',          label: 'Todos'     },
  { value: 'DRAFT',     label: 'Rascunho'  },
  { value: 'APPROVED',  label: 'Aprovada'  },
  { value: 'CANCELLED', label: 'Cancelada' },
]

const CONTRACT_STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  DRAFT:             'default',
  PENDING_SIGNATURE: 'warning',
  SIGNED:            'success',
  EXPIRED:           'danger',
  CANCELLED:         'danger',
}

const OBRA_STATUS_VARIANT: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  PLANNING:    'default',
  IN_PROGRESS: 'warning',
  COMPLETED:   'success',
  CANCELLED:   'danger',
}

const PO_STATUS_VARIANT: Record<string, 'default' | 'success' | 'danger'> = {
  DRAFT:     'default',
  APPROVED:  'success',
  CANCELLED: 'danger',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', PENDING_SIGNATURE: 'Ag. assinatura', SIGNED: 'Assinado',
  EXPIRED: 'Expirado', CANCELLED: 'Cancelado', PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em execução', COMPLETED: 'Concluída', APPROVED: 'Aprovada',
}

const TABS = [
  { key: 'contracts' as ReportTab,       label: 'Contratos'       },
  { key: 'obras' as ReportTab,           label: 'Obras'           },
  { key: 'purchase-orders' as ReportTab, label: 'Ordens de Compra' },
]

// ─── Helper: export JSON ──────────────────────────────────────────────────────

function exportJson(data: unknown[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Sub-section: Filters row ─────────────────────────────────────────────────

interface FilterRowProps {
  startDate: string; onStartDate: (v: string) => void
  endDate: string;   onEndDate:   (v: string) => void
  statusOptions: { value: string; label: string }[]
  status: string;    onStatus: (v: string) => void
  extraFilter?: React.ReactNode
  onSearch: () => void
  loading: boolean
  resultCount: number
  onExport: () => void
}

function FilterRow({
  startDate, onStartDate, endDate, onEndDate,
  statusOptions, status, onStatus,
  extraFilter, onSearch, loading, resultCount, onExport,
}: FilterRowProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="block text-xs font-medium text-secondary-600 mb-1">Data início</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDate(e.target.value)}
          className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-secondary-600 mb-1">Data fim</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDate(e.target.value)}
          className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-secondary-600 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {extraFilter}
      <div className="flex items-end gap-2">
        <Button size="sm" onClick={onSearch} loading={loading}>Buscar</Button>
        {resultCount > 0 && (
          <Button size="sm" variant="secondary" onClick={onExport}>
            Exportar JSON ({resultCount})
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Section: Contracts ───────────────────────────────────────────────────────

function ContractsReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [status, setStatus]       = useState('')
  const [category, setCategory]   = useState('')
  const [data, setData]           = useState<ContractReport[] | null>(null)
  const [loading, setLoading]     = useState(false)
  const [searched, setSearched]   = useState(false)

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const p = new URLSearchParams()
      if (startDate) p.set('startDate', startDate)
      if (endDate)   p.set('endDate', endDate)
      if (status)    p.set('status', status)
      if (category)  p.set('category', category)
      const res = await api.get<ContractReport[]>(`/reports/contracts?${p}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, status, category])

  const totalValue = (data ?? []).reduce((s, c) => s + parseFloat(String(c.value ?? 0)), 0)

  return (
    <div className="space-y-4">
      <Card>
        <FilterRow
          startDate={startDate} onStartDate={setStartDate}
          endDate={endDate}     onEndDate={setEndDate}
          statusOptions={CONTRACT_STATUSES}
          status={status}       onStatus={setStatus}
          extraFilter={
            <div>
              <label className="block text-xs font-medium text-secondary-600 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              >
                {CONTRACT_CATEGORIES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          }
          onSearch={search}
          loading={loading}
          resultCount={data?.length ?? 0}
          onExport={() => exportJson(data ?? [], `contratos_${Date.now()}.json`)}
        />
      </Card>

      {loading && (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      )}

      {!loading && searched && data !== null && (
        <>
          {/* Summary KPIs */}
          {data.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Total</p>
                <p className="mt-1 text-xl font-bold text-secondary-900">{data.length}</p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Valor total</p>
                <p className="mt-1 text-lg font-bold text-secondary-900">{formatCurrency(String(totalValue))}</p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Assinados</p>
                <p className="mt-1 text-xl font-bold text-success-600">
                  {data.filter((c) => c.status === 'SIGNED').length}
                </p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Pendentes</p>
                <p className="mt-1 text-xl font-bold text-warning-600">
                  {data.filter((c) => c.status === 'PENDING_SIGNATURE').length}
                </p>
              </div>
            </div>
          )}

          <Card padding={false}>
            {data.length === 0 ? (
              <p className="py-12 text-center text-sm text-secondary-400">Nenhum contrato encontrado para os filtros selecionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100 bg-secondary-50">
                      {['Título', 'Categoria', 'Signatário', 'Valor', 'Início', 'Fim', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {data.map((c) => (
                      <tr key={c.id} className="hover:bg-secondary-50">
                        <td className="px-4 py-3 font-medium text-secondary-900 max-w-52 truncate">{c.title}</td>
                        <td className="px-4 py-3 text-secondary-600 capitalize">{c.category}</td>
                        <td className="px-4 py-3 text-secondary-600 whitespace-nowrap">{c.signerName ?? '—'}</td>
                        <td className="px-4 py-3 font-medium text-secondary-900 whitespace-nowrap">
                          {c.value ? formatCurrency(c.value) : '—'}
                        </td>
                        <td className="px-4 py-3 text-secondary-500 whitespace-nowrap text-xs">{formatDate(c.startDate)}</td>
                        <td className="px-4 py-3 text-secondary-500 whitespace-nowrap text-xs">{formatDate(c.endDate)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={CONTRACT_STATUS_VARIANT[c.status] ?? 'default'}>
                            {STATUS_LABELS[c.status] ?? c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-16 text-secondary-400 gap-2">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-sm">Aplique os filtros e clique em <strong className="text-secondary-600">Buscar</strong> para gerar o relatório.</p>
        </div>
      )}
    </div>
  )
}

// ─── Section: Obras ───────────────────────────────────────────────────────────

function ObrasReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [status, setStatus]       = useState('')
  const [data, setData]           = useState<ObraReport[] | null>(null)
  const [loading, setLoading]     = useState(false)
  const [searched, setSearched]   = useState(false)

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const p = new URLSearchParams()
      if (startDate) p.set('startDate', startDate)
      if (endDate)   p.set('endDate', endDate)
      if (status)    p.set('status', status)
      const res = await api.get<ObraReport[]>(`/reports/obras?${p}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, status])

  const totalBudget    = (data ?? []).reduce((s, o) => s + parseFloat(String(o.budget)), 0)
  const totalRealizado = (data ?? []).reduce((s, o) => s + parseFloat(String(o.totalRealizado)), 0)

  return (
    <div className="space-y-4">
      <Card>
        <FilterRow
          startDate={startDate} onStartDate={setStartDate}
          endDate={endDate}     onEndDate={setEndDate}
          statusOptions={OBRA_STATUSES}
          status={status}       onStatus={setStatus}
          onSearch={search}
          loading={loading}
          resultCount={data?.length ?? 0}
          onExport={() => exportJson(data ?? [], `obras_${Date.now()}.json`)}
        />
      </Card>

      {loading && (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      )}

      {!loading && searched && data !== null && (
        <>
          {data.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Total de obras</p>
                <p className="mt-1 text-xl font-bold text-secondary-900">{data.length}</p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Orçamento total previsto</p>
                <p className="mt-1 text-base font-bold text-secondary-900">{formatCurrency(String(totalBudget))}</p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Total realizado</p>
                <p className="mt-1 text-base font-bold text-secondary-900">{formatCurrency(String(totalRealizado))}</p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Concluídas</p>
                <p className="mt-1 text-xl font-bold text-success-600">
                  {data.filter((o) => o.status === 'COMPLETED').length}
                </p>
              </div>
            </div>
          )}

          <Card padding={false}>
            {data.length === 0 ? (
              <p className="py-12 text-center text-sm text-secondary-400">Nenhuma obra encontrada para os filtros selecionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100 bg-secondary-50">
                      {['Nome', 'Endereço', 'Orçamento', 'Realizado', '% Consumido', 'Início', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {data.map((o) => {
                      const pct = o.pctOrcamento
                      const barColor = pct >= 90 ? 'bg-danger-400' : pct >= 70 ? 'bg-warning-400' : 'bg-success-400'
                      return (
                        <tr key={o.id} className="hover:bg-secondary-50">
                          <td className="px-4 py-3 font-medium text-secondary-900 max-w-45 truncate">{o.name}</td>
                          <td className="px-4 py-3 text-secondary-500 text-xs max-w-40 truncate">{o.address}</td>
                          <td className="px-4 py-3 font-medium text-secondary-900 whitespace-nowrap">{formatCurrency(o.budget)}</td>
                          <td className="px-4 py-3 font-medium text-secondary-900 whitespace-nowrap">{formatCurrency(o.totalRealizado)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 rounded-full bg-secondary-100">
                                <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className={`text-xs font-medium ${pct >= 90 ? 'text-danger-600' : 'text-secondary-600'}`}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-secondary-500 whitespace-nowrap text-xs">{formatDate(o.startDate)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={OBRA_STATUS_VARIANT[o.status] ?? 'default'}>
                              {STATUS_LABELS[o.status] ?? o.status}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-secondary-200 bg-secondary-50">
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-secondary-500">Totais</td>
                      <td className="px-4 py-2.5 font-bold text-secondary-900 whitespace-nowrap">{formatCurrency(String(totalBudget))}</td>
                      <td className="px-4 py-2.5 font-bold text-secondary-900 whitespace-nowrap">{formatCurrency(String(totalRealizado))}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-16 text-secondary-400 gap-2">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
          </svg>
          <p className="text-sm">Aplique os filtros e clique em <strong className="text-secondary-600">Buscar</strong> para gerar o relatório.</p>
        </div>
      )}
    </div>
  )
}

// ─── Section: Purchase Orders ─────────────────────────────────────────────────

function PurchaseOrdersReport() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [status, setStatus]       = useState('')
  const [data, setData]           = useState<POReport[] | null>(null)
  const [loading, setLoading]     = useState(false)
  const [searched, setSearched]   = useState(false)

  const search = useCallback(async () => {
    setLoading(true)
    setSearched(true)
    try {
      const p = new URLSearchParams()
      if (startDate) p.set('startDate', startDate)
      if (endDate)   p.set('endDate', endDate)
      if (status)    p.set('status', status)
      const res = await api.get<POReport[]>(`/reports/purchase-orders?${p}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, status])

  const totalValue    = (data ?? []).reduce((s, po) => s + parseFloat(String(po.total)), 0)
  const approvedTotal = (data ?? [])
    .filter((po) => po.status === 'APPROVED')
    .reduce((s, po) => s + parseFloat(String(po.total)), 0)

  return (
    <div className="space-y-4">
      <Card>
        <FilterRow
          startDate={startDate} onStartDate={setStartDate}
          endDate={endDate}     onEndDate={setEndDate}
          statusOptions={PO_STATUSES}
          status={status}       onStatus={setStatus}
          onSearch={search}
          loading={loading}
          resultCount={data?.length ?? 0}
          onExport={() => exportJson(data ?? [], `ordens_compra_${Date.now()}.json`)}
        />
      </Card>

      {loading && (
        <div className="flex h-32 items-center justify-center"><Spinner /></div>
      )}

      {!loading && searched && data !== null && (
        <>
          {data.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Total de O.C.</p>
                <p className="mt-1 text-xl font-bold text-secondary-900">{data.length}</p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Valor total</p>
                <p className="mt-1 text-base font-bold text-secondary-900">{formatCurrency(String(totalValue))}</p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Aprovadas</p>
                <p className="mt-1 text-xl font-bold text-success-600">
                  {data.filter((po) => po.status === 'APPROVED').length}
                </p>
              </div>
              <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-secondary-500">Total aprovado</p>
                <p className="mt-1 text-base font-bold text-success-600">{formatCurrency(String(approvedTotal))}</p>
              </div>
            </div>
          )}

          <Card padding={false}>
            {data.length === 0 ? (
              <p className="py-12 text-center text-sm text-secondary-400">Nenhuma ordem de compra encontrada para os filtros selecionados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100 bg-secondary-50">
                      {['Número', 'Obra', 'Fornecedor', 'CNPJ Pagador', 'Total', 'Status', 'Data'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {data.map((po) => (
                      <tr key={po.id} className="hover:bg-secondary-50">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-secondary-900">{po.number}</td>
                        <td className="px-4 py-3 text-secondary-700 max-w-35 truncate">{po.obra}</td>
                        <td className="px-4 py-3 text-secondary-700 max-w-35 truncate">{po.supplier}</td>
                        <td className="px-4 py-3 font-mono text-xs text-secondary-600 whitespace-nowrap">{po.payerCnpj}</td>
                        <td className="px-4 py-3 font-semibold text-secondary-900 whitespace-nowrap">{formatCurrency(po.total)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={PO_STATUS_VARIANT[po.status] ?? 'default'}>
                            {STATUS_LABELS[po.status] ?? po.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-secondary-500 whitespace-nowrap">{formatDate(po.issuedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-secondary-200 bg-secondary-50">
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-secondary-500">Total</td>
                      <td className="px-4 py-2.5 font-bold text-secondary-900 whitespace-nowrap">{formatCurrency(String(totalValue))}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-16 text-secondary-400 gap-2">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p className="text-sm">Aplique os filtros e clique em <strong className="text-secondary-600">Buscar</strong> para gerar o relatório.</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('contracts')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-secondary-900">Relatórios</h1>
        <p className="text-sm text-secondary-500">
          Filtre por período e exporte os dados em JSON.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-secondary-200 gap-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active section */}
      <div>
        {activeTab === 'contracts'      && <ContractsReport />}
        {activeTab === 'obras'          && <ObrasReport />}
        {activeTab === 'purchase-orders' && <PurchaseOrdersReport />}
      </div>
    </div>
  )
}
