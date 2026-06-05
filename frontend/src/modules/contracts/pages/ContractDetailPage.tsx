import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Modal, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import { ContractStatusBadge } from '../components/ContractStatusBadge'
import { VigenciaCounter } from '../components/VigenciaCounter'
import { SendSignatureModal } from '@/modules/signatures/components/SendSignatureModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignatureRequest {
  id: string
  signerName: string
  signerEmail: string | null
  signerPhone: string | null
  channel: 'EMAIL' | 'WHATSAPP' | 'BOTH'
  status: 'PENDING' | 'SIGNED' | 'EXPIRED'
  sentAt: string | null
  signedAt: string | null
  expiresAt: string
  createdAt: string
}

interface Contract {
  id: string
  title: string
  category: string
  status: string
  body: string
  fieldValues: Record<string, string>
  value: string | null
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
  template: { id: string; name: string } | null
  signatureRequests: SignatureRequest[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SIG_STATUS_CFG: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'Aguardando', variant: 'warning' },
  SIGNED:  { label: 'Assinado',   variant: 'success'  },
  EXPIRED: { label: 'Expirado',   variant: 'danger'   },
}

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL:     'E-mail',
  WHATSAPP:  'WhatsApp',
  BOTH:      'E-mail + WhatsApp',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [sendSigOpen, setSendSigOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const fetchContract = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await api.get<Contract>(`/contracts/${id}`)
      setContract(res.data)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchContract() }, [fetchContract])

  async function handleCancel() {
    if (!id) return
    setCancelling(true)
    setCancelError('')
    try {
      await api.delete(`/contracts/${id}`)
      navigate('/contracts')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setCancelError(msg ?? 'Erro ao cancelar contrato.')
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (notFound || !contract) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-secondary-500">Contrato não encontrado.</p>
        <Button variant="secondary" onClick={() => navigate('/contracts')}>← Voltar</Button>
      </div>
    )
  }

  const canSign   = !['CANCELLED', 'EXPIRED'].includes(contract.status)
  const canCancel = !['CANCELLED', 'SIGNED'].includes(contract.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button
          onClick={() => navigate('/contracts')}
          className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-secondary-600 hover:bg-secondary-100"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-secondary-900">{contract.title}</h1>
            <ContractStatusBadge status={contract.status} />
          </div>
          <p className="mt-1 text-sm text-secondary-500">
            {contract.category}
            {contract.template && ` · Template: ${contract.template.name}`}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {canSign && (
            <Button size="sm" onClick={() => setSendSigOpen(true)}>
              Enviar para assinatura
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="danger" onClick={() => setCancelOpen(true)}>
              Cancelar contrato
            </Button>
          )}
        </div>
      </div>

      {/* Metadata + Signatures */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Metadata */}
        <Card className="lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-secondary-700">Informações</h2>
          <dl className="space-y-3">
            {[
              { label: 'Valor',     value: formatCurrency(contract.value) },
              { label: 'Início',    value: formatDate(contract.startDate) },
              { label: 'Vencimento', value: formatDate(contract.endDate)  },
              { label: 'Categoria', value: contract.category              },
              { label: 'Criado em', value: formatDate(contract.createdAt) },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-secondary-500">{label}</dt>
                <dd className="mt-0.5 text-sm text-secondary-900">{value}</dd>
              </div>
            ))}
            {contract.endDate && (
              <div>
                <dt className="text-xs font-medium text-secondary-500">Vigência</dt>
                <dd className="mt-0.5">
                  <VigenciaCounter endDate={contract.endDate} />
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Signatures */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-secondary-700">
              Assinaturas
              {contract.signatureRequests.length > 0 && (
                <span className="ml-1.5 text-secondary-400">
                  ({contract.signatureRequests.length})
                </span>
              )}
            </h2>
            {canSign && (
              <button
                onClick={() => setSendSigOpen(true)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                + Adicionar signatário
              </button>
            )}
          </div>

          {contract.signatureRequests.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-secondary-200 py-8 text-center">
              <p className="text-sm text-secondary-400">Nenhuma solicitação de assinatura</p>
              {canSign && (
                <button
                  onClick={() => setSendSigOpen(true)}
                  className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Enviar para assinatura →
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-secondary-100">
              {contract.signatureRequests.map((sig) => {
                const cfg = SIG_STATUS_CFG[sig.status] ?? SIG_STATUS_CFG['PENDING']
                return (
                  <div key={sig.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xs font-semibold text-secondary-600">
                      {sig.signerName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900">{sig.signerName}</p>
                      <p className="text-xs text-secondary-500">
                        {CHANNEL_LABEL[sig.channel]}
                        {sig.signerEmail && ` · ${sig.signerEmail}`}
                        {sig.signerPhone && ` · ${sig.signerPhone}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <p className="mt-0.5 text-xs text-secondary-400">
                        {sig.signedAt
                          ? `Assinado ${formatDate(sig.signedAt)}`
                          : `Expira ${formatDate(sig.expiresAt)}`}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Contract body */}
      <Card>
        <h2 className="mb-4 text-sm font-semibold text-secondary-700">Conteúdo do Contrato</h2>
        <div
          className="min-h-32 rounded-lg border border-secondary-100 bg-secondary-50 p-6 text-sm leading-relaxed text-secondary-800"
          dangerouslySetInnerHTML={{ __html: contract.body || '<p class="text-secondary-400">Sem conteúdo.</p>' }}
        />
      </Card>

      {/* Send signature modal */}
      <SendSignatureModal
        contractId={contract.id}
        open={sendSigOpen}
        onClose={() => setSendSigOpen(false)}
        onSuccess={() => { setSendSigOpen(false); fetchContract() }}
      />

      {/* Cancel confirmation modal */}
      <Modal
        open={cancelOpen}
        onClose={() => { setCancelOpen(false); setCancelError('') }}
        title="Cancelar contrato"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Voltar
            </Button>
            <Button variant="danger" onClick={handleCancel} loading={cancelling}>
              Confirmar cancelamento
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-secondary-700">
            Tem certeza que deseja cancelar o contrato{' '}
            <strong className="text-secondary-900">{contract.title}</strong>?
          </p>
          <p className="text-xs text-secondary-500">
            Esta ação não pode ser desfeita. Contratos cancelados não podem ser reativados.
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
