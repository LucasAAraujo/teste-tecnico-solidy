import { useEffect, useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Card, Badge, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { formatCurrency, formatDate } from '@/shared/lib/format'
import { ObraBudgetChart } from './ObraBudgetChart'

// ─── Types ────────────────────────────────────────────────────────────────────

type CostCategory = 'mao_de_obra' | 'material' | 'equipamento' | 'servico_terceiro' | 'outro'

interface Custo {
  id: string
  category: CostCategory
  description: string
  amount: string
  date: string
}

interface CustosData {
  custos: Custo[]
  totaisPorCategoria: Record<CostCategory, string>
  totalRealizado: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: CostCategory[] = ['mao_de_obra', 'material', 'equipamento', 'servico_terceiro', 'outro']

const CATEGORY_LABELS: Record<CostCategory, string> = {
  mao_de_obra:      'Mão de obra',
  material:         'Material',
  equipamento:      'Equipamento',
  servico_terceiro: 'Serviço terceiro',
  outro:            'Outro',
}

const EMPTY_FORM = { category: 'material' as CostCategory, description: '', amount: '', date: '' }

// ─── Component ────────────────────────────────────────────────────────────────

export function CustoForm({ obraId, budget }: { obraId: string; budget: string }) {
  const [data, setData]       = useState<CustosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState<'chart' | 'list'>('chart')

  // Create / edit
  const [modalOpen, setModalOpen]     = useState(false)
  const [editTarget, setEditTarget]   = useState<Custo | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError]     = useState('')

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<CustosData>(`/obras/${obraId}/custos`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  // ── Open modals ─────────────────────────────────────────────────────────────

  function openAdd() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    setModalOpen(true)
  }

  function openEdit(c: Custo) {
    setEditTarget(c)
    setForm({
      category: c.category,
      description: c.description,
      amount: parseFloat(String(c.amount)).toFixed(2).replace('.', ','),
      date: c.date.slice(0, 10),
    })
    setSaveError('')
    setModalOpen(true)
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.description.trim() || isNaN(amount) || amount <= 0 || !form.date) {
      setSaveError('Preencha todos os campos corretamente.')
      return
    }
    setSaveLoading(true)
    setSaveError('')
    try {
      const body = {
        category: form.category,
        description: form.description.trim(),
        amount,
        date: new Date(form.date).toISOString(),
      }
      if (editTarget) {
        await api.put(`/obras/${obraId}/custos/${editTarget.id}`, body)
      } else {
        await api.post(`/obras/${obraId}/custos`, body)
      }
      setModalOpen(false)
      fetch()
    } catch (err: unknown) {
      setSaveError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao salvar.'
      )
      setSaveLoading(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return
    await api.delete(`/obras/${obraId}/custos/${deleteId}`)
    setDeleteId(null)
    fetch()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-secondary-200 bg-white overflow-hidden">
          {(['chart', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={[
                'px-3 py-1.5 text-xs font-medium transition-colors',
                view === v
                  ? 'bg-primary-600 text-white'
                  : 'text-secondary-600 hover:bg-secondary-50',
              ].join(' ')}
            >
              {v === 'chart' ? 'Gráfico' : `Lançamentos (${data.custos.length})`}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={openAdd}>+ Lançar custo</Button>
      </div>

      {/* Chart view */}
      {view === 'chart' && (
        <ObraBudgetChart
          budget={budget}
          totalRealizado={data.totalRealizado}
          totaisPorCategoria={data.totaisPorCategoria}
        />
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Totals by category */}
          <Card padding={false}>
            <div className="border-b border-secondary-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-secondary-700">Totais por categoria</h3>
            </div>
            <div className="divide-y divide-secondary-50">
              {CATEGORIES.map((cat) => {
                const val = parseFloat(String(data.totaisPorCategoria[cat] ?? 0))
                const previsto = parseFloat(String(budget))
                const pct = previsto > 0 ? Math.min((val / previsto) * 100, 100) : 0
                if (val === 0) return null
                return (
                  <div key={cat} className="flex items-center gap-4 px-4 py-3">
                    <span className="w-36 flex-shrink-0 text-sm text-secondary-700">{CATEGORY_LABELS[cat]}</span>
                    <div className="flex-1">
                      <div className="h-1.5 w-full rounded-full bg-secondary-100">
                        <div className="h-1.5 rounded-full bg-primary-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="w-32 flex-shrink-0 text-right text-sm font-medium text-secondary-900">
                      {formatCurrency(String(val))}
                    </span>
                    <span className="w-16 flex-shrink-0 text-right text-xs text-secondary-400">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between px-4 py-3 bg-secondary-50">
                <span className="text-sm font-semibold text-secondary-700">Total realizado</span>
                <span className="text-sm font-bold text-secondary-900">
                  {formatCurrency(data.totalRealizado)}
                </span>
              </div>
            </div>
          </Card>

          {/* Transactions table */}
          {data.custos.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <p className="text-sm text-secondary-400">Nenhum lançamento registrado.</p>
                <button
                  onClick={openAdd}
                  className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Registrar primeiro custo →
                </button>
              </div>
            </Card>
          ) : (
            <Card padding={false}>
              <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-secondary-700">
                  Lançamentos <span className="text-secondary-400 font-normal">({data.custos.length})</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-secondary-100 bg-secondary-50">
                      {['Data', 'Categoria', 'Descrição', 'Valor', ''].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {data.custos.map((c) => (
                      <tr key={c.id} className="group hover:bg-secondary-50">
                        <td className="px-4 py-2.5 text-secondary-600 whitespace-nowrap text-xs">
                          {formatDate(c.date)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant="default">{CATEGORY_LABELS[c.category]}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-secondary-700 max-w-xs truncate">{c.description}</td>
                        <td className="px-4 py-2.5 font-semibold text-secondary-900 whitespace-nowrap">
                          {formatCurrency(c.amount)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(c)}
                              className="text-xs font-medium text-secondary-500 hover:text-secondary-800"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setDeleteId(c.id)}
                              className="text-xs font-medium text-danger-500 hover:text-danger-700"
                            >
                              Remover
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-secondary-200 bg-secondary-50">
                      <td colSpan={3} className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-secondary-500">
                        Total
                      </td>
                      <td className="px-4 py-2 font-bold text-secondary-900">
                        {formatCurrency(data.totalRealizado)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Save modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar lançamento' : 'Lançar custo'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saveLoading}>
              {editTarget ? 'Salvar' : 'Lançar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CostCategory }))}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <Input
            label="Descrição"
            placeholder="Ex: Compra de cimento e areia"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
          />
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Valor (R$) <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-secondary-500">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => { setForm((f) => ({ ...f, amount: e.target.value })); setSaveError('') }}
                className="w-full rounded-lg border border-secondary-200 pl-9 pr-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              />
            </div>
          </div>
          <Input
            label="Data"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            required
          />
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
        title="Remover lançamento"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Remover</Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">Tem certeza que deseja remover este lançamento?</p>
      </Modal>
    </div>
  )
}
