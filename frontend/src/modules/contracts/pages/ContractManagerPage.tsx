import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/format'
import { ContractStatusBadge } from '../components/ContractStatusBadge'
import { VigenciaCounter } from '../components/VigenciaCounter'

// ─── Types ────────────────────────────────────────────────────────────────────

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

const URGENCIA_CFG: Record<string, { label: string; variant: 'danger' | 'warning' | 'success' | 'default' }> = {
  expirado: { label: 'Expirado',    variant: 'danger'  },
  critico:  { label: 'Crítico',     variant: 'danger'  },
  atencao:  { label: 'Atenção',     variant: 'warning' },
  normal:   { label: 'Normal',      variant: 'success' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ContractManagerPage() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<ContractManager[]>([])
  const [loading, setLoading] = useState(true)

  // Renewal modal
  const [renewTarget, setRenewTarget] = useState<ContractManager | null>(null)
  const [newEndDate, setNewEndDate] = useState('')
  const [renewLoading, setRenewLoading] = useState(false)
  const [renewError, setRenewError] = useState('')

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<ContractManager | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const fetchContracts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ContractManager[]>('/contracts/manager')
      setContracts(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContracts() }, [fetchContracts])

  // ── Renew ──────────────────────────────────────────────────────────────────

  function openRenew(c: ContractManager) {
    setRenewTarget(c)
    setNewEndDate(c.endDate ? c.endDate.slice(0, 10) : '')
    setRenewError('')
  }

  async function handleRenew() {
    if (!renewTarget || !newEndDate) { setRenewError('Informe a nova data de vencimento.'); return }
    setRenewLoading(true)
    setRenewError('')
    try {
      await api.put(`/contracts/${renewTarget.id}`, {
        endDate: new Date(newEndDate).toISOString(),
      })
      setRenewTarget(null)
      fetchContracts()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setRenewError(msg ?? 'Erro ao renovar contrato.')
    } finally {
      setRenewLoading(false)
    }
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelLoading(true)
    setCancelError('')
    try {
      await api.delete(`/contracts/${cancelTarget.id}`)
      setCancelTarget(null)
      fetchContracts()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setCancelError(msg ?? 'Erro ao cancelar contrato.')
      setCancelLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Gerenciador de Vigência</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Contratos ativos ordenados por urgência de vencimento
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/contracts')}>
          Lista completa →
        </Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-secondary-400">
              Nenhum contrato ativo com data de vencimento definida.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-secondary-50">
                  {['Contrato', 'Status', 'Vencimento', 'Vigência', 'Urgência', 'Ações'].map((h) => (
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
                {contracts.map((c) => {
                  const urgCfg = URGENCIA_CFG[c.vigencia.urgencia] ?? URGENCIA_CFG['normal']
                  const canRenew  = c.status === 'DRAFT'
                  const canCancel = !['CANCELLED', 'SIGNED'].includes(c.status)

                  return (
                    <tr key={c.id} className="hover:bg-secondary-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-secondary-900">{c.title}</p>
                        <p className="mt-0.5 text-xs text-secondary-500">{c.category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ContractStatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3 text-secondary-700">
                        {formatDate(c.endDate)}
                      </td>
                      <td className="px-4 py-3">
                        <VigenciaCounter endDate={c.endDate} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={urgCfg.variant}>{urgCfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/contracts/${c.id}`)}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            Ver
                          </button>
                          {canRenew && (
                            <button
                              onClick={() => openRenew(c)}
                              className="text-xs font-medium text-secondary-600 hover:text-secondary-900"
                            >
                              Renovar
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => { setCancelTarget(c); setCancelError('') }}
                              className="text-xs font-medium text-danger-600 hover:text-danger-700"
                            >
                              Encerrar
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
        )}
      </Card>

      {/* Renewal modal */}
      <Modal
        open={!!renewTarget}
        onClose={() => setRenewTarget(null)}
        title="Renovar contrato"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewTarget(null)}>Cancelar</Button>
            <Button onClick={handleRenew} loading={renewLoading}>Confirmar renovação</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary-700">
            Estender a vigência de{' '}
            <strong className="text-secondary-900">{renewTarget?.title}</strong>
          </p>
          <Input
            label="Nova data de vencimento"
            type="date"
            value={newEndDate}
            onChange={(e) => { setNewEndDate(e.target.value); setRenewError('') }}
            required
          />
          {renewError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {renewError}
            </p>
          )}
        </div>
      </Modal>

      {/* Cancel confirmation modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Encerrar contrato"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>Voltar</Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelLoading}>
              Confirmar encerramento
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-secondary-700">
            Encerrar o contrato{' '}
            <strong className="text-secondary-900">{cancelTarget?.title}</strong>?
          </p>
          <p className="text-xs text-secondary-500">
            O status será alterado para Cancelado. Esta ação não pode ser desfeita.
          </p>
          {cancelError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {cancelError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
