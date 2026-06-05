import { useState } from 'react'
import { Modal, Button, Input, Select } from '@/shared/components/ui'
import { api } from '@/shared/lib/api'

interface SendSignatureModalProps {
  contractId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const CHANNEL_OPTIONS = [
  { value: 'EMAIL',     label: 'E-mail'              },
  { value: 'WHATSAPP',  label: 'WhatsApp'             },
  { value: 'BOTH',      label: 'E-mail + WhatsApp'   },
]

const EXPIRES_OPTIONS = [
  { value: '3',  label: '3 dias'  },
  { value: '7',  label: '7 dias'  },
  { value: '14', label: '14 dias' },
  { value: '30', label: '30 dias' },
]

interface SignatureForm {
  signerName: string
  signerEmail: string
  signerPhone: string
  channel: string
  expiresInDays: string
}

const EMPTY: SignatureForm = {
  signerName: '',
  signerEmail: '',
  signerPhone: '',
  channel: 'EMAIL',
  expiresInDays: '7',
}

export function SendSignatureModal({
  contractId,
  open,
  onClose,
  onSuccess,
}: SendSignatureModalProps) {
  const [form, setForm] = useState<SignatureForm>(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function setField(key: keyof SignatureForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
  }

  function handleClose() {
    setForm(EMPTY)
    setError('')
    onClose()
  }

  async function handleSend() {
    setError('')

    if (!form.signerName.trim()) {
      setError('Nome do signatário é obrigatório.')
      return
    }
    if ((form.channel === 'EMAIL' || form.channel === 'BOTH') && !form.signerEmail.trim()) {
      setError('E-mail é obrigatório para canal E-mail.')
      return
    }
    if ((form.channel === 'WHATSAPP' || form.channel === 'BOTH') && !form.signerPhone.trim()) {
      setError('Telefone é obrigatório para canal WhatsApp.')
      return
    }

    setLoading(true)
    try {
      await api.post(`/contracts/${contractId}/signatures`, {
        signerName: form.signerName.trim(),
        signerEmail: form.signerEmail.trim() || undefined,
        signerPhone: form.signerPhone.trim() || undefined,
        channel: form.channel,
        expiresInDays: parseInt(form.expiresInDays) || 7,
      })
      setForm(EMPTY)
      onSuccess()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Erro ao enviar solicitação de assinatura.')
    } finally {
      setLoading(false)
    }
  }

  const needEmail = form.channel === 'EMAIL' || form.channel === 'BOTH'
  const needPhone = form.channel === 'WHATSAPP' || form.channel === 'BOTH'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Enviar para Assinatura"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSend} loading={loading}>
            Enviar solicitação
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome do signatário"
          value={form.signerName}
          onChange={(e) => setField('signerName', e.target.value)}
          placeholder="João Silva"
          required
          autoFocus
        />
        <Select
          label="Canal de envio"
          value={form.channel}
          onChange={(e) => setField('channel', e.target.value)}
          options={CHANNEL_OPTIONS}
          required
        />
        {needEmail && (
          <Input
            label="E-mail"
            type="email"
            value={form.signerEmail}
            onChange={(e) => setField('signerEmail', e.target.value)}
            placeholder="joao@empresa.com"
            required
          />
        )}
        {needPhone && (
          <Input
            label="Telefone (WhatsApp)"
            value={form.signerPhone}
            onChange={(e) => setField('signerPhone', e.target.value)}
            placeholder="+55 11 99999-9999"
            required
          />
        )}
        <Select
          label="Prazo para assinar"
          value={form.expiresInDays}
          onChange={(e) => setField('expiresInDays', e.target.value)}
          options={EXPIRES_OPTIONS}
        />

        {error && (
          <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}
