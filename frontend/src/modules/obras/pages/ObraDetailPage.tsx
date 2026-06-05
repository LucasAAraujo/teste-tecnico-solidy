import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import { ObraStepsChecklist } from '../components/ObraStepsChecklist'
import { VistoriaForm } from '../components/VistoriaForm'

// ─── Types ────────────────────────────────────────────────────────────────────

type ObraStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type CostCategory = 'mao_de_obra' | 'material' | 'equipamento' | 'servico_terceiro' | 'outro'
type POStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED'

interface Obra {
  id: string; name: string; address: string; status: ObraStatus
  budget: string; orcamentoRealizado: string; pctOrcamento: number
  startDate: string | null; endDate: string | null; createdAt: string
  contract: { id: string; title: string } | null
}

interface Custo {
  id: string; category: CostCategory; description: string
  amount: string; date: string
}

interface CustosData {
  custos: Custo[]
  totaisPorCategoria: Record<CostCategory, string>
  totalRealizado: string
}

interface Fornecedor {
  id: string; nome: string; cnpj: string; contato: string
  servicoPrestado: string; valorContratado: string
}

interface FornecedoresData { fornecedores: Fornecedor[]; totalContratado: string }

interface Membro {
  id: string; nome: string; funcao: string; periodoInicio: string
  periodoFim: string | null; valorContratado: string
}

interface EquipeData {
  porFuncao: Record<string, { membros: Membro[]; subtotal: string }>
  totalContratado: string
}

interface PurchaseOrder {
  id: string; number: string; supplier: string; payerCnpj: string
  total: string; status: POStatus; issuedAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ObraStatus, { label: string; variant: 'default' | 'warning' | 'success' | 'danger'; dot: string }> = {
  PLANNING:    { label: 'Planejamento', variant: 'default',  dot: 'bg-blue-400'    },
  IN_PROGRESS: { label: 'Em execução',  variant: 'warning',  dot: 'bg-warning-400' },
  COMPLETED:   { label: 'Concluída',    variant: 'success',  dot: 'bg-success-400' },
  CANCELLED:   { label: 'Cancelada',    variant: 'danger',   dot: 'bg-secondary-400' },
}

const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  mao_de_obra:       'Mão de obra',
  material:          'Material',
  equipamento:       'Equipamento',
  servico_terceiro:  'Serviço terceiro',
  outro:             'Outro',
}

const COST_CATEGORIES: CostCategory[] = ['mao_de_obra', 'material', 'equipamento', 'servico_terceiro', 'outro']

const PO_STATUS_CFG: Record<POStatus, { label: string; variant: 'default' | 'success' | 'danger' }> = {
  DRAFT:     { label: 'Rascunho',  variant: 'default'  },
  APPROVED:  { label: 'Aprovada',  variant: 'success'  },
  CANCELLED: { label: 'Cancelada', variant: 'danger'   },
}

const TABS = [
  { key: 'roteiro',      label: 'Roteiro'          },
  { key: 'vistorias',    label: 'Vistorias'         },
  { key: 'custos',       label: 'Custos'            },
  { key: 'fornecedores', label: 'Fornecedores'      },
  { key: 'equipe',       label: 'Equipe'            },
  { key: 'oc',           label: 'Ordens de Compra'  },
] as const

type TabKey = (typeof TABS)[number]['key']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskCnpj(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function apiError(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro inesperado.'
}

// ─── Tab: Custos ──────────────────────────────────────────────────────────────

function CustosTab({ obraId, budget }: { obraId: string; budget: string }) {
  const [data, setData] = useState<CustosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ category: 'material' as CostCategory, description: '', amount: '', date: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<CustosData>(`/obras/${obraId}/custos`)
      setData(res.data)
    } finally { setLoading(false) }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  async function handleAdd() {
    const amount = parseFloat(addForm.amount.replace(',', '.'))
    if (!addForm.description.trim() || isNaN(amount) || amount <= 0 || !addForm.date) {
      setAddError('Preencha todos os campos corretamente.'); return
    }
    setAddLoading(true); setAddError('')
    try {
      await api.post(`/obras/${obraId}/custos`, {
        category: addForm.category,
        description: addForm.description.trim(),
        amount,
        date: new Date(addForm.date).toISOString(),
      })
      setAddOpen(false)
      fetch()
    } catch (err) { setAddError(apiError(err)); setAddLoading(false) }
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  if (!data) return null

  const previsto = parseFloat(String(budget))
  const realizado = parseFloat(String(data.totalRealizado))
  const pct = previsto > 0 ? Math.min((realizado / previsto) * 100, 100) : 0
  const barColor = pct >= 90 ? 'bg-danger-500' : pct >= 70 ? 'bg-warning-400' : 'bg-success-500'

  return (
    <div className="space-y-4">
      {/* Budget summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Previsto',   value: formatCurrency(budget),           color: 'text-secondary-900' },
          { label: 'Realizado',  value: formatCurrency(data.totalRealizado), color: pct >= 90 ? 'text-danger-600' : 'text-secondary-900' },
          { label: 'Saldo',      value: formatCurrency(String(previsto - realizado)), color: previsto - realizado < 0 ? 'text-danger-600' : 'text-success-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-secondary-200 bg-white p-4">
            <p className="text-xs text-secondary-500">{label}</p>
            <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-secondary-200 bg-white px-4 py-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-secondary-500">Consumido</span>
          <span className={`text-xs font-semibold ${pct >= 90 ? 'text-danger-600' : 'text-success-600'}`}>{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary-100">
          <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* By category */}
      <Card padding={false}>
        <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-secondary-700">Por categoria</h3>
          <Button size="sm" onClick={() => { setAddForm({ category: 'material', description: '', amount: '', date: '' }); setAddError(''); setAddOpen(true) }}>
            + Lançar custo
          </Button>
        </div>
        <div className="divide-y divide-secondary-50">
          {COST_CATEGORIES.map((cat) => {
            const val = parseFloat(String(data.totaisPorCategoria[cat] ?? 0))
            const catPct = previsto > 0 ? Math.min((val / previsto) * 100, 100) : 0
            return (
              <div key={cat} className="flex items-center gap-4 px-4 py-3">
                <span className="w-36 flex-shrink-0 text-sm text-secondary-700">{COST_CATEGORY_LABELS[cat]}</span>
                <div className="flex-1">
                  <div className="h-1.5 w-full rounded-full bg-secondary-100">
                    <div className="h-1.5 rounded-full bg-primary-400" style={{ width: `${catPct}%` }} />
                  </div>
                </div>
                <span className="w-24 flex-shrink-0 text-right text-sm font-medium text-secondary-900">{formatCurrency(String(val))}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Lancamentos table */}
      {data.custos.length > 0 && (
        <Card padding={false}>
          <div className="border-b border-secondary-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-secondary-700">Lançamentos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-secondary-50">
                  {['Data', 'Categoria', 'Descrição', 'Valor'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {data.custos.map((c) => (
                  <tr key={c.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-2 text-secondary-600 whitespace-nowrap">{formatDate(c.date)}</td>
                    <td className="px-4 py-2">
                      <Badge variant="default">{COST_CATEGORY_LABELS[c.category]}</Badge>
                    </td>
                    <td className="px-4 py-2 text-secondary-700">{c.description}</td>
                    <td className="px-4 py-2 font-medium text-secondary-900 whitespace-nowrap">{formatCurrency(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add custo modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Lançar custo" size="sm"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancelar</Button><Button onClick={handleAdd} loading={addLoading}>Lançar</Button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Categoria</label>
            <select value={addForm.category} onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value as CostCategory }))}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400">
              {COST_CATEGORIES.map((c) => <option key={c} value={c}>{COST_CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <Input label="Descrição" value={addForm.description} onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))} required />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Valor (R$) <span className="text-danger-500">*</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-secondary-500">R$</span>
              <input type="text" inputMode="decimal" placeholder="0,00" value={addForm.amount}
                onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-secondary-200 pl-9 pr-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400" />
            </div>
          </div>
          <Input label="Data" type="date" value={addForm.date} onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))} required />
          {addError && <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">{addError}</p>}
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab: Fornecedores ────────────────────────────────────────────────────────

const EMPTY_FORN = { nome: '', cnpj: '', contato: '', servicoPrestado: '', valorContratado: '' }

function FornecedoresTab({ obraId }: { obraId: string }) {
  const [data, setData] = useState<FornecedoresData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Fornecedor | null>(null)
  const [form, setForm] = useState(EMPTY_FORN)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<FornecedoresData>(`/obras/${obraId}/fornecedores`)
      setData(res.data)
    } finally { setLoading(false) }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  function openAdd() {
    setEditTarget(null); setForm(EMPTY_FORN); setSaveError(''); setModalOpen(true)
  }
  function openEdit(f: Fornecedor) {
    setEditTarget(f)
    setForm({ nome: f.nome, cnpj: f.cnpj, contato: f.contato, servicoPrestado: f.servicoPrestado, valorContratado: String(parseFloat(f.valorContratado)) })
    setSaveError(''); setModalOpen(true)
  }

  async function handleSave() {
    const val = parseFloat(form.valorContratado.replace(',', '.'))
    if (!form.nome.trim() || !form.cnpj || !form.contato.trim() || !form.servicoPrestado.trim() || isNaN(val) || val <= 0) {
      setSaveError('Preencha todos os campos.'); return
    }
    setSaveLoading(true); setSaveError('')
    try {
      const body = { nome: form.nome.trim(), cnpj: form.cnpj, contato: form.contato.trim(), servicoPrestado: form.servicoPrestado.trim(), valorContratado: val }
      if (editTarget) await api.put(`/obras/${obraId}/fornecedores/${editTarget.id}`, body)
      else await api.post(`/obras/${obraId}/fornecedores`, body)
      setModalOpen(false); fetch()
    } catch (err) { setSaveError(apiError(err)); setSaveLoading(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await api.delete(`/obras/${obraId}/fornecedores/${deleteId}`)
    setDeleteId(null); fetch()
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  if (!data) return null

  return (
    <div className="space-y-4">
      <Card padding={false}>
        <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-secondary-700">Fornecedores</h3>
            {data.fornecedores.length > 0 && (
              <p className="text-xs text-secondary-400 mt-0.5">Total contratado: {formatCurrency(data.totalContratado)}</p>
            )}
          </div>
          <Button size="sm" onClick={openAdd}>+ Adicionar</Button>
        </div>
        {data.fornecedores.length === 0 ? (
          <p className="py-12 text-center text-sm text-secondary-400">Nenhum fornecedor cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-secondary-50">
                  {['Fornecedor', 'CNPJ', 'Contato', 'Serviço', 'Valor Contratado', ''].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {data.fornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-medium text-secondary-900">{f.nome}</td>
                    <td className="px-4 py-3 text-secondary-600 font-mono text-xs">{f.cnpj}</td>
                    <td className="px-4 py-3 text-secondary-600">{f.contato}</td>
                    <td className="px-4 py-3 text-secondary-600">{f.servicoPrestado}</td>
                    <td className="px-4 py-3 font-medium text-secondary-900">{formatCurrency(f.valorContratado)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(f)} className="text-xs font-medium text-secondary-600 hover:text-secondary-900">Editar</button>
                        <button onClick={() => setDeleteId(f.id)} className="text-xs font-medium text-danger-500 hover:text-danger-700">Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-secondary-200 bg-secondary-50">
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-secondary-500 uppercase tracking-wider">Total</td>
                  <td className="px-4 py-2 font-bold text-secondary-900">{formatCurrency(data.totalContratado)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Save modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Editar fornecedor' : 'Novo fornecedor'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} loading={saveLoading}>{editTarget ? 'Salvar' : 'Adicionar'}</Button></>}
      >
        <div className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          <Input label="CNPJ" placeholder="00.000.000/0001-00" value={form.cnpj}
            onChange={(e) => setForm((f) => ({ ...f, cnpj: maskCnpj(e.target.value) }))} required />
          <Input label="Contato" placeholder="(11) 99999-9999 ou e-mail" value={form.contato} onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))} required />
          <Input label="Serviço prestado" value={form.servicoPrestado} onChange={(e) => setForm((f) => ({ ...f, servicoPrestado: e.target.value }))} required />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Valor contratado (R$) <span className="text-danger-500">*</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-secondary-500">R$</span>
              <input type="text" inputMode="decimal" placeholder="0,00" value={form.valorContratado}
                onChange={(e) => setForm((f) => ({ ...f, valorContratado: e.target.value }))}
                className="w-full rounded-lg border border-secondary-200 pl-9 pr-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400" />
            </div>
          </div>
          {saveError && <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">{saveError}</p>}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remover fornecedor" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button><Button variant="danger" onClick={handleDelete}>Remover</Button></>}
      >
        <p className="text-sm text-secondary-700">Tem certeza que deseja remover este fornecedor?</p>
      </Modal>
    </div>
  )
}

// ─── Tab: Equipe ──────────────────────────────────────────────────────────────

const EMPTY_MEMBRO = { nome: '', funcao: '', periodoInicio: '', periodoFim: '', valorContratado: '' }
const FUNCAO_OPTIONS = ['Pedreiro', 'Eletricista', 'Encanador', 'Engenheiro', 'Supervisor', 'Mestre de obras', 'Ajudante', 'Pintor', 'Arquiteto', 'Outro']

function EquipeTab({ obraId }: { obraId: string }) {
  const [data, setData] = useState<EquipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Membro | null>(null)
  const [form, setForm] = useState(EMPTY_MEMBRO)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<EquipeData>(`/obras/${obraId}/equipe`)
      setData(res.data)
    } finally { setLoading(false) }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  function openAdd() {
    setEditTarget(null); setForm(EMPTY_MEMBRO); setSaveError(''); setModalOpen(true)
  }
  function openEdit(m: Membro) {
    setEditTarget(m)
    setForm({
      nome: m.nome, funcao: m.funcao,
      periodoInicio: m.periodoInicio.slice(0, 10),
      periodoFim: m.periodoFim ? m.periodoFim.slice(0, 10) : '',
      valorContratado: String(parseFloat(m.valorContratado)),
    })
    setSaveError(''); setModalOpen(true)
  }

  async function handleSave() {
    const val = parseFloat(form.valorContratado.replace(',', '.'))
    if (!form.nome.trim() || !form.funcao.trim() || !form.periodoInicio || isNaN(val) || val <= 0) {
      setSaveError('Preencha todos os campos obrigatórios.'); return
    }
    setSaveLoading(true); setSaveError('')
    try {
      const body: Record<string, unknown> = {
        nome: form.nome.trim(), funcao: form.funcao.trim(),
        periodoInicio: new Date(form.periodoInicio).toISOString(),
        valorContratado: val,
      }
      if (form.periodoFim) body.periodoFim = new Date(form.periodoFim).toISOString()
      if (editTarget) await api.put(`/obras/${obraId}/equipe/${editTarget.id}`, body)
      else await api.post(`/obras/${obraId}/equipe`, body)
      setModalOpen(false); fetch()
    } catch (err) { setSaveError(apiError(err)); setSaveLoading(false) }
  }

  async function handleDelete() {
    if (!deleteId) return
    await api.delete(`/obras/${obraId}/equipe/${deleteId}`)
    setDeleteId(null); fetch()
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  if (!data) return null

  const groups = Object.entries(data.porFuncao)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-500">
          Total contratado equipe: <strong className="text-secondary-900">{formatCurrency(data.totalContratado)}</strong>
        </p>
        <Button size="sm" onClick={openAdd}>+ Adicionar membro</Button>
      </div>

      {groups.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm text-secondary-400">Nenhum membro cadastrado.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(([funcao, { membros, subtotal }]) => (
            <Card key={funcao} padding={false}>
              <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
                <span className="text-sm font-semibold text-secondary-800">{funcao}</span>
                <span className="text-xs text-secondary-500">{formatCurrency(subtotal)} · {membros.length} membro{membros.length !== 1 ? 's' : ''}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-secondary-50">
                  {membros.map((m) => (
                    <tr key={m.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-2 font-medium text-secondary-900">{m.nome}</td>
                      <td className="px-4 py-2 text-xs text-secondary-500">
                        {formatDate(m.periodoInicio)} — {m.periodoFim ? formatDate(m.periodoFim) : 'em andamento'}
                      </td>
                      <td className="px-4 py-2 font-medium text-secondary-900">{formatCurrency(m.valorContratado)}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(m)} className="text-xs font-medium text-secondary-600 hover:text-secondary-900">Editar</button>
                          <button onClick={() => setDeleteId(m.id)} className="text-xs font-medium text-danger-500 hover:text-danger-700">Remover</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}

      {/* Save modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? 'Editar membro' : 'Novo membro'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} loading={saveLoading}>{editTarget ? 'Salvar' : 'Adicionar'}</Button></>}
      >
        <div className="space-y-4">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Função <span className="text-danger-500">*</span></label>
            <input list="funcao-opts" value={form.funcao} onChange={(e) => setForm((f) => ({ ...f, funcao: e.target.value }))}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="Pedreiro, Eletricista…" />
            <datalist id="funcao-opts">{FUNCAO_OPTIONS.map((o) => <option key={o} value={o} />)}</datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Período início" type="date" value={form.periodoInicio} onChange={(e) => setForm((f) => ({ ...f, periodoInicio: e.target.value }))} required />
            <Input label="Período fim" type="date" value={form.periodoFim} onChange={(e) => setForm((f) => ({ ...f, periodoFim: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Valor contratado (R$) <span className="text-danger-500">*</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-secondary-500">R$</span>
              <input type="text" inputMode="decimal" placeholder="0,00" value={form.valorContratado}
                onChange={(e) => setForm((f) => ({ ...f, valorContratado: e.target.value }))}
                className="w-full rounded-lg border border-secondary-200 pl-9 pr-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400" />
            </div>
          </div>
          {saveError && <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">{saveError}</p>}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remover membro" size="sm"
        footer={<><Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button><Button variant="danger" onClick={handleDelete}>Remover</Button></>}
      >
        <p className="text-sm text-secondary-700">Tem certeza que deseja remover este membro da equipe?</p>
      </Modal>
    </div>
  )
}

// ─── Tab: Ordens de Compra ────────────────────────────────────────────────────

function OCTab({ obraId }: { obraId: string }) {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: PurchaseOrder[] }>(`/obras/${obraId}/purchase-orders`)
      setOrders(res.data.data)
    } finally { setLoading(false) }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-500">{orders.length} ordem{orders.length !== 1 ? 's' : ''} de compra</p>
        <Button size="sm" onClick={() => navigate('/purchase-orders')}>Gerenciar O.C. →</Button>
      </div>
      {orders.length === 0 ? (
        <Card>
          <p className="py-12 text-center text-sm text-secondary-400">Nenhuma ordem de compra emitida para esta obra.</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-100 bg-secondary-50">
                  {['Número', 'Fornecedor', 'CNPJ Pagador', 'Total', 'Status', 'Data'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {orders.map((po) => {
                  const cfg = PO_STATUS_CFG[po.status]
                  return (
                    <tr key={po.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-secondary-900">{po.number}</td>
                      <td className="px-4 py-3 text-secondary-700">{po.supplier}</td>
                      <td className="px-4 py-3 font-mono text-xs text-secondary-600">{po.payerCnpj}</td>
                      <td className="px-4 py-3 font-medium text-secondary-900">{formatCurrency(po.total)}</td>
                      <td className="px-4 py-3"><Badge variant={cfg.variant}>{cfg.label}</Badge></td>
                      <td className="px-4 py-3 text-secondary-500 text-xs">{formatDate(po.issuedAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ObraDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [obra, setObra] = useState<Obra | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('roteiro')

  // Status change modal
  const [statusOpen, setStatusOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<ObraStatus>('PLANNING')
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<Obra>(`/obras/${id}`)
      .then((res) => { setObra(res.data); setNewStatus(res.data.status) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function handleStatusChange() {
    if (!id) return
    setStatusLoading(true)
    try {
      const res = await api.put<Obra>(`/obras/${id}`, { status: newStatus })
      setObra(res.data)
      setStatusOpen(false)
    } finally { setStatusLoading(false) }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>
  if (notFound || !obra) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <p className="text-secondary-500">Obra não encontrada.</p>
      <Button variant="secondary" onClick={() => navigate('/obras')}>← Voltar</Button>
    </div>
  )

  const statusCfg = STATUS_CFG[obra.status]
  const pct = obra.pctOrcamento
  const barColor = pct >= 90 ? 'bg-danger-500' : pct >= 70 ? 'bg-warning-400' : 'bg-success-500'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button onClick={() => navigate('/obras')}
          className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-secondary-600 hover:bg-secondary-100">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-secondary-900">{obra.name}</h1>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
            </span>
          </div>
          <p className="mt-1 text-sm text-secondary-500">{obra.address}</p>
          {obra.contract && (
            <button onClick={() => navigate(`/contracts/${obra.contract!.id}`)}
              className="mt-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline">
              Contrato: {obra.contract.title}
            </button>
          )}
        </div>
        <Button size="sm" variant="secondary" onClick={() => { setNewStatus(obra.status); setStatusOpen(true) }}>
          Alterar status
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500">Orçamento previsto</p>
          <p className="mt-1 text-base font-bold text-secondary-900">{formatCurrency(obra.budget)}</p>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500">Realizado</p>
          <p className={`mt-1 text-base font-bold ${pct >= 90 ? 'text-danger-600' : 'text-secondary-900'}`}>
            {formatCurrency(obra.orcamentoRealizado)}
          </p>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500">Saldo</p>
          <p className={`mt-1 text-base font-bold ${(parseFloat(obra.budget) - parseFloat(obra.orcamentoRealizado)) < 0 ? 'text-danger-600' : 'text-success-600'}`}>
            {formatCurrency(String(parseFloat(obra.budget) - parseFloat(obra.orcamentoRealizado)))}
          </p>
        </div>
        <div className="rounded-xl border border-secondary-200 bg-white p-4">
          <p className="text-xs text-secondary-500 mb-1">Consumido</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-secondary-100">
              <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <span className={`text-xs font-bold flex-shrink-0 ${pct >= 90 ? 'text-danger-600' : 'text-secondary-700'}`}>{pct.toFixed(0)}%</span>
          </div>
          <p className="mt-1 text-xs text-secondary-400">
            {formatDate(obra.startDate)} — {formatDate(obra.endDate)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-secondary-200 gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {activeTab === 'roteiro'      && <ObraStepsChecklist obraId={obra.id} />}
          {activeTab === 'vistorias'    && <VistoriaForm    obraId={obra.id} />}
          {activeTab === 'custos'       && <CustosTab       obraId={obra.id} budget={obra.budget} />}
          {activeTab === 'fornecedores' && <FornecedoresTab obraId={obra.id} />}
          {activeTab === 'equipe'       && <EquipeTab       obraId={obra.id} />}
          {activeTab === 'oc'           && <OCTab           obraId={obra.id} />}
        </div>
      </div>

      {/* Status modal */}
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Alterar status da obra" size="sm"
        footer={<><Button variant="secondary" onClick={() => setStatusOpen(false)}>Cancelar</Button><Button onClick={handleStatusChange} loading={statusLoading}>Confirmar</Button></>}
      >
        <div className="space-y-3">
          {(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as ObraStatus[]).map((s) => (
            <label key={s} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors ${newStatus === s ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'}`}>
              <input type="radio" name="status" value={s} checked={newStatus === s} onChange={() => setNewStatus(s)} className="hidden" />
              <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${STATUS_CFG[s].dot}`} />
              <span className="text-sm font-medium text-secondary-800">{STATUS_CFG[s].label}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  )
}
