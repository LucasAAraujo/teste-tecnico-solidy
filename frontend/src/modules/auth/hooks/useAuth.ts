import { useAuthStore } from '../store/auth.store'

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const setUser = useAuthStore((s) => s.setUser)

  return {
    user,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    setUser,
  }
}
