import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Button, Card, Input, Spinner } from '@/shared/components/ui'
import { DynamicFieldBuilder } from '../components/DynamicFieldBuilder'
import type { TemplateField } from '../components/DynamicFieldBuilder'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  category: string
  body: string
  fields: TemplateField[]
}

interface FormData {
  title: string
  category: string
  value: string
  startDate: string
  endDate: string
  body: string
  fieldValues: Record<string, string>
}

type FormErrors = Record<string, string>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderBody(body: string, fieldValues: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => fieldValues[key] ?? `<mark>{{${key}}}</mark>`)
}

function toIso(date: string): string {
  return date ? new Date(date).toISOString() : ''
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                done
                  ? 'bg-primary-600 text-white'
                  : active
                    ? 'border-2 border-primary-600 text-primary-600'
                    : 'border-2 border-secondary-200 text-secondary-400',
              ].join(' ')}
            >
              {done ? '✓' : n}
            </div>
            {i < total - 1 && (
              <div
                className={`h-0.5 w-8 rounded ${done ? 'bg-primary-600' : 'bg-secondary-200'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NewContractPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTemplateId = searchParams.get('templateId')

  const [step, setStep] = useState(1)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [fromScratch, setFromScratch] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const [form, setForm] = useState<FormData>({
    title: '',
    category: '',
    value: '',
    startDate: '',
    endDate: '',
    body: '',
    fieldValues: {},
  })

  // Fetch templates + auto-select if templateId in query string
  useEffect(() => {
    api
      .get<Template[]>('/templates')
      .then((r) => {
        setTemplates(r.data)
        if (initialTemplateId) {
          const found = r.data.find((t) => t.id === initialTemplateId)
          if (found) {
            setSelectedTemplate(found)
            setStep(2)
          }
        }
      })
      .finally(() => setLoadingTemplates(false))
  }, [initialTemplateId])

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: '' }))
  }

  function setFieldValue(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      fieldValues: { ...prev.fieldValues, [key]: value },
    }))
    setFormErrors((prev) => ({ ...prev, [key]: '' }))
  }

  // ── Step 1: template selection ──────────────────────────────────────────────

  function chooseTemplate(t: Template) {
    setSelectedTemplate(t)
    setFromScratch(false)
    setForm((prev) => ({ ...prev, category: t.category, fieldValues: {} }))
    setStep(2)
  }

  function chooseScratch() {
    setSelectedTemplate(null)
    setFromScratch(true)
    setStep(2)
  }

  // ── Step 2: validation ──────────────────────────────────────────────────────

  function validateStep2(): boolean {
    const errs: FormErrors = {}

    if (!form.title.trim()) errs.title = 'Título é obrigatório.'
    if (fromScratch && !form.category.trim()) errs.category = 'Categoria é obrigatória.'
    if (fromScratch && !form.body.trim()) errs.body = 'Conteúdo é obrigatório.'

    if (selectedTemplate) {
      for (const field of selectedTemplate.fields) {
        if (field.required && !form.fieldValues[field.key]?.trim()) {
          errs[field.key] = `${field.label} é obrigatório.`
        }
      }
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  function goToPreview() {
    if (validateStep2()) setStep(3)
  }

  // ── Step 4: save ────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true)
    setSaveError('')
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        category: (selectedTemplate ? selectedTemplate.category : form.category).trim(),
        fieldValues: form.fieldValues,
      }

      if (selectedTemplate) {
        payload.templateId = selectedTemplate.id
      } else {
        payload.body = form.body.trim()
      }

      if (form.value) {
        const num = parseFloat(form.value.replace(',', '.'))
        if (!isNaN(num) && num > 0) payload.value = num
      }
      if (form.startDate) payload.startDate = toIso(form.startDate)
      if (form.endDate) payload.endDate = toIso(form.endDate)

      const res = await api.post<{ id: string }>('/contracts', payload)
      navigate(`/contracts/${res.data.id}`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSaveError(msg ?? 'Erro ao salvar contrato. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // ── Rendered preview HTML ───────────────────────────────────────────────────

  const previewHtml = selectedTemplate
    ? renderBody(selectedTemplate.body, form.fieldValues)
    : form.body

  // ── Render ──────────────────────────────────────────────────────────────────

  const stepLabels = ['Template', 'Campos', 'Preview', 'Confirmar']

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => (step === 1 ? navigate('/contracts') : setStep((s) => s - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary-600 hover:bg-secondary-100"
        >
          ←
        </button>
        <div>
          <h1 className="text-xl font-bold text-secondary-900">Novo contrato</h1>
          <p className="text-sm text-secondary-500">{stepLabels[step - 1]}</p>
        </div>
        <div className="ml-auto">
          <StepIndicator current={step} total={4} />
        </div>
      </div>

      {/* ── STEP 1: Template selection ────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {loadingTemplates ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {templates.length > 0 && (
                <div>
                  <p className="mb-3 text-sm font-medium text-secondary-700">
                    Escolha um template
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => chooseTemplate(t)}
                        className="flex items-start gap-4 rounded-xl border border-secondary-200 bg-white p-4 text-left transition-all hover:border-primary-400 hover:shadow-md"
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-secondary-900">{t.name}</p>
                          <p className="mt-0.5 text-xs text-secondary-500">
                            {t.category} · {t.fields.length} campo{t.fields.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative flex items-center py-2">
                <div className="flex-1 border-t border-secondary-200" />
                <span className="mx-4 text-xs text-secondary-400">ou</span>
                <div className="flex-1 border-t border-secondary-200" />
              </div>

              <button
                onClick={chooseScratch}
                className="flex w-full items-center gap-4 rounded-xl border-2 border-dashed border-secondary-300 bg-white p-4 text-left transition-all hover:border-primary-400 hover:bg-primary-50"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-secondary-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-secondary-900">Criar do zero</p>
                  <p className="mt-0.5 text-xs text-secondary-500">
                    Sem template — escreva o contrato manualmente
                  </p>
                </div>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── STEP 2: Fill fields ───────────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <div className="space-y-6">
            {selectedTemplate && (
              <div className="flex items-center gap-2 rounded-lg bg-primary-50 px-4 py-2.5">
                <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-sm font-medium text-primary-700">
                  Template: {selectedTemplate.name}
                </span>
              </div>
            )}

            {/* Campos básicos */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-secondary-400">
                Dados gerais
              </p>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Título do contrato"
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviços — ABC Ltda"
                  error={formErrors.title}
                  required
                />

                {fromScratch && (
                  <Input
                    label="Categoria"
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    placeholder="Ex: Serviço, Obra, Locação"
                    error={formErrors.category}
                    required
                  />
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="relative flex flex-col gap-1">
                    <label className="text-sm font-medium text-secondary-700">
                      Valor do contrato
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary-500">
                        R$
                      </span>
                      <input
                        type="text"
                        value={form.value}
                        onChange={(e) => setField('value', e.target.value)}
                        placeholder="0,00"
                        className="w-full rounded-lg border border-secondary-300 bg-white pl-9 pr-3 py-2 text-sm text-secondary-900 placeholder-secondary-400 hover:border-secondary-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <Input
                    label="Data de início"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setField('startDate', e.target.value)}
                  />
                  <Input
                    label="Data de fim"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setField('endDate', e.target.value)}
                  />
                </div>

                {fromScratch && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-secondary-700">
                      Conteúdo do contrato <span className="text-danger-500">*</span>
                    </label>
                    <textarea
                      rows={10}
                      value={form.body}
                      onChange={(e) => setField('body', e.target.value)}
                      placeholder="Escreva o conteúdo do contrato aqui. HTML é suportado."
                      className={[
                        'w-full rounded-lg border px-3 py-2 text-sm text-secondary-900 placeholder-secondary-400',
                        'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                        formErrors.body
                          ? 'border-danger-500 bg-danger-50'
                          : 'border-secondary-300 bg-white hover:border-secondary-400',
                      ].join(' ')}
                    />
                    {formErrors.body && (
                      <p className="text-xs text-danger-600">{formErrors.body}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Campos dinâmicos do template */}
            {selectedTemplate && selectedTemplate.fields.length > 0 && (
              <DynamicFieldBuilder
                fields={selectedTemplate.fields}
                values={form.fieldValues}
                errors={formErrors}
                onChange={setFieldValue}
              />
            )}

            <div className="flex justify-end">
              <Button onClick={goToPreview}>Ver preview →</Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── STEP 3: Preview ───────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-secondary-900">Preview do contrato</h2>
              <span className="text-xs text-secondary-400">
                {selectedTemplate ? selectedTemplate.name : 'Sem template'}
              </span>
            </div>
            <div
              className="min-h-48 rounded-lg border border-secondary-200 bg-secondary-50 p-6 text-sm leading-relaxed text-secondary-800"
              dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-secondary-400">Conteúdo não disponível para preview.</p>' }}
            />
          </Card>
          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>
              ← Editar campos
            </Button>
            <Button onClick={() => setStep(4)}>Confirmar →</Button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Confirm & save ────────────────────────────────────────────── */}
      {step === 4 && (
        <Card>
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-secondary-900">Confirmar contrato</h2>
              <p className="mt-1 text-sm text-secondary-500">
                Revise os dados abaixo antes de salvar como rascunho.
              </p>
            </div>

            <dl className="divide-y divide-secondary-100 rounded-lg border border-secondary-200">
              {[
                { label: 'Título', value: form.title },
                {
                  label: 'Categoria',
                  value: selectedTemplate ? selectedTemplate.category : form.category,
                },
                {
                  label: 'Template',
                  value: selectedTemplate ? selectedTemplate.name : 'Sem template',
                },
                { label: 'Valor', value: form.value ? `R$ ${form.value}` : '—' },
                { label: 'Data de início', value: form.startDate || '—' },
                { label: 'Data de fim', value: form.endDate || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-4 px-4 py-3">
                  <dt className="w-32 flex-shrink-0 text-xs font-medium text-secondary-500">
                    {label}
                  </dt>
                  <dd className="text-sm text-secondary-900">{value}</dd>
                </div>
              ))}
            </dl>

            {saveError && (
              <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
                {saveError}
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(3)}>
                ← Voltar ao preview
              </Button>
              <Button onClick={save} loading={saving}>
                Salvar como rascunho
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
