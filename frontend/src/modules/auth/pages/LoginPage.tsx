import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/shared/lib/api'
import { Button, Input } from '@/shared/components/ui'
import { useAuthStore, type AuthUser } from '../store/auth.store'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const setUser = useAuthStore((s) => s.setUser)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        email: email.trim(),
        password,
      })
      const { token, user } = res.data
      login(token, user)

      // Busca dados completos do usuário com empresa
      try {
        const meRes = await api.get<AuthUser>('/auth/me')
        setUser(meRes.data)
      } catch {
        // não crítico — prossegue com dados base do login
      }

      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Credenciais inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white font-bold text-xl">
            S
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-secondary-900">Solidy Contracts</h1>
            <p className="mt-1 text-sm text-secondary-500">Faça login para continuar</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-secondary-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoComplete="email"
              autoFocus
            />
            <Input
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-secondary-500">
          Não tem conta?{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700">
            Criar empresa
          </Link>
        </p>
      </div>
    </div>
  )
}
