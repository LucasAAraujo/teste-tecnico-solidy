import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignData {
  id: string
  signerName: string
  signerEmail: string | null
  signerPhone: string | null
  channel: 'EMAIL' | 'WHATSAPP' | 'BOTH'
  status: 'PENDING' | 'SIGNED' | 'EXPIRED'
  expiresAt: string
  contract: {
    id: string
    title: string
    category: string
    body: string
    status: string
    value: string | null
    startDate: string | null
    endDate: string | null
  }
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: SignData }
  | { kind: 'already_signed' }
  | { kind: 'expired' }
  | { kind: 'not_found' }
  | { kind: 'success'; signerName: string; contractTitle: string }
  | { kind: 'error'; message: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatCurrency(val: string | null | undefined): string {
  if (!val) return '—'
  const n = parseFloat(String(val))
  if (isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="mt-4 text-sm text-secondary-500">Carregando documento…</p>
      </div>
    </div>
  )
}

function AlreadySignedScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100">
          <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-secondary-900">Documento já assinado</h1>
        <p className="mt-2 text-sm text-secondary-500">
          Este documento já foi assinado anteriormente. Nenhuma ação adicional é necessária.
        </p>
      </div>
    </div>
  )
}

function ExpiredScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-100">
          <svg className="h-8 w-8 text-danger-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-secondary-900">Link expirado</h1>
        <p className="mt-2 text-sm text-secondary-500">
          O prazo para assinar este documento expirou. Entre em contato com o remetente para receber um novo link.
        </p>
      </div>
    </div>
  )
}

function NotFoundScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-secondary-100">
          <svg className="h-8 w-8 text-secondary-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-secondary-900">Link não encontrado</h1>
        <p className="mt-2 text-sm text-secondary-500">
          Este link de assinatura não foi encontrado. Verifique se copiou o endereço corretamente.
        </p>
      </div>
    </div>
  )
}

function SuccessScreen({ signerName, contractTitle }: { signerName: string; contractTitle: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-100">
          <svg className="h-10 w-10 text-success-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-secondary-900">Assinatura concluída!</h1>
        <p className="mt-3 text-sm text-secondary-600">
          Olá, <strong>{signerName}</strong>. Você assinou o documento
        </p>
        <p className="mt-1 text-base font-semibold text-secondary-900">"{contractTitle}"</p>
        <p className="mt-3 text-sm text-secondary-500">
          Sua assinatura foi registrada em {new Date().toLocaleString('pt-BR')}. Guarde este comprovante.
        </p>
        <div className="mt-6 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          Você pode fechar esta janela com segurança.
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SignPage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<PageState>({ kind: 'loading' })
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState('')

  useEffect(() => {
    if (!token) { setState({ kind: 'not_found' }); return }

    axios
      .get<SignData>(`${API_BASE}/api/sign/${token}`)
      .then((res) => setState({ kind: 'ready', data: res.data }))
      .catch((err) => {
        const status = err?.response?.status
        if (status === 409) setState({ kind: 'already_signed' })
        else if (status === 410) setState({ kind: 'expired' })
        else if (status === 404) setState({ kind: 'not_found' })
        else setState({ kind: 'error', message: err?.response?.data?.message ?? 'Erro ao carregar documento.' })
      })
  }, [token])

  async function handleSign() {
    if (!agreed || !token || state.kind !== 'ready') return
    setSigning(true)
    setSignError('')
    try {
      await axios.post(`${API_BASE}/api/sign/${token}`)
      setState({
        kind: 'success',
        signerName: state.data.signerName,
        contractTitle: state.data.contract.title,
      })
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } }
      const status = e?.response?.status
      if (status === 409) setState({ kind: 'already_signed' })
      else if (status === 410) setState({ kind: 'expired' })
      else setSignError(e?.response?.data?.message ?? 'Erro ao registrar assinatura.')
      setSigning(false)
    }
  }

  if (state.kind === 'loading')       return <LoadingScreen />
  if (state.kind === 'already_signed') return <AlreadySignedScreen />
  if (state.kind === 'expired')        return <ExpiredScreen />
  if (state.kind === 'not_found')      return <NotFoundScreen />
  if (state.kind === 'success')        return <SuccessScreen signerName={state.signerName} contractTitle={state.contractTitle} />

  if (state.kind === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
          <p className="text-sm text-danger-600">{state.message}</p>
        </div>
      </div>
    )
  }

  const { data } = state

  return (
    <div className="min-h-screen bg-secondary-50 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100">
              <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-secondary-400">Solicitação de Assinatura</p>
              <h1 className="mt-1 text-xl font-bold text-secondary-900 truncate">{data.contract.title}</h1>
              <p className="mt-0.5 text-sm text-secondary-500">{data.contract.category}</p>
            </div>
          </div>

          {/* Signer info */}
          <div className="mt-5 rounded-xl border border-secondary-100 bg-secondary-50 p-4">
            <p className="text-xs font-medium text-secondary-500">Você foi convidado para assinar como</p>
            <p className="mt-1 text-base font-semibold text-secondary-900">{data.signerName}</p>
            {data.signerEmail && (
              <p className="mt-0.5 text-xs text-secondary-500">{data.signerEmail}</p>
            )}
          </div>

          {/* Contract metadata */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Valor',      value: formatCurrency(data.contract.value) },
              { label: 'Início',     value: formatDate(data.contract.startDate) },
              { label: 'Vencimento', value: formatDate(data.contract.endDate)   },
              { label: 'Expira em',  value: formatDate(data.expiresAt)          },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-secondary-100 bg-white p-3">
                <p className="text-xs text-secondary-400">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-secondary-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contract body */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-secondary-700">Conteúdo do Contrato</h2>
          <div
            className="min-h-48 rounded-xl border border-secondary-100 bg-secondary-50 p-6 text-sm leading-relaxed text-secondary-800"
            dangerouslySetInnerHTML={{
              __html: data.contract.body || '<p class="text-secondary-400">Sem conteúdo.</p>',
            }}
          />
        </div>

        {/* Sign panel */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-secondary-700">Assinar documento</h2>

          {/* Agreement checkbox */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); setSignError('') }}
              className="mt-0.5 h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-700">
              Li e concordo com os termos do contrato acima. Compreendo que esta assinatura eletrônica
              tem validade jurídica conforme a MP 2.200-2/2001 e a Lei 14.063/2020.
            </span>
          </label>

          {signError && (
            <p className="mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {signError}
            </p>
          )}

          <button
            onClick={handleSign}
            disabled={!agreed || signing}
            className={[
              'mt-5 w-full rounded-xl py-3 text-sm font-semibold transition-colors',
              agreed && !signing
                ? 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
                : 'cursor-not-allowed bg-secondary-100 text-secondary-400',
            ].join(' ')}
          >
            {signing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Registrando assinatura…
              </span>
            ) : (
              'Assinar documento'
            )}
          </button>

          <p className="mt-3 text-center text-xs text-secondary-400">
            Ao clicar em "Assinar documento", sua assinatura eletrônica será registrada com data e hora.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-secondary-400 pb-4">
          Solidy Contracts · Assinatura Eletrônica Segura
        </p>

      </div>
    </div>
  )
}
