import { useEffect, useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Card, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { EquipeTable, type Membro } from './EquipeTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EquipeData {
  porFuncao: Record<string, { membros: Membro[]; subtotal: string }>
  totalContratado: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNCAO_OPTIONS = [
  'Pedreiro',
  'Eletricista',
  'Encanador',
  'Engenheiro',
  'Supervisor',
  'Mestre de obras',
  'Ajudante',
  'Pintor',
  'Arquiteto',
  'Outro',
]

const EMPTY_FORM = {
  nome: '',
  funcao: '',
  periodoInicio: '',
  periodoFim: '',
  valorContratado: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiError(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'Erro ao processar requisição.'
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EquipeMembroForm({ obraId }: { obraId: string }) {
  const [data, setData]       = useState<EquipeData | null>(null)
  const [loading, setLoading] = useState(true)

  // Save modal
  const [modalOpen, setModalOpen]     = useState(false)
  const [editTarget, setEditTarget]   = useState<Membro | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError]     = useState('')

  // Delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<EquipeData>(`/obras/${obraId}/equipe`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [obraId])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Open modals ─────────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setModalOpen(true)
  }

  function openEdit(m: Membro) {
    setEditTarget(m)
    setForm({
      nome:            m.nome,
      funcao:          m.funcao,
      periodoInicio:   m.periodoInicio.slice(0, 10),
      periodoFim:      m.periodoFim ? m.periodoFim.slice(0, 10) : '',
      valorContratado: parseFloat(String(m.valorContratado)).toFixed(2).replace('.', ','),
    })
    setSaveError('')
    setModalOpen(true)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const valor = parseFloat(form.valorContratado.replace(',', '.'))
    if (!form.nome.trim() || !form.funcao.trim() || !form.periodoInicio || isNaN(valor) || valor <= 0) {
      setSaveError('Preencha nome, função, período de início e valor corretamente.')
      return
    }
    setSaveLoading(true)
    setSaveError('')
    try {
      const body: Record<string, unknown> = {
        nome:           form.nome.trim(),
        funcao:         form.funcao.trim(),
        periodoInicio:  new Date(form.periodoInicio).toISOString(),
        valorContratado: valor,
      }
      if (form.periodoFim) body.periodoFim = new Date(form.periodoFim).toISOString()

      if (editTarget) {
        await api.put(`/obras/${obraId}/equipe/${editTarget.id}`, body)
      } else {
        await api.post(`/obras/${obraId}/equipe`, body)
      }
      setModalOpen(false)
      fetchData()
    } catch (err) {
      setSaveError(apiError(err))
      setSaveLoading(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return
    await api.delete(`/obras/${obraId}/equipe/${deleteId}`)
    setDeleteId(null)
    fetchData()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  }

  if (!data) return null

  const totalMembros = Object.values(data.porFuncao).reduce(
    (sum, { membros }) => sum + membros.length,
    0
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-500">
          {totalMembros === 0
            ? 'Nenhum membro cadastrado.'
            : `${totalMembros} membro${totalMembros > 1 ? 's' : ''} em ${Object.keys(data.porFuncao).length} função${Object.keys(data.porFuncao).length > 1 ? 'ões' : ''}`}
        </p>
        <Button size="sm" onClick={openAdd}>+ Novo membro</Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <EquipeTable
          porFuncao={data.porFuncao}
          totalContratado={data.totalContratado}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
        />
      </Card>

      {/* Save modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar membro' : 'Novo membro da equipe'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saveLoading}>
              {editTarget ? 'Salvar' : 'Adicionar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome completo"
            placeholder="Ex: João da Silva"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            required
          />

          {/* Função com datalist */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Função <span className="text-danger-500">*</span>
            </label>
            <input
              list="funcao-opts"
              value={form.funcao}
              onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value }))}
              placeholder="Selecione ou digite a função"
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
            <datalist id="funcao-opts">
              {FUNCAO_OPTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Período início"
              type="date"
              value={form.periodoInicio}
              onChange={(e) => setForm((f) => ({ ...f, periodoInicio: e.target.value }))}
              required
            />
            <Input
              label="Período fim"
              type="date"
              value={form.periodoFim}
              onChange={(e) => setForm((f) => ({ ...f, periodoFim: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Valor contratado (R$) <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-secondary-500">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.valorContratado}
                onChange={(e) => { setForm((f) => ({ ...f, valorContratado: e.target.value })); setSaveError('') }}
                className="w-full rounded-lg border border-secondary-200 pl-9 pr-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
          </div>

          {saveError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {saveError}
            </p>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Remover membro"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Remover</Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">Tem certeza que deseja remover este membro da equipe?</p>
      </Modal>
    </div>
  )
}
