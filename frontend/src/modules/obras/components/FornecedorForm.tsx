import { useEffect, useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Card, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { FornecedoresTable, type Fornecedor } from './FornecedoresTable'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FornecedoresData {
  fornecedores: Fornecedor[]
  totalContratado: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskCnpj(v: string) {
  return v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function apiError(err: unknown): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    'Erro ao processar requisição.'
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nome: '',
  cnpj: '',
  contato: '',
  servicoPrestado: '',
  valorContratado: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FornecedorForm({ obraId }: { obraId: string }) {
  const [data, setData]       = useState<FornecedoresData | null>(null)
  const [loading, setLoading] = useState(true)

  // Save modal
  const [modalOpen, setModalOpen]     = useState(false)
  const [editTarget, setEditTarget]   = useState<Fornecedor | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError]     = useState('')

  // Delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<FornecedoresData>(`/obras/${obraId}/fornecedores`)
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

  function openEdit(f: Fornecedor) {
    setEditTarget(f)
    setForm({
      nome:            f.nome,
      cnpj:            f.cnpj,
      contato:         f.contato,
      servicoPrestado: f.servicoPrestado,
      valorContratado: parseFloat(String(f.valorContratado)).toFixed(2).replace('.', ','),
    })
    setSaveError('')
    setModalOpen(true)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const valor = parseFloat(form.valorContratado.replace(',', '.'))
    if (!form.nome.trim() || !form.servicoPrestado.trim() || isNaN(valor) || valor <= 0) {
      setSaveError('Preencha nome, serviço prestado e valor corretamente.')
      return
    }
    setSaveLoading(true)
    setSaveError('')
    try {
      const body = {
        nome:            form.nome.trim(),
        cnpj:            form.cnpj.trim(),
        contato:         form.contato.trim(),
        servicoPrestado: form.servicoPrestado.trim(),
        valorContratado: valor,
      }
      if (editTarget) {
        await api.put(`/obras/${obraId}/fornecedores/${editTarget.id}`, body)
      } else {
        await api.post(`/obras/${obraId}/fornecedores`, body)
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
    await api.delete(`/obras/${obraId}/fornecedores/${deleteId}`)
    setDeleteId(null)
    fetchData()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-500">
          {data.fornecedores.length === 0
            ? 'Nenhum fornecedor cadastrado.'
            : `${data.fornecedores.length} fornecedor${data.fornecedores.length > 1 ? 'es' : ''} cadastrado${data.fornecedores.length > 1 ? 's' : ''}`}
        </p>
        <Button size="sm" onClick={openAdd}>+ Novo fornecedor</Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <FornecedoresTable
          fornecedores={data.fornecedores}
          totalContratado={data.totalContratado}
          onEdit={openEdit}
          onDelete={(id) => setDeleteId(id)}
        />
      </Card>

      {/* Save modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar fornecedor' : 'Novo fornecedor'}
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
            label="Nome / Razão social"
            placeholder="Ex: Construtora Silva Ltda."
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            required
          />
          <Input
            label="CNPJ"
            placeholder="XX.XXX.XXX/XXXX-XX"
            value={form.cnpj}
            onChange={(e) => setForm((f) => ({ ...f, cnpj: maskCnpj(e.target.value) }))}
          />
          <Input
            label="Contato (telefone / e-mail)"
            placeholder="Ex: (11) 99999-9999"
            value={form.contato}
            onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))}
          />
          <Input
            label="Serviço prestado"
            placeholder="Ex: Alvenaria e estrutura"
            value={form.servicoPrestado}
            onChange={(e) => setForm((f) => ({ ...f, servicoPrestado: e.target.value }))}
            required
          />
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
        title="Remover fornecedor"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Remover</Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">Tem certeza que deseja remover este fornecedor?</p>
      </Modal>
    </div>
  )
}
