import { useEffect, useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Modal, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import { PurchaseOrderForm } from '../components/PurchaseOrderForm'

// ─── Types ────────────────────────────────────────────────────────────────────

type POStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED'

interface PurchaseOrder {
  id: string
  number: string
  supplier: string
  payerCnpj: string
  total: string
  status: POStatus
  issuedAt: string
  obra: { id: string; name: string }
}

interface PaginatedResponse {
  data: PurchaseOrder[]
  total: number
  page: number
  limit: number
}

interface ObraOption {
  id: string
  name: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PO_STATUS_CFG: Record<POStatus, { label: string; variant: 'default' | 'success' | 'danger' }> = {
  DRAFT:     { label: 'Rascunho',  variant: 'default'  },
  APPROVED:  { label: 'Aprovada',  variant: 'success'  },
  CANCELLED: { label: 'Cancelada', variant: 'danger'   },
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',          label: 'Todos os status' },
  { value: 'DRAFT',     label: 'Rascunho'        },
  { value: 'APPROVED',  label: 'Aprovada'         },
  { value: 'CANCELLED', label: 'Cancelada'        },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function PurchaseOrdersPage() {
  const [orders, setOrders]   = useState<PurchaseOrder[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const limit = 15

  // Filters
  const [status, setStatus]   = useState('')
  const [obraId, setObraId]   = useState('')
  const [obras, setObras]     = useState<ObraOption[]>([])

  // Create modal
  const [formOpen, setFormOpen] = useState(false)

  // Approve confirm
  const [approveId, setApproveId] = useState<string | null>(null)
  const [approveLoading, setApproveLoading] = useState(false)

  // Cancel confirm
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  // Fetch obras for filter dropdown
  useEffect(() => {
    api.get<{ data: ObraOption[] }>('/obras?limit=100')
      .then((res) => setObras(res.data.data))
      .catch(() => {})
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (status) params.set('status', status)
      if (obraId) params.set('obraId', obraId)
      const res = await api.get<PaginatedResponse>(`/purchase-orders?${params}`)
      setOrders(res.data.data)
      setTotal(res.data.total)
    } finally {
      setLoading(false)
    }
  }, [page, status, obraId])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [status, obraId])

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleApprove() {
    if (!approveId) return
    setApproveLoading(true)
    try {
      await api.patch(`/purchase-orders/${approveId}/approve`)
      setApproveId(null)
      fetchOrders()
    } finally {
      setApproveLoading(false)
    }
  }

  async function handleCancel() {
    if (!cancelId) return
    setCancelLoading(true)
    try {
      await api.patch(`/purchase-orders/${cancelId}/cancel`)
      setCancelId(null)
      fetchOrders()
    } finally {
      setCancelLoading(false)
    }
  }

  // ── Pagination ──────────────────────────────────────────────────────────────

  const totalPages = Math.ceil(total / limit)

  function pageButtons() {
    const pages: number[] = []
    const start = Math.max(1, page - 3)
    const end   = Math.min(totalPages, page + 3)
    for (let p = start; p <= end; p++) pages.push(p)
    return pages
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-secondary-900">Ordens de Compra</h1>
          <p className="text-sm text-secondary-500">
            {total > 0 ? `${total} ordem${total !== 1 ? 's' : ''} encontrada${total !== 1 ? 's' : ''}` : 'Nenhuma ordem encontrada'}
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>+ Nova O.C.</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Obra */}
          <select
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
            className="min-w-50 rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            <option value="">Todas as obras</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>

          {(status || obraId) && (
            <button
              onClick={() => { setStatus(''); setObraId('') }}
              className="text-xs font-medium text-secondary-500 hover:text-secondary-800"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Spinner /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg className="h-10 w-10 text-secondary-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <p className="text-sm text-secondary-400">Nenhuma ordem de compra encontrada.</p>
            <button
              onClick={() => setFormOpen(true)}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Emitir primeira O.C. →
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-100 bg-secondary-50">
                    {['Número', 'Obra', 'Fornecedor', 'CNPJ Pagador', 'Total', 'Status', 'Data', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {orders.map((po) => {
                    const cfg = PO_STATUS_CFG[po.status]
                    return (
                      <tr key={po.id} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-secondary-900 whitespace-nowrap">
                          {po.number}
                        </td>
                        <td className="px-4 py-3 text-secondary-700 max-w-40 truncate">
                          {po.obra.name}
                        </td>
                        <td className="px-4 py-3 text-secondary-700 max-w-40 truncate">
                          {po.supplier}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-secondary-600 whitespace-nowrap">
                          {po.payerCnpj}
                        </td>
                        <td className="px-4 py-3 font-semibold text-secondary-900 whitespace-nowrap">
                          {formatCurrency(po.total)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-secondary-500 whitespace-nowrap">
                          {formatDate(po.issuedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 whitespace-nowrap">
                            {po.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => setApproveId(po.id)}
                                  className="text-xs font-medium text-success-600 hover:text-success-700"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => setCancelId(po.id)}
                                  className="text-xs font-medium text-danger-500 hover:text-danger-700"
                                >
                                  Cancelar
                                </button>
                              </>
                            )}
                            {po.status === 'APPROVED' && (
                              <button
                                onClick={() => setCancelId(po.id)}
                                className="text-xs font-medium text-danger-500 hover:text-danger-700"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-secondary-100 px-4 py-3">
                <span className="text-xs text-secondary-500">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded px-2 py-1 text-xs text-secondary-600 hover:bg-secondary-100 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  {pageButtons().map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={[
                        'rounded px-2.5 py-1 text-xs font-medium',
                        p === page
                          ? 'bg-primary-600 text-white'
                          : 'text-secondary-600 hover:bg-secondary-100',
                      ].join(' ')}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded px-2 py-1 text-xs text-secondary-600 hover:bg-secondary-100 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create form modal */}
      <PurchaseOrderForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchOrders}
      />

      {/* Approve confirm */}
      <Modal
        open={!!approveId}
        onClose={() => setApproveId(null)}
        title="Aprovar Ordem de Compra"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveId(null)}>Cancelar</Button>
            <Button onClick={handleApprove} loading={approveLoading}>Aprovar</Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">
          Confirmar aprovação desta ordem de compra? Após aprovada, ela não poderá ser revertida para rascunho.
        </p>
      </Modal>

      {/* Cancel confirm */}
      <Modal
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        title="Cancelar Ordem de Compra"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelId(null)}>Voltar</Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelLoading}>Cancelar O.C.</Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">
          Tem certeza que deseja cancelar esta ordem de compra? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  )
}
