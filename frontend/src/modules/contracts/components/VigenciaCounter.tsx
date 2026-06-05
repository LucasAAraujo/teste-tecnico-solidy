type Urgencia = 'expirado' | 'critico' | 'atencao' | 'normal'

interface VigenciaInfo {
  diasRestantes: number
  expirado: boolean
  urgencia: Urgencia
}

const URGENCIA_CLASSES: Record<Urgencia, string> = {
  expirado: 'text-danger-600',
  critico:  'text-danger-600',
  atencao:  'text-warning-600',
  normal:   'text-success-600',
}

export function getVigencia(endDate: string | null | undefined): VigenciaInfo | null {
  if (!endDate) return null
  const now = new Date()
  const end = new Date(endDate)
  const diffMs = end.getTime() - now.getTime()
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const expirado = diasRestantes < 0

  let urgencia: Urgencia
  if (expirado)              urgencia = 'expirado'
  else if (diasRestantes <= 7)  urgencia = 'critico'
  else if (diasRestantes <= 30) urgencia = 'atencao'
  else                          urgencia = 'normal'

  return { diasRestantes, expirado, urgencia }
}

interface VigenciaCounterProps {
  endDate: string | null | undefined
}

export function VigenciaCounter({ endDate }: VigenciaCounterProps) {
  const info = getVigencia(endDate)

  if (!info) {
    return <span className="text-xs text-secondary-400">—</span>
  }

  const colorClass = URGENCIA_CLASSES[info.urgencia]
  const absDias = Math.abs(info.diasRestantes)

  let label: string
  if (info.expirado) {
    label = `Expirado há ${absDias}d`
  } else if (info.diasRestantes === 0) {
    label = 'Vence hoje'
  } else {
    label = `${info.diasRestantes}d restantes`
  }

  return <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
}
