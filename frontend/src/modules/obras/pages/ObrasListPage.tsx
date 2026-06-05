import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type ObraStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

interface ObraItem {
  id: string
  name: string
  address: string
  status: ObraStatus
  budget: string
  startDate: string | null
  endDate: string | null
  createdAt: string
  contract: { id: string; title: string } | null
  orcamentoRealizado: string
  pctOrcamento: number
  _count: { steps: number; vistorias: number; purchaseOrders: number }
}

interface ListResponse {
  data: ObraItem[]
  total: number
  page: number
  limit: number
  pages: number
}

interface ContractOption {
  id: string
  title: string
  category: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20

const STATUS_CFG: Record<ObraStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger'; dot: string }> = {
  PLANNING:    { label: 'Planejamento', variant: 'default',  dot: 'bg-blue-400'      },
  IN_PROGRESS: { label: 'Em execução',  variant: 'warning',  dot: 'bg-warning-400'   },
  COMPLETED:   { label: 'Concluída',    variant: 'success',  dot: 'bg-success-400'   },
  CANCELLED:   { label: 'Cancelada',    variant: 'danger',   dot: 'bg-secondary-400' },
}

const STATUS_OPTIONS: ObraStatus[] = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const EMPTY_FORM = {
  name: '',
  address: '',
  budget: '',
  contractId: '',
  startDate: '',
  endDate: '',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ObraStatusBadge({ status }: { status: ObraStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <Badge variant={cfg.variant}>{cfg.label}</Badge>
    </span>
  )
}

function BudgetBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color =
    pct >= 90 ? 'bg-danger-500' :
    pct >= 70 ? 'bg-warning-400' :
                'bg-success-500'

  return (
    <div className="w-32">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-secondary-500">Consumido</span>
        <span className={`text-xs font-semibold ${pct >= 90 ? 'text-danger-600' : pct >= 70 ? 'text-warning-600' : 'text-success-600'}`}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary-100">
        <div
          className={`h-1.5 rounded-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ObrasListPage() {
  const navigate = useNavigate()

  // List state
  const [obras, setObras] = useState<ObraItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ObraStatus | ''>('')

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [contracts, setContracts] = useState<ContractOption[]>([])

  const fetchObras = useCallback(async (pg: number, s: string, st: string) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page: pg, limit: LIMIT }
      if (s)  params.search = s
      if (st) params.status = st
      const res = await api.get<ListResponse>('/obras', { params })
      setObras(res.data.data)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchObras(page, search, statusFilter) }, [fetchObras, page, search, statusFilter])

  async function fetchContracts() {
    try {
      const res = await api.get<{ data: ContractOption[] }>('/contracts', {
        params: { status: 'SIGNED', limit: 100 },
      })
      setContracts(res.data.data)
    } catch {
      setContracts([])
    }
  }

  function applySearch() {
    setSearch(pendingSearch)
    setPage(1)
  }

  function handleStatusChange(val: string) {
    setStatusFilter(val as ObraStatus | '')
    setPage(1)
  }

  // ── Create modal ────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormErrors({})
    setCreateError('')
    fetchContracts()
    setCreateOpen(true)
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setFormErrors((e) => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Nome deve ter pelo menos 2 caracteres.'
    if (!form.address.trim() || form.address.trim().length < 5)
      errs.address = 'Endereço deve ter pelo menos 5 caracteres.'
    const budgetVal = parseFloat(form.budget.replace(',', '.'))
    if (!form.budget || isNaN(budgetVal) || budgetVal <= 0)
      errs.budget = 'Informe um orçamento válido maior que zero.'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate() {
    if (!validate()) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const budgetVal = parseFloat(form.budget.replace(',', '.'))
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        address: form.address.trim(),
        budget: budgetVal,
      }
      if (form.contractId) body.contractId = form.contractId
      if (form.startDate)  body.startDate  = new Date(form.startDate).toISOString()
      if (form.endDate)    body.endDate    = new Date(form.endDate).toISOString()

      const res = await api.post<ObraItem>('/obras', body)
      setCreateOpen(false)
      navigate(`/obras/${res.data.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setCreateError(msg ?? 'Erro ao criar obra.')
      setCreateLoading(false)
    }
  }

  // ── Pagination ──────────────────────────────────────────────────────────────

  const pageButtons = Array.from({ length: Math.min(pages, 7) }, (_, i) => {
    if (pages <= 7) return i + 1
    if (page <= 4)  return i + 1
    if (page >= pages - 3) return pages - 6 + i
    return page - 3 + i
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Obras</h1>
          <p className="mt-1 text-sm text-secondary-500">
            {total > 0 ? `${total} obra${total === 1 ? '' : 's'} encontrada${total === 1 ? '' : 's'}` : 'Gestão de obras e projetos'}
          </p>
        </div>
        <Button onClick={openCreate}>+ Nova obra</Button>
      </div>

      {/* Filters */}
      <Card padding={false}>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-1 min-w-48 items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por nome…"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              className="flex-1 rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-900 placeholder-secondary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <Button size="sm" variant="secondary" onClick={applySearch}>Buscar</Button>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_CFG[s].label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : obras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="h-10 w-10 text-secondary-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
            <p className="text-sm text-secondary-400">Nenhuma obra encontrada</p>
            <Button size="sm" onClick={openCreate}>Criar primeira obra</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-secondary-50">
                  {['Obra', 'Status', 'Orçamento', 'Consumido', 'Período', 'Contrato', 'Ações'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {obras.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/obras/${o.id}`)}
                    className="cursor-pointer hover:bg-secondary-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-secondary-900">{o.name}</p>
                      <p className="mt-0.5 text-xs text-secondary-500 truncate max-w-48">{o.address}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ObraStatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-secondary-900">{formatCurrency(o.budget)}</p>
                      <p className="mt-0.5 text-xs text-secondary-500">
                        Real: {formatCurrency(o.orcamentoRealizado)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <BudgetBar pct={o.pctOrcamento} />
                    </td>
                    <td className="px-4 py-3 text-secondary-600">
                      <p className="text-xs">{formatDate(o.startDate)}</p>
                      <p className="text-xs text-secondary-400">{formatDate(o.endDate)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {o.contract ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${o.contract!.id}`) }}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                        >
                          {o.contract.title}
                        </button>
                      ) : (
                        <span className="text-xs text-secondary-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/obras/${o.id}`) }}
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
        )}
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-secondary-500">
            Página {page} de {pages} · {total} resultado{total === 1 ? '' : 's'}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-secondary-100 disabled:opacity-40"
            >
              ←
            </button>
            {pageButtons.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  n === page
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-600 hover:bg-secondary-100'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="rounded px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-secondary-100 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova obra"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createLoading}>Criar obra</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome da obra"
            placeholder="Ex: Reforma Sede Matriz"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            error={formErrors.name}
            required
          />
          <Input
            label="Endereço"
            placeholder="Rua, número, bairro, cidade"
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            error={formErrors.address}
            required
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Orçamento previsto <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-secondary-500">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.budget}
                onChange={(e) => setField('budget', e.target.value)}
                className={[
                  'w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-secondary-900 placeholder-secondary-400',
                  'focus:outline-none focus:ring-1',
                  formErrors.budget
                    ? 'border-danger-400 focus:border-danger-400 focus:ring-danger-400'
                    : 'border-secondary-200 focus:border-primary-400 focus:ring-primary-400',
                ].join(' ')}
              />
            </div>
            {formErrors.budget && (
              <p className="mt-1 text-xs text-danger-600">{formErrors.budget}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data de início"
              type="date"
              value={form.startDate}
              onChange={(e) => setField('startDate', e.target.value)}
            />
            <Input
              label="Data de término"
              type="date"
              value={form.endDate}
              onChange={(e) => setField('endDate', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Vincular a contrato <span className="text-secondary-400 font-normal">(opcional)</span>
            </label>
            <select
              value={form.contractId}
              onChange={(e) => setField('contractId', e.target.value)}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-900 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              <option value="">Nenhum contrato</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            {contracts.length === 0 && (
              <p className="mt-1 text-xs text-secondary-400">
                Nenhum contrato assinado disponível para vínculo.
              </p>
            )}
          </div>

          {createError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {createError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
