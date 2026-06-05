import { useEffect, useState } from 'react'
import { api } from '@/shared/lib/api'
import { Card, Button, Input, Spinner } from '@/shared/components/ui'
import { useAuthStore } from '@/modules/auth/store/auth.store'
import { UsersManagementPage } from './UsersManagementPage'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'empresa' | 'usuarios'

interface Company {
  id: string
  name: string
  cnpj: string
  createdAt: string
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

// ─── Sub-section: Company Settings ───────────────────────────────────────────

function CompanySettings() {
  const { user, setUser } = useAuthStore()

  const [company, setCompany]   = useState<Company | null>(null)
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState(false)
  const [name, setName]         = useState('')
  const [cnpj, setCnpj]         = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError]     = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    api.get<Company>('/companies/me')
      .then((res) => {
        setCompany(res.data)
        setName(res.data.name)
        setCnpj(res.data.cnpj)
      })
      .finally(() => setLoading(false))
  }, [])

  function startEdit() {
    if (!company) return
    setName(company.name)
    setCnpj(company.cnpj)
    setSaveError('')
    setSaveSuccess(false)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError('')
  }

  async function handleSave() {
    if (!name.trim()) { setSaveError('Informe o nome da empresa.'); return }
    setSaveLoading(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const res = await api.put<Company>('/companies/me', {
        name: name.trim(),
        cnpj: cnpj.trim(),
      })
      setCompany(res.data)
      setEditing(false)
      setSaveSuccess(true)
      // Update auth store so TopBar reflects new name
      if (user) {
        setUser({ ...user, company: { id: res.data.id, name: res.data.name, cnpj: res.data.cnpj } })
      }
    } catch (err: unknown) {
      setSaveError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao salvar configurações.'
      )
      setSaveLoading(false)
    }
  }

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  }

  if (!company) return null

  return (
    <div className="space-y-5 max-w-lg">
      <Card>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-secondary-800">Dados da empresa</h2>
            <p className="text-xs text-secondary-500 mt-0.5">Informações cadastrais exibidas nos contratos.</p>
          </div>
          {isAdmin && !editing && (
            <Button size="sm" variant="secondary" onClick={startEdit}>Editar</Button>
          )}
        </div>

        <div className="space-y-4">
          {editing ? (
            <>
              <Input
                label="Nome / Razão social"
                value={name}
                onChange={(e) => { setName(e.target.value); setSaveError('') }}
                required
              />
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1.5">CNPJ</label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(maskCnpj(e.target.value))}
                  placeholder="XX.XXX.XXX/XXXX-XX"
                  className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm font-mono focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
              </div>
              {saveError && (
                <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
                  {saveError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSave} loading={saveLoading}>Salvar</Button>
                <Button variant="secondary" onClick={cancelEdit}>Cancelar</Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2.5 border-b border-secondary-100">
                  <span className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Nome</span>
                  <span className="text-sm font-semibold text-secondary-900">{company.name}</span>
                </div>
                <div className="flex items-center justify-between py-2.5 border-b border-secondary-100">
                  <span className="text-xs font-medium text-secondary-500 uppercase tracking-wider">CNPJ</span>
                  <span className="text-sm font-mono text-secondary-700">{company.cnpj || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Cadastro em</span>
                  <span className="text-sm text-secondary-600">
                    {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              {saveSuccess && (
                <p className="rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700">
                  Dados atualizados com sucesso.
                </p>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Profile card (current user) */}
      <Card>
        <h2 className="text-sm font-semibold text-secondary-800 mb-4">Meu perfil</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-secondary-900">{user?.name}</p>
            <p className="text-sm text-secondary-500">{user?.email}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            user?.role === 'ADMIN'  ? 'bg-danger-50 text-danger-700'   :
            user?.role === 'USER'   ? 'bg-warning-50 text-warning-700' :
                                      'bg-secondary-100 text-secondary-600'
          }`}>
            {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'USER' ? 'Usuário' : 'Visualizador'}
          </span>
        </div>
      </Card>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'empresa',  label: 'Empresa'  },
  { key: 'usuarios', label: 'Usuários' },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('empresa')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-secondary-900">Configurações</h1>
        <p className="text-sm text-secondary-500">Gerencie os dados da empresa e os usuários da plataforma.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-secondary-200 gap-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'empresa'  && <CompanySettings />}
        {activeTab === 'usuarios' && <UsersManagementPage />}
      </div>
    </div>
  )
}
