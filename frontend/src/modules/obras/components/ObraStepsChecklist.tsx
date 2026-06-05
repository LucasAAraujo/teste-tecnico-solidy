import { useEffect, useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Card, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'PLANNING' | 'EXECUTION' | 'DELIVERY'

interface Step {
  id: string
  phase: Phase
  title: string
  description: string | null
  done: boolean
  dueDate: string | null
  order: number
}

interface StepsData {
  grouped: Record<Phase, Step[]>
  total: number
  done: number
  pctConcluido: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASE_CFG: Record<Phase, { label: string; bg: string; text: string; bar: string }> = {
  PLANNING:  { label: 'Planejamento', bg: 'bg-blue-50',      text: 'text-blue-700',    bar: 'bg-blue-400'    },
  EXECUTION: { label: 'Execução',     bg: 'bg-warning-50',   text: 'text-warning-700', bar: 'bg-warning-400' },
  DELIVERY:  { label: 'Entrega',      bg: 'bg-success-50',   text: 'text-success-700', bar: 'bg-success-500' },
}

const PHASES: Phase[] = ['PLANNING', 'EXECUTION', 'DELIVERY']

// ─── Component ────────────────────────────────────────────────────────────────

export function ObraStepsChecklist({ obraId }: { obraId: string }) {
  const [data, setData] = useState<StepsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Add step modal
  const [addOpen, setAddOpen] = useState(false)
  const [addPhase, setAddPhase] = useState<Phase>('PLANNING')
  const [addTitle, setAddTitle] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addDue, setAddDue] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  // Edit step
  const [editTarget, setEditTarget] = useState<Step | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  // Delete step
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<StepsData>(`/obras/${obraId}/steps`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  // ── Toggle done ─────────────────────────────────────────────────────────────

  async function toggleStep(step: Step) {
    await api.patch(`/obras/${obraId}/steps/${step.id}`, { done: !step.done })
    fetch()
  }

  // ── Add step ────────────────────────────────────────────────────────────────

  function openAdd(phase: Phase) {
    setAddPhase(phase)
    setAddTitle('')
    setAddDesc('')
    setAddDue('')
    setAddError('')
    setAddOpen(true)
  }

  async function handleAdd() {
    if (!addTitle.trim()) { setAddError('Informe o título da etapa.'); return }
    setAddLoading(true)
    setAddError('')
    try {
      const body: Record<string, unknown> = { phase: addPhase, title: addTitle.trim() }
      if (addDesc.trim()) body.description = addDesc.trim()
      if (addDue) body.dueDate = new Date(addDue).toISOString()
      await api.post(`/obras/${obraId}/steps`, body)
      setAddOpen(false)
      fetch()
    } catch (err: unknown) {
      setAddError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao adicionar etapa.')
      setAddLoading(false)
    }
  }

  // ── Edit step ───────────────────────────────────────────────────────────────

  function openEdit(step: Step) {
    setEditTarget(step)
    setEditTitle(step.title)
    setEditDesc(step.description ?? '')
    setEditDue(step.dueDate ? step.dueDate.slice(0, 10) : '')
    setEditError('')
  }

  async function handleEdit() {
    if (!editTarget || !editTitle.trim()) { setEditError('Informe o título.'); return }
    setEditLoading(true)
    setEditError('')
    try {
      const body: Record<string, unknown> = { title: editTitle.trim() }
      body.description = editDesc.trim() || null
      body.dueDate = editDue ? new Date(editDue).toISOString() : null
      await api.patch(`/obras/${obraId}/steps/${editTarget.id}`, body)
      setEditTarget(null)
      fetch()
    } catch (err: unknown) {
      setEditError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao atualizar etapa.')
      setEditLoading(false)
    }
  }

  // ── Delete step ─────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return
    await api.delete(`/obras/${obraId}/steps/${deleteId}`)
    setDeleteId(null)
    fetch()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-5">
      {/* Global progress */}
      <div className="flex items-center gap-4 rounded-xl border border-secondary-200 bg-white px-5 py-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-secondary-700">Progresso total</span>
            <span className="text-sm font-bold text-primary-600">{data.pctConcluido}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-secondary-100">
            <div
              className="h-2.5 rounded-full bg-primary-500 transition-all duration-500"
              style={{ width: `${data.pctConcluido}%` }}
            />
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-bold text-secondary-900">{data.done}<span className="text-base font-normal text-secondary-400">/{data.total}</span></p>
          <p className="text-xs text-secondary-400">etapas concluídas</p>
        </div>
      </div>

      {/* Per-phase progress summary */}
      <div className="grid grid-cols-3 gap-3">
        {PHASES.map((phase) => {
          const steps = data.grouped[phase] ?? []
          const done  = steps.filter((s) => s.done).length
          const pct   = steps.length === 0 ? 0 : Math.round((done / steps.length) * 100)
          const cfg   = PHASE_CFG[phase]
          return (
            <div key={phase} className={`rounded-xl border border-secondary-200 ${cfg.bg} px-4 py-3`}>
              <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
              <p className="mt-1 text-lg font-bold text-secondary-900">{pct}%</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/60">
                <div className={`h-1.5 rounded-full ${cfg.bar} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-secondary-500">{done}/{steps.length}</p>
            </div>
          )
        })}
      </div>

      {/* Phases */}
      {PHASES.map((phase) => {
        const steps = data.grouped[phase] ?? []
        const done  = steps.filter((s) => s.done).length
        const cfg   = PHASE_CFG[phase]

        return (
          <Card key={phase} padding={false}>
            {/* Phase header */}
            <div className={`flex items-center justify-between border-b border-secondary-100 px-4 py-3 ${cfg.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                <span className="text-xs text-secondary-400">
                  {done}/{steps.length} concluídas
                </span>
              </div>
              <button
                onClick={() => openAdd(phase)}
                className={`text-xs font-medium ${cfg.text} hover:opacity-80 transition-opacity`}
              >
                + Adicionar etapa
              </button>
            </div>

            {steps.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <p className="text-sm text-secondary-400">Nenhuma etapa nesta fase.</p>
                <button
                  onClick={() => openAdd(phase)}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Adicionar primeira etapa →
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-secondary-50">
                {steps.map((step) => (
                  <li key={step.id} className={`group flex items-start gap-3 px-4 py-3 transition-colors ${step.done ? 'bg-secondary-50/50' : 'hover:bg-secondary-50'}`}>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleStep(step)}
                      className={[
                        'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all',
                        step.done
                          ? 'border-success-500 bg-success-500'
                          : 'border-secondary-300 hover:border-primary-400',
                      ].join(' ')}
                      title={step.done ? 'Marcar como pendente' : 'Marcar como concluída'}
                    >
                      {step.done && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${step.done ? 'line-through text-secondary-400' : 'text-secondary-900'}`}>
                        {step.title}
                      </p>
                      {step.description && (
                        <p className="mt-0.5 text-xs text-secondary-500 leading-relaxed">{step.description}</p>
                      )}
                    </div>

                    {/* Due date */}
                    {step.dueDate && (
                      <span className="flex-shrink-0 text-xs text-secondary-400 whitespace-nowrap">
                        {formatDate(step.dueDate)}
                      </span>
                    )}

                    {/* Actions (visible on hover) */}
                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(step)}
                        className="rounded p-1 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600"
                        title="Editar"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteId(step.id)}
                        className="rounded p-1 text-secondary-400 hover:bg-danger-50 hover:text-danger-500"
                        title="Remover"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )
      })}

      {/* Add step modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={`Nova etapa — ${PHASE_CFG[addPhase].label}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} loading={addLoading}>Adicionar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Fase</label>
            <select
              value={addPhase}
              onChange={(e) => setAddPhase(e.target.value as Phase)}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              {PHASES.map((p) => <option key={p} value={p}>{PHASE_CFG[p].label}</option>)}
            </select>
          </div>
          <Input
            label="Título"
            placeholder="Ex: Aprovação projeto arquitetônico"
            value={addTitle}
            onChange={(e) => { setAddTitle(e.target.value); setAddError('') }}
            required
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Descrição <span className="text-secondary-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={addDesc}
              onChange={(e) => setAddDesc(e.target.value)}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm placeholder-secondary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="Detalhes adicionais…"
            />
          </div>
          <Input
            label="Data prevista"
            type="date"
            value={addDue}
            onChange={(e) => setAddDue(e.target.value)}
          />
          {addError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {addError}
            </p>
          )}
        </div>
      </Modal>

      {/* Edit step modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Editar etapa"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={handleEdit} loading={editLoading}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Título"
            value={editTitle}
            onChange={(e) => { setEditTitle(e.target.value); setEditError('') }}
            required
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Descrição <span className="text-secondary-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm placeholder-secondary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
          <Input
            label="Data prevista"
            type="date"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
          />
          {editError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {editError}
            </p>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Remover etapa"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Remover</Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">Tem certeza que deseja remover esta etapa?</p>
      </Modal>
    </div>
  )
}
