import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Badge, Spinner } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QueueItem {
  id: string
  contractId: string
  signerName: string
  signerEmail: string | null
  signerPhone: string | null
  channel: 'EMAIL' | 'WHATSAPP' | 'BOTH'
  status: 'PENDING' | 'SIGNED' | 'EXPIRED'
  sentAt: string | null
  expiresAt: string
  createdAt: string
  contract: { id: string; title: string; category: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHANNEL_LABEL: Record<string, string> = {
  EMAIL:    'E-mail',
  WHATSAPP: 'WhatsApp',
  BOTH:     'E-mail + WhatsApp',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (days  > 0) return `há ${days}d`
  if (hours > 0) return `há ${hours}h`
  if (mins  > 0) return `há ${mins}min`
  return 'agora'
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

// ─── Animated pending badge ───────────────────────────────────────────────────

function PendingBadge({ sentAt }: { sentAt: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-warning-500" />
      </span>
      <span className="text-xs font-medium text-warning-600">Aguardando</span>
      {sentAt && (
        <span className="text-xs text-secondary-400">{timeAgo(sentAt)}</span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SignaturesQueuePage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<QueueItem[]>('/signatures/queue')
      setItems(res.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])

  // Group by contract
  const byContract = items.reduce<Record<string, { contract: QueueItem['contract']; requests: QueueItem[] }>>(
    (acc, item) => {
      if (!acc[item.contractId]) {
        acc[item.contractId] = { contract: item.contract, requests: [] }
      }
      acc[item.contractId].requests.push(item)
      return acc
    },
    {},
  )

  const contractCount = Object.keys(byContract).length
  const expiringCount = items.filter((i) => daysUntil(i.expiresAt) <= 3).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Fila de Assinaturas</h1>
        <p className="mt-1 text-sm text-secondary-500">
          Solicitações pendentes de assinatura eletrônica
        </p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-secondary-500">Aguardando assinatura</p>
            <p className="mt-1 text-2xl font-bold text-secondary-900">{items.length}</p>
            <p className="mt-0.5 text-xs text-secondary-400">
              {contractCount} {contractCount === 1 ? 'contrato' : 'contratos'}
            </p>
          </div>
          <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-secondary-500">Expiram em até 3 dias</p>
            <p className={`mt-1 text-2xl font-bold ${expiringCount > 0 ? 'text-danger-600' : 'text-secondary-900'}`}>
              {expiringCount}
            </p>
            <p className="mt-0.5 text-xs text-secondary-400">requerem atenção urgente</p>
          </div>
          <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-secondary-500">Canais utilizados</p>
            <div className="mt-1 flex gap-2">
              {(['EMAIL', 'WHATSAPP', 'BOTH'] as const).map((ch) => {
                const count = items.filter((i) => i.channel === ch).length
                if (count === 0) return null
                return (
                  <span key={ch} className="text-sm font-semibold text-secondary-900">
                    {count} <span className="text-xs font-normal text-secondary-500">{CHANNEL_LABEL[ch]}</span>
                  </span>
                )
              })}
              {items.length === 0 && <span className="text-xl font-bold text-secondary-900">—</span>}
            </div>
          </div>
        </div>
      )}

      {/* Queue table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-14 text-center">
            <svg
              className="mx-auto h-10 w-10 text-secondary-200"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-3 text-sm text-secondary-500">Fila vazia</p>
            <p className="mt-1 text-xs text-secondary-400">
              Não há solicitações de assinatura pendentes no momento
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byContract).map(([contractId, { contract, requests }]) => (
            <Card key={contractId} padding={false}>
              {/* Contract header */}
              <div className="flex items-center justify-between border-b border-secondary-100 px-5 py-3">
                <div>
                  <button
                    onClick={() => navigate(`/contracts/${contractId}`)}
                    className="font-semibold text-secondary-900 hover:text-primary-600 transition-colors"
                  >
                    {contract.title}
                  </button>
                  <span className="ml-2 text-xs text-secondary-500">{contract.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-secondary-400">
                    {requests.length} {requests.length === 1 ? 'signatário' : 'signatários'}
                  </span>
                  <button
                    onClick={() => navigate(`/contracts/${contractId}`)}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    Ver contrato →
                  </button>
                </div>
              </div>

              {/* Signature requests */}
              <div className="divide-y divide-secondary-100">
                {requests.map((item) => {
                  const remaining = daysUntil(item.expiresAt)
                  const expiring  = remaining <= 3

                  return (
                    <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xs font-semibold text-secondary-600">
                          {item.signerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-secondary-900">{item.signerName}</p>
                          <p className="text-xs text-secondary-500">
                            {CHANNEL_LABEL[item.channel]}
                            {item.signerEmail && ` · ${item.signerEmail}`}
                            {item.signerPhone && ` · ${item.signerPhone}`}
                          </p>
                        </div>
                      </div>

                      {/* Sent time */}
                      <div className="hidden flex-shrink-0 text-right sm:block">
                        <p className="text-xs text-secondary-400">Enviado</p>
                        <p className="text-xs font-medium text-secondary-700">
                          {item.sentAt ? timeAgo(item.sentAt) : formatDate(item.createdAt)}
                        </p>
                      </div>

                      {/* Expiry */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-secondary-400">Expira</p>
                        <p className={`text-xs font-medium ${expiring ? 'text-danger-600' : 'text-secondary-700'}`}>
                          {expiring
                            ? remaining <= 0
                              ? 'Hoje'
                              : `${remaining}d`
                            : formatDate(item.expiresAt)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex-shrink-0">
                        {item.status === 'PENDING' ? (
                          <PendingBadge sentAt={item.sentAt} />
                        ) : item.status === 'SIGNED' ? (
                          <Badge variant="success">Assinado</Badge>
                        ) : (
                          <Badge variant="danger">Expirado</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
