import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Spinner } from '@/shared/components/ui'
import type { TemplateField } from '@/modules/contracts/components/DynamicFieldBuilder'

interface Template {
  id: string
  name: string
  category: string
  body: string
  fields: TemplateField[]
  createdAt: string
}

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: 'Texto',
  DATE: 'Data',
  CURRENCY: 'Moeda',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  SIGNATURE: 'Assinatura',
}

export function TemplatesListPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<Template[]>('/templates')
      .then((r) => setTemplates(r.data))
      .finally(() => setLoading(false))
  }, [])

  // Agrupa por categoria
  const byCategory = templates.reduce<Record<string, Template[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Templates</h1>
          <p className="mt-1 text-sm text-secondary-500">
            Selecione um template para criar um novo contrato
          </p>
        </div>
        <Button onClick={() => navigate('/contracts/new')}>+ Novo contrato</Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-secondary-400">Nenhum template cadastrado.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary-500">
                {category}
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onUse={() => navigate(`/contracts/new?templateId=${t.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TemplateCard ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onUse,
}: {
  template: Template
  onUse: () => void
}) {
  const requiredCount = template.fields.filter((f) => f.required).length
  const optionalCount = template.fields.length - requiredCount

  return (
    <div className="flex flex-col rounded-xl border border-secondary-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div>
          <h3 className="font-semibold text-secondary-900">{template.name}</h3>
          <Badge variant="primary" className="mt-1.5">
            {template.category}
          </Badge>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100 text-secondary-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
          </svg>
        </span>
      </div>

      {/* Fields preview */}
      {template.fields.length > 0 && (
        <div className="border-t border-secondary-100 px-5 py-3">
          <p className="mb-2 text-xs text-secondary-500">
            {template.fields.length} campo{template.fields.length !== 1 ? 's' : ''}
            {optionalCount > 0 ? ` · ${optionalCount} opcional${optionalCount !== 1 ? 'is' : ''}` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {template.fields.slice(0, 6).map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center rounded-md bg-secondary-100 px-2 py-0.5 text-xs text-secondary-600"
              >
                {f.label}
                {f.type !== 'TEXT' && (
                  <span className="ml-1 text-secondary-400">· {FIELD_TYPE_LABELS[f.type]}</span>
                )}
              </span>
            ))}
            {template.fields.length > 6 && (
              <span className="text-xs text-secondary-400">+{template.fields.length - 6} mais</span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto border-t border-secondary-100 p-4">
        <Button className="w-full" onClick={onUse}>
          Usar template →
        </Button>
      </div>
    </div>
  )
}
