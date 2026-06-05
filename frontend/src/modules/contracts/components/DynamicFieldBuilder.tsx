import { Input } from '@/shared/components/ui'

export type FieldType = 'TEXT' | 'DATE' | 'CURRENCY' | 'CPF' | 'CNPJ' | 'SIGNATURE'

export interface TemplateField {
  id: string
  key: string
  label: string
  type: FieldType
  required: boolean
  order: number
}

interface DynamicFieldBuilderProps {
  fields: TemplateField[]
  values: Record<string, string>
  errors?: Record<string, string>
  onChange: (key: string, value: string) => void
}

function maskCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function DynamicFieldBuilder({
  fields,
  values,
  errors = {},
  onChange,
}: DynamicFieldBuilderProps) {
  if (fields.length === 0) return null

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">
        Campos do template
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const value = values[field.key] ?? ''
          const error = errors[field.key]
          const labelText = field.required ? field.label : `${field.label} (opcional)`

          // Assinatura: campo coletado na etapa de assinatura eletrônica
          if (field.type === 'SIGNATURE') {
            return (
              <div
                key={field.id}
                className="rounded-lg border border-secondary-200 bg-secondary-50 p-3"
              >
                <p className="text-xs font-medium text-secondary-700">{field.label}</p>
                <p className="mt-1 text-xs text-secondary-400">
                  Coletado na etapa de assinatura eletrônica
                </p>
              </div>
            )
          }

          // Moeda: input com prefixo R$
          if (field.type === 'CURRENCY') {
            return (
              <div key={field.id} className="flex flex-col gap-1">
                <label className="text-sm font-medium text-secondary-700">
                  {labelText}
                  {field.required && <span className="ml-0.5 text-danger-500">*</span>}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary-500">
                    R$
                  </span>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    placeholder="0,00"
                    className={[
                      'w-full rounded-lg border pl-9 pr-3 py-2 text-sm text-secondary-900 placeholder-secondary-400',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                      error
                        ? 'border-danger-500 bg-danger-50'
                        : 'border-secondary-300 bg-white hover:border-secondary-400',
                    ].join(' ')}
                  />
                </div>
                {error && <p className="text-xs text-danger-600">{error}</p>}
              </div>
            )
          }

          // CPF, CNPJ, DATE, TEXT
          return (
            <Input
              key={field.id}
              label={labelText}
              type={field.type === 'DATE' ? 'date' : 'text'}
              value={value}
              required={field.required}
              error={error}
              placeholder={
                field.type === 'CPF'
                  ? '000.000.000-00'
                  : field.type === 'CNPJ'
                    ? '00.000.000/0000-00'
                    : undefined
              }
              onChange={(e) => {
                let v = e.target.value
                if (field.type === 'CPF') v = maskCpf(v)
                if (field.type === 'CNPJ') v = maskCnpj(v)
                onChange(field.key, v)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
