import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, CardHeader, Badge, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardResponse {
  contratos: {
    porStatus: Record<string, number>
    vencendo: { em30dias: number; em60dias: number; em90dias: number }
  }
  obras: {
    porStatus: Record<string, number>
    orcamento: {
      previsto: string | number
      realizado: string | number
      saldo: string | number
      percentualConsumido: number
    }
  }
  assinaturasPendentes: number
}

interface ContractManager {
  id: string
  title: string
  category: string
  status: string
  endDate: string | null
  vigencia: {
    diasRestantes: number
    expirado: boolean
    urgencia: 'expirado' | 'critico' | 'atencao' | 'normal'
  }
}

// ─── Config maps ─────────────────────────────────────────────────────────────

const CONTRACT_STATUS_CONFIG: Record<string, { label: string; barColor: string; badge: 'default' | 'warning' | 'success' | 'danger' }> = {
  DRAFT:              { label: 'Rascunho',              barColor: 'bg-secondary-300', badge: 'default'  },
  PENDING_SIGNATURE:  { label: 'Aguard. Assinatura',   barColor: 'bg-warning-500',   badge: 'warning'  },
  SIGNED:             { label: 'Assinado',              barColor: 'bg-success-500',   badge: 'success'  },
  EXPIRED:            { label: 'Expirado',              barColor: 'bg-danger-500',    badge: 'danger'   },
  CANCELLED:          { label: 'Cancelado',             barColor: 'bg-secondary-200', badge: 'default'  },
}

const URGENCIA_CONFIG: Record<string, { label: string; badge: 'danger' | 'warning' | 'success' }> = {
  expirado: { label: 'Expirado',      badge: 'danger'  },
  critico:  { label: 'Crítico ≤7d',   badge: 'danger'  },
  atencao:  { label: 'Atenção ≤30d',  badge: 'warning' },
  normal:   { label: 'Normal',         badge: 'success' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  title,
  value,
  sub,
  iconBg = 'bg-primary-100',
}: {
  icon: React.ReactNode
  title: string
  value: number | string
  sub?: string
  iconBg?: string
}) {
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-secondary-500">{title}</p>
          <p className="mt-0.5 text-2xl font-bold text-secondary-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-secondary-400">{sub}</p>}
        </div>
      </div>
    </Card>
  )
}

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

const DocumentIcon = () => (
  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

const PenIcon = () => (
  <svg className="h-5 w-5 text-warning-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
  </svg>
)

const ClockIcon = () => (
  <svg className="h-5 w-5 text-danger-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const BuildingIcon = () => (
  <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
)

// ─── Main page ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [urgentContracts, setUrgentContracts] = useState<ContractManager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, managerRes] = await Promise.all([
          api.get<DashboardResponse>('/dashboard'),
          api.get<ContractManager[]>('/contracts/manager'),
        ])
        setData(dashRes.data)
        setUrgentContracts(
          managerRes.data.filter((c) => c.vigencia.urgencia !== 'normal').slice(0, 8),
        )
      } catch {
        setError('Não foi possível carregar o dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-secondary-500">{error || 'Dados indisponíveis.'}</p>
      </div>
    )
  }

  const totalAtivos =
    (data.contratos.porStatus['DRAFT'] ?? 0) +
    (data.contratos.porStatus['PENDING_SIGNATURE'] ?? 0) +
    (data.contratos.porStatus['SIGNED'] ?? 0)

  const obrasAtivas =
    (data.obras.porStatus['PLANNING'] ?? 0) + (data.obras.porStatus['IN_PROGRESS'] ?? 0)

  const totalContratos = Object.values(data.contratos.porStatus).reduce((a, b) => a + b, 0)

  const previsto = parseFloat(String(data.obras.orcamento.previsto)) || 0
  const realizado = parseFloat(String(data.obras.orcamento.realizado)) || 0
  const saldo = parseFloat(String(data.obras.orcamento.saldo)) || 0
  const pct = data.obras.orcamento.percentualConsumido

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
        <p className="mt-1 text-sm text-secondary-500">Visão geral do sistema</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<DocumentIcon />}
          title="Contratos Ativos"
          value={totalAtivos}
          sub="Rascunho + Pendente + Assinado"
          iconBg="bg-primary-100"
        />
        <KpiCard
          icon={<PenIcon />}
          title="Pend. Assinatura"
          value={data.assinaturasPendentes}
          sub="aguardando resposta"
          iconBg="bg-warning-50"
        />
        <KpiCard
          icon={<ClockIcon />}
          title="Vencendo em 30d"
          value={data.contratos.vencendo.em30dias}
          sub={`${data.contratos.vencendo.em60dias} em 60d · ${data.contratos.vencendo.em90dias} em 90d`}
          iconBg="bg-danger-50"
        />
        <KpiCard
          icon={<BuildingIcon />}
          title="Obras Ativas"
          value={obrasAtivas}
          sub={`${data.obras.porStatus['PLANNING'] ?? 0} planej. · ${data.obras.porStatus['IN_PROGRESS'] ?? 0} em exec.`}
          iconBg="bg-success-50"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Contract status distribution */}
        <Card>
          <CardHeader
            title="Distribuição de Contratos"
            subtitle={`${totalContratos} ${totalContratos === 1 ? 'contrato' : 'contratos'} no total`}
          />
          {totalContratos === 0 ? (
            <p className="py-8 text-center text-sm text-secondary-400">Nenhum contrato cadastrado</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(CONTRACT_STATUS_CONFIG).map(([status, cfg]) => {
                const count = data.contratos.porStatus[status] ?? 0
                const pctBar = totalContratos > 0 ? (count / totalContratos) * 100 : 0
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-secondary-700">{cfg.label}</span>
                      <span className="text-sm font-semibold text-secondary-900">
                        {count}
                        <span className="ml-1 text-xs font-normal text-secondary-400">
                          ({pctBar.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cfg.barColor}`}
                        style={{ width: `${pctBar}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Budget overview */}
        <Card>
          <CardHeader title="Orçamento das Obras" subtitle="Previsto vs Realizado" />
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Previsto', value: formatCurrency(previsto), className: 'text-secondary-900' },
                { label: 'Realizado', value: formatCurrency(realizado), className: 'text-secondary-900' },
                {
                  label: 'Saldo',
                  value: formatCurrency(saldo),
                  className: saldo < 0 ? 'text-danger-600' : 'text-success-600',
                },
                {
                  label: '% Consumido',
                  value: `${pct.toFixed(1)}%`,
                  className: pct > 90 ? 'text-danger-600' : pct > 70 ? 'text-warning-600' : 'text-secondary-900',
                },
              ].map(({ label, value, className }) => (
                <div key={label} className="rounded-lg bg-secondary-50 p-3">
                  <p className="text-xs text-secondary-500">{label}</p>
                  <p className={`mt-0.5 text-base font-semibold ${className}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-secondary-500">
                <span>0%</span>
                <span>Consumido: {pct.toFixed(1)}%</span>
                <span>100%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-secondary-100">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct > 90 ? 'bg-danger-500' : pct > 70 ? 'bg-warning-500' : 'bg-success-500'
                  }`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>

            {/* Obra status chips */}
            <div className="border-t border-secondary-100 pt-4">
              <p className="mb-2.5 text-xs font-medium text-secondary-500">Status das Obras</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'PLANNING',    label: 'Planejamento', cls: 'bg-primary-100 text-primary-700' },
                  { key: 'IN_PROGRESS', label: 'Em Andamento', cls: 'bg-warning-50 text-warning-600'   },
                  { key: 'COMPLETED',   label: 'Concluído',    cls: 'bg-success-50 text-success-600'   },
                  { key: 'CANCELLED',   label: 'Cancelado',    cls: 'bg-secondary-100 text-secondary-600' },
                ].map(({ key, label, cls }) => (
                  <span
                    key={key}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${cls}`}
                  >
                    {label}
                    <span className="font-bold">{data.obras.porStatus[key] ?? 0}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Urgent contracts */}
      <Card padding={false}>
        <div className="border-b border-secondary-100 p-6 pb-4">
          <CardHeader
            title="Contratos Urgentes"
            subtitle="Críticos, em atenção ou expirados"
            action={
              <button
                onClick={() => navigate('/contracts')}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Ver todos →
              </button>
            }
          />
        </div>

        {urgentContracts.length === 0 ? (
          <div className="py-14 text-center">
            <svg className="mx-auto h-10 w-10 text-secondary-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm text-secondary-500">Nenhum contrato urgente</p>
            <p className="mt-1 text-xs text-secondary-400">Todos os contratos estão dentro da vigência normal</p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-100">
            {urgentContracts.map((contract) => {
              const urgCfg = URGENCIA_CONFIG[contract.vigencia.urgencia] ?? URGENCIA_CONFIG['normal']
              const stCfg = CONTRACT_STATUS_CONFIG[contract.status]
              return (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                  className="flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-secondary-900">{contract.title}</p>
                    <p className="mt-0.5 text-xs text-secondary-500">{contract.category}</p>
                  </div>

                  {stCfg && (
                    <div className="hidden flex-shrink-0 sm:block">
                      <Badge variant={stCfg.badge}>{stCfg.label}</Badge>
                    </div>
                  )}

                  <div className="flex-shrink-0 text-right">
                    <Badge variant={urgCfg.badge}>{urgCfg.label}</Badge>
                    <p className="mt-0.5 text-xs text-secondary-500">
                      {contract.vigencia.expirado
                        ? `${Math.abs(contract.vigencia.diasRestantes)}d atrás`
                        : `${contract.vigencia.diasRestantes}d restantes`}
                    </p>
                  </div>

                  <div className="hidden flex-shrink-0 text-right md:block">
                    <p className="text-xs text-secondary-400">Vence</p>
                    <p className="text-sm font-medium text-secondary-700">{formatDate(contract.endDate)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
