import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'USER' | 'VIEWER'
  companyId: string
  active: boolean
  company?: { id: string; name: string; cnpj: string }
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (token, user) => {
        localStorage.setItem('token', token)
        set({ token, user })
      },
      logout: () => {
        localStorage.removeItem('token')
        set({ token: null, user: null })
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'solidy-auth',
      onRehydrateStorage: () => (state) => {
        // Sincroniza a chave 'token' usada pelo interceptor do axios
        if (state?.token) {
          localStorage.setItem('token', state.token)
        }
      },
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
