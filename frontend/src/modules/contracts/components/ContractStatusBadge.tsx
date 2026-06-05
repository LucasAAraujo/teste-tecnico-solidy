import { Badge } from '@/shared/components/ui'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'danger' }> = {
  DRAFT:             { label: 'Rascunho',           variant: 'default'  },
  PENDING_SIGNATURE: { label: 'Aguard. Assinatura', variant: 'warning'  },
  SIGNED:            { label: 'Assinado',            variant: 'success'  },
  EXPIRED:           { label: 'Expirado',            variant: 'danger'   },
  CANCELLED:         { label: 'Cancelado',           variant: 'default'  },
}

interface ContractStatusBadgeProps {
  status: string
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
