import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { Button, Modal, Input } from '@/shared/components/ui'
import { formatCurrency } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

interface POItem {
  description: string
  qty: string
  unit: string
  unitPrice: string
}

interface ObraOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultObraId?: string
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

function parseNum(v: string) {
  return parseFloat(v.replace(',', '.')) || 0
}

function itemSubtotal(item: POItem) {
  return parseNum(item.qty) * parseNum(item.unitPrice)
}

const EMPTY_ITEM: POItem = { description: '', qty: '1', unit: 'un', unitPrice: '' }

// ─── Component ────────────────────────────────────────────────────────────────

export function PurchaseOrderForm({ open, onClose, onSaved, defaultObraId }: Props) {
  const [obras, setObras]       = useState<ObraOption[]>([])
  const [obraId, setObraId]     = useState(defaultObraId ?? '')
  const [payerCnpj, setPayerCnpj] = useState('')
  const [supplier, setSupplier] = useState('')
  const [items, setItems]       = useState<POItem[]>([{ ...EMPTY_ITEM }])
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError]     = useState('')

  // Fetch obras for the selector
  useEffect(() => {
    if (!open) return
    api.get<{ data: ObraOption[] }>('/obras?limit=100')
      .then((res) => setObras(res.data.data))
      .catch(() => {})
  }, [open])

  // Reset when opening
  useEffect(() => {
    if (open) {
      setObraId(defaultObraId ?? '')
      setPayerCnpj('')
      setSupplier('')
      setItems([{ ...EMPTY_ITEM }])
      setSaveError('')
    }
  }, [open, defaultObraId])

  const total = items.reduce((sum, it) => sum + itemSubtotal(it), 0)

  // ── Item helpers ────────────────────────────────────────────────────────────

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof POItem, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    )
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!obraId) { setSaveError('Selecione a obra.'); return }
    if (!supplier.trim()) { setSaveError('Informe o fornecedor.'); return }
    if (!payerCnpj.trim()) { setSaveError('Informe o CNPJ pagador.'); return }
    const validItems = items.filter((it) => it.description.trim() && parseNum(it.qty) > 0 && parseNum(it.unitPrice) > 0)
    if (validItems.length === 0) { setSaveError('Adicione ao menos um item válido.'); return }

    setSaveLoading(true)
    setSaveError('')
    try {
      const body = {
        payerCnpj: payerCnpj.trim(),
        supplier:  supplier.trim(),
        items:     validItems.map((it) => ({
          description: it.description.trim(),
          qty:         parseNum(it.qty),
          unit:        it.unit.trim() || 'un',
          unitPrice:   parseNum(it.unitPrice),
        })),
        total,
      }
      await api.post(`/obras/${obraId}/purchase-orders`, body)
      onSaved()
      onClose()
    } catch (err: unknown) {
      setSaveError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao emitir ordem de compra.'
      )
      setSaveLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova Ordem de Compra"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} loading={saveLoading}>Emitir O.C.</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Obra */}
        {!defaultObraId && (
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Obra <span className="text-danger-500">*</span>
            </label>
            <select
              value={obraId}
              onChange={(e) => setObraId(e.target.value)}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              <option value="">Selecione a obra…</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Fornecedor */}
          <Input
            label="Fornecedor"
            placeholder="Razão social ou nome"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            required
          />

          {/* CNPJ Pagador */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              CNPJ Pagador <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              placeholder="XX.XXX.XXX/XXXX-XX"
              value={payerCnpj}
              onChange={(e) => setPayerCnpj(maskCnpj(e.target.value))}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
            />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-secondary-700">
              Itens <span className="text-danger-500">*</span>
            </label>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              + Adicionar item
            </button>
          </div>

          <div className="rounded-lg border border-secondary-200 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_5rem_5rem_7rem_2rem] gap-px bg-secondary-100 border-b border-secondary-200">
              {['Descrição', 'Qtd', 'Unid.', 'Preço unit.', ''].map((h) => (
                <div key={h} className="bg-secondary-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-secondary-500">
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-secondary-100">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_5rem_5rem_7rem_2rem] gap-px bg-secondary-100">
                  {/* Description */}
                  <div className="bg-white px-2 py-1.5">
                    <input
                      type="text"
                      placeholder="Ex: Cimento CP-II 50kg"
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="w-full text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none"
                    />
                  </div>
                  {/* Qty */}
                  <div className="bg-white px-2 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.qty}
                      onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                      className="w-full text-sm text-right text-secondary-900 focus:outline-none"
                    />
                  </div>
                  {/* Unit */}
                  <div className="bg-white px-2 py-1.5">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                      placeholder="un"
                      className="w-full text-sm text-center text-secondary-600 placeholder-secondary-300 focus:outline-none"
                    />
                  </div>
                  {/* Unit price */}
                  <div className="bg-white px-2 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      className="w-full text-sm text-right text-secondary-900 placeholder-secondary-300 focus:outline-none"
                    />
                  </div>
                  {/* Remove */}
                  <div className="bg-white flex items-center justify-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-secondary-300 hover:text-danger-500 transition-colors"
                        title="Remover item"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotals + total */}
            <div className="border-t border-secondary-200 bg-secondary-50">
              {items.map((item, idx) => {
                const sub = itemSubtotal(item)
                if (sub === 0) return null
                return (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 text-xs text-secondary-500 border-b border-secondary-100 last:border-0">
                    <span className="truncate max-w-xs">{item.description || `Item ${idx + 1}`}</span>
                    <span className="font-medium text-secondary-700 whitespace-nowrap ml-4">
                      {parseNum(item.qty)} × {formatCurrency(String(parseNum(item.unitPrice)))} = {formatCurrency(String(sub))}
                    </span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between px-3 py-2 border-t border-secondary-200 bg-white">
                <span className="text-sm font-semibold text-secondary-700">Total</span>
                <span className="text-base font-bold text-secondary-900">{formatCurrency(String(total))}</span>
              </div>
            </div>
          </div>
        </div>

        {saveError && (
          <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
            {saveError}
          </p>
        )}
      </div>
    </Modal>
  )
}
