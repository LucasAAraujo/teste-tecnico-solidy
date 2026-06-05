import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import { ObraStepsChecklist } from '../components/ObraStepsChecklist'
import { VistoriaForm } from '../components/VistoriaForm'
import { CustoForm } from '../components/CustoForm'
import { FornecedorForm } from '../components/FornecedorForm'
import { EquipeMembroForm } from '../components/EquipeMembroForm'

// ─── Types ────────────────────────────────────────────────────────────────────

type ObraStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type POStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED'

interface Obra {
  id: string; name: string; address: string; status: ObraStatus
  budget: string; orcamentoRealizado: string; pctOrcamento: number
  startDate: string | null; endDate: string | null; createdAt: string
  contract: { id: string; title: string } | null
}

interface PurchaseOrder {
  id: string; number: string; supplier: string; payerCnpj: string
  total: string; status: POStatus; issuedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ObraStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger'; dot: string }> = {
  PLANNING:    { label: 'Planejamento', variant: 'default',  dot: 'bg-blue-400'    },
  IN_PROGRESS: { label: 'Em execução',  variant: 'warning',  dot: 'bg-warning-400' },
  COMPLETED:   { label: 'Concluída',    variant: 'success',  dot: 'bg-success-400' },
  CANCELLED:   { label: 'Cancelada',    variant: 'danger',   dot: 'bg-secondary-400' },
}

const PO_STATUS_CFG: Record<POStatus, { label: string; variant: 'default' | 'success' | 'danger' }> = {
  DRAFT:     { label: 'Rascunho',  variant: 'default'  },
  APPROVED:  { label: 'Aprovada',  variant: 'success'  },
  CANCELLED: { label: 'Cancelada', variant: 'danger'   },
}

const TABS = [
  { key: 'roteiro',      label: 'Roteiro'          },
  { key: 'vistorias',    label: 'Vistorias'         },
  { key: 'custos',       label: 'Custos'            },
  { key: 'fornecedores', label: 'Fornecedores'      },
  { key: 'equipe',       label: 'Equipe'            },
  { key: 'oc',           label: 'Ordens de Compra'  },
] as const

type TabKey = (typeof TABS)[number]['key']

// ─── Tab: Ordens de Compra ────────────────────────────────────────────────────

function OCTab({ obraId }: { obraId: string }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: PurchaseOrder[] }>(`/obras/${obraId}/purchase-orders`)
      setOrders(res.data.data)
    } finally { setLoading(false) }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-500">{orders.length} ordem{orders.length !== 1 ? 's' : ''} de compra</p>
        <Button size="sm" onClick={() => navigate('/purchase-orders')}>Gerenciar O.C. →</Button>
      </div>
      {orders.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm text-secondary-400">Nenhuma ordem de compra emitida para esta obra.</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-secondary-50">
                  {['Número', 'Fornecedor', 'CNPJ Pagador', 'Total', 'Status', 'Data'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {orders.map((po) => {
                  const cfg = PO_STATUS_CFG[po.status]
                  return (
                    <tr key={po.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-secondary-900">{po.number}</td>
                      <td className="px-4 py-3 text-secondary-700">{po.supplier}</td>
                      <td className="px-4 py-3 font-mono text-xs text-secondary-600">{po.payerCnpj}</td>
                      <td className="px-4 py-3 font-medium text-secondary-900">{formatCurrency(po.total)}</td>
                      <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                      <td className="px-4 py-3 text-secondary-500 text-xs">{formatDate(po.issuedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ObraDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('roteiro')

  // Status change modal
  const [statusOpen, setStatusOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<ObraStatus>('PLANNING')
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<Obra>(`/obras/${id}`)
      .then((res) => { setObra(res.data); setNewStatus(res.data.status) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleStatusChange() {
    if (!id) return
    setStatusLoading(true)
    try {
      const res = await api.put<Obra>(`/obras/${id}`, { status: newStatus })
      setObra(res.data)
      setStatusOpen(false)
    } finally { setStatusLoading(false) }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
  if (notFound || !obra) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <p className="text-secondary-500">Obra não encontrada.</p>
      <Button variant="secondary" onClick={() => navigate('/obras')}>← Voltar</Button>
    </div>
  )

  const statusCfg = STATUS_CFG[obra.status]
  const pct = obra.pctOrcamento
  const barColor = pct >= 90 ? 'bg-danger-500' : pct >= 70 ? 'bg-warning-400' : 'bg-success-500'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={() => navigate('/obras')}
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-secondary-600 hover:bg-secondary-100">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-secondary-900">{obra.name}</h1>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            </span>
          </div>
          <p className="mt-1 text-sm text-secondary-500">{obra.address}</p>
          {obra.contract && (
            <button onClick={() => navigate(`/contracts/${obra.contract!.id}`)}
              className="mt-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">
              Contrato: {obra.contract.title}
            </button>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={() => { setNewStatus(obra.status); setStatusOpen(true) }}>
          Alterar status
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500">Orçamento previsto</p>
          <p className="mt-1 text-base font-bold text-secondary-900">{formatCurrency(obra.budget)}</p>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500">Realizado</p>
          <p className={`mt-1 text-base font-bold ${pct >= 90 ? 'text-danger-600' : 'text-secondary-900'}`}>
            {formatCurrency(obra.orcamentoRealizado)}
          </p>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500">Saldo</p>
          <p className={`mt-1 text-base font-bold ${(parseFloat(obra.budget) - parseFloat(obra.orcamentoRealizado)) < 0 ? 'text-danger-600' : 'text-success-600'}`}>
            {formatCurrency(String(parseFloat(obra.budget) - parseFloat(obra.orcamentoRealizado)))}
          </p>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500 mb-1">Consumido</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-secondary-100">
              <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className={`text-xs font-bold shrink-0 ${pct >= 90 ? 'text-danger-600' : 'text-secondary-700'}`}>{pct.toFixed(0)}%</span>
          </div>
          <p className="mt-1 text-xs text-secondary-400">
            {formatDate(obra.startDate)} — {formatDate(obra.endDate)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div>
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
        <div className="mt-4">
          {activeTab === 'roteiro'      && <ObraStepsChecklist obraId={obra.id} />}
          {activeTab === 'vistorias'    && <VistoriaForm    obraId={obra.id} />}
          {activeTab === 'custos'       && <CustoForm        obraId={obra.id} budget={obra.budget} />}
          {activeTab === 'fornecedores' && <FornecedorForm obraId={obra.id} />}
          {activeTab === 'equipe'       && <EquipeMembroForm obraId={obra.id} />}
          {activeTab === 'oc'           && <OCTab           obraId={obra.id} />}
        </div>
      </div>

      {/* Status modal */}
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Alterar status da obra" size="sm"
        footer={<><Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancelar</Button><Button onClick={handleStatusChange} loading={statusLoading}>Confirmar</Button></>}
      >
        <div className="space-y-3">
          {(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as ObraStatus[]).map((s) => (
            <label key={s} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors ${newStatus === s ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'}`}>
              <input type="radio" name="status" value={s} checked={newStatus === s} onChange={() => setNewStatus(s)} className="hidden" />
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_CFG[s].dot}`} />
              <span className="text-sm font-medium text-secondary-800">{STATUS_CFG[s].label}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  )
}
