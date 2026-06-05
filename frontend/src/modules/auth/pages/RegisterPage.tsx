import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Button, Input } from '@/shared/components/ui'
import { useAuthStore, type AuthUser } from '../store/auth.store'

function formatCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

interface RegisterPayload {
  companyName: string
  cnpj: string
  name: string
  email: string
  password: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const setUser = useAuthStore((s) => s.setUser)

  const [form, setForm] = useState({
    companyName: '',
    cnpj: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: key === 'cnpj' ? formatCnpj(value) : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.companyName || !form.cnpj || !form.name || !form.email || !form.password) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      const payload: RegisterPayload = {
        companyName: form.companyName.trim(),
        cnpj: form.cnpj.replace(/\D/g, ''),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      }
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/register', payload)
      const { token, user } = res.data
      login(token, user)

      try {
        const meRes = await api.get<AuthUser>('/auth/me')
        setUser(meRes.data)
      } catch {
        // não crítico
      }

      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-xl">
            S
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-secondary-900">Solidy Contracts</h1>
            <p className="mt-1 text-sm text-secondary-500">Crie sua empresa e comece a gerenciar</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm border border-secondary-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dados da empresa */}
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-secondary-400">
                Dados da empresa
              </p>
              <div className="space-y-4">
                <Input
                  label="Razão social"
                  value={form.companyName}
                  onChange={(e) => set('companyName', e.target.value)}
                  placeholder="Construtora ABC Ltda"
                  autoFocus
                />
                <Input
                  label="CNPJ"
                  value={form.cnpj}
                  onChange={(e) => set('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            {/* Dados do admin */}
            <div className="border-t border-secondary-100 pt-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-secondary-400">
                Usuário administrador
              </p>
              <div className="space-y-4">
                <Input
                  label="Nome completo"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="João Silva"
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="joao@empresa.com"
                  autoComplete="email"
                />
                <Input
                  label="Senha"
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
                <Input
                  label="Confirmar senha"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => set('confirmPassword', e.target.value)}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Criar conta
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-secondary-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
