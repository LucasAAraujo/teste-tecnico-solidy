import { useEffect, useState, useCallback } from 'react'
import { api } from '@/shared/lib/api'
import { Badge, Button, Modal, Input, Spinner } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/format'
import { useAuthStore } from '@/modules/auth/store/auth.store'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'ADMIN' | 'USER' | 'VIEWER'

interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_CFG: Record<Role, { label: string; variant: 'default' | 'warning' | 'danger' }> = {
  ADMIN:  { label: 'Admin',        variant: 'danger'  },
  USER:   { label: 'Usuário',      variant: 'warning' },
  VIEWER: { label: 'Visualizador', variant: 'default' },
}

const ROLE_OPTIONS: Role[] = ['ADMIN', 'USER', 'VIEWER']

// ─── Component ────────────────────────────────────────────────────────────────

export function UsersManagementPage() {
  const currentUser = useAuthStore((s) => s.user)

  const [users, setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Invite modal
  const [inviteOpen, setInviteOpen]       = useState(false)
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviteRole, setInviteRole]       = useState<Role>('USER')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError]     = useState('')
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Role change (inline)
  const [editRoleId, setEditRoleId]     = useState<string | null>(null)
  const [editRoleVal, setEditRoleVal]   = useState<Role>('USER')
  const [roleLoading, setRoleLoading]   = useState(false)

  // Toggle active confirm
  const [toggleId, setToggleId]         = useState<string | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ users: User[] }>('/users')
      setUsers(res.data.users)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const isAdmin = currentUser?.role === 'ADMIN'

  // ── Invite ──────────────────────────────────────────────────────────────────

  function openInvite() {
    setInviteEmail('')
    setInviteRole('USER')
    setInviteError('')
    setInviteSuccess(false)
    setInviteOpen(true)
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('Informe um e-mail válido.')
      return
    }
    setInviteLoading(true)
    setInviteError('')
    try {
      await api.post('/users/invite', { email: inviteEmail.trim(), role: inviteRole })
      setInviteSuccess(true)
      fetchUsers()
    } catch (err: unknown) {
      setInviteError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao convidar usuário.'
      )
      setInviteLoading(false)
    }
  }

  // ── Role change ─────────────────────────────────────────────────────────────

  function startEditRole(u: User) {
    setEditRoleId(u.id)
    setEditRoleVal(u.role)
  }

  async function saveRole(userId: string) {
    setRoleLoading(true)
    try {
      await api.patch(`/users/${userId}`, { role: editRoleVal })
      setEditRoleId(null)
      fetchUsers()
    } finally {
      setRoleLoading(false)
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────────────

  const toggleTarget = users.find((u) => u.id === toggleId)

  async function handleToggleActive() {
    if (!toggleId || !toggleTarget) return
    setToggleLoading(true)
    try {
      await api.patch(`/users/${toggleId}`, { active: !toggleTarget.active })
      setToggleId(null)
      fetchUsers()
    } finally {
      setToggleLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-500">
          {users.length} usuário{users.length !== 1 ? 's' : ''} na empresa
          {' · '}
          {users.filter((u) => u.active).length} ativo{users.filter((u) => u.active).length !== 1 ? 's' : ''}
        </p>
        {isAdmin && (
          <Button size="sm" onClick={openInvite}>+ Convidar usuário</Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-secondary-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-secondary-100 bg-secondary-50">
              {['Nome', 'E-mail', 'Função', 'Status', 'Desde', isAdmin ? 'Ações' : ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id
              const isEditing = editRoleId === u.id
              const roleCfg = ROLE_CFG[u.role]

              return (
                <tr key={u.id} className={`hover:bg-secondary-50 transition-colors ${!u.active ? 'opacity-50' : ''}`}>
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-secondary-900">{u.name}</p>
                        {isSelf && <p className="text-xs text-secondary-400">Você</p>}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-secondary-600">{u.email}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRoleVal}
                          onChange={(e) => setEditRoleVal(e.target.value as Role)}
                          className="rounded border border-secondary-200 px-2 py-1 text-xs text-secondary-700 focus:border-primary-400 focus:outline-none"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>{ROLE_CFG[r].label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveRole(u.id)}
                          disabled={roleLoading}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                        >
                          {roleLoading ? '…' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditRoleId(null)}
                          className="text-xs text-secondary-400 hover:text-secondary-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <Badge variant={roleCfg.variant}>{roleCfg.label}</Badge>
                    )}
                  </td>

                  {/* Active status */}
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.active ? 'text-success-600' : 'text-secondary-400'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.active ? 'bg-success-400' : 'bg-secondary-300'}`} />
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-xs text-secondary-500 whitespace-nowrap">
                    {formatDate(u.createdAt)}
                  </td>

                  {/* Actions */}
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {!isSelf && (
                        <div className="flex items-center gap-3">
                          {!isEditing && (
                            <button
                              onClick={() => startEditRole(u)}
                              className="text-xs font-medium text-secondary-500 hover:text-secondary-800"
                            >
                              Alterar função
                            </button>
                          )}
                          <button
                            onClick={() => setToggleId(u.id)}
                            className={`text-xs font-medium ${u.active ? 'text-danger-500 hover:text-danger-700' : 'text-success-600 hover:text-success-700'}`}
                          >
                            {u.active ? 'Desativar' : 'Reativar'}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Convidar usuário"
        size="sm"
        footer={
          inviteSuccess ? (
            <Button onClick={() => setInviteOpen(false)}>Fechar</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} loading={inviteLoading}>Convidar</Button>
            </>
          )
        }
      >
        {inviteSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50">
              <svg className="h-6 w-6 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-secondary-800">Convite enviado!</p>
            <p className="text-xs text-secondary-500 text-center">
              O usuário receberá um e-mail com instruções para acessar a plataforma.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="usuario@empresa.com"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }}
              required
            />
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1.5">
                Função <span className="text-danger-500">*</span>
              </label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((r) => (
                  <label
                    key={r}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors ${inviteRole === r ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300'}`}
                  >
                    <input
                      type="radio"
                      name="invite-role"
                      value={r}
                      checked={inviteRole === r}
                      onChange={() => setInviteRole(r)}
                      className="hidden"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary-800">{ROLE_CFG[r].label}</p>
                      <p className="text-xs text-secondary-500 mt-0.5">
                        {r === 'ADMIN'  && 'Acesso total: gerenciar usuários, contratos, obras e configurações.'}
                        {r === 'USER'   && 'Acesso operacional: criar e editar contratos, obras e lançamentos.'}
                        {r === 'VIEWER' && 'Somente leitura: visualizar dados sem poder editá-los.'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {inviteError && (
              <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
                {inviteError}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Toggle active confirm */}
      <Modal
        open={!!toggleId}
        onClose={() => setToggleId(null)}
        title={toggleTarget?.active ? 'Desativar usuário' : 'Reativar usuário'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToggleId(null)}>Cancelar</Button>
            <Button
              variant={toggleTarget?.active ? 'danger' : 'primary'}
              onClick={handleToggleActive}
              loading={toggleLoading}
            >
              {toggleTarget?.active ? 'Desativar' : 'Reativar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-secondary-700">
          {toggleTarget?.active
            ? `Desativar ${toggleTarget?.name}? O usuário perderá acesso à plataforma imediatamente.`
            : `Reativar ${toggleTarget?.name}? O usuário voltará a ter acesso à plataforma.`}
        </p>
      </Modal>
    </div>
  )
}
