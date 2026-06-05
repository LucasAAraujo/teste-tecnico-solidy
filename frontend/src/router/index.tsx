import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { useAuthStore } from '@/modules/auth/store/auth.store'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'

function PrivateRoute() {
  const token = useAuthStore((s) => s.token)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-secondary-400">
      <p className="text-lg">{name} — em construção</p>
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protegidas */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/contracts" element={<ComingSoon name="Contratos" />} />
          <Route path="/contracts/:id" element={<ComingSoon name="Contrato" />} />
          <Route path="/templates" element={<ComingSoon name="Templates" />} />
          <Route path="/obras" element={<ComingSoon name="Obras" />} />
          <Route path="/obras/:id" element={<ComingSoon name="Obra" />} />
          <Route path="/purchase-orders" element={<ComingSoon name="Ordens de Compra" />} />
          <Route path="/reports" element={<ComingSoon name="Relatórios" />} />
          <Route path="/settings" element={<ComingSoon name="Configurações" />} />
          <Route path="/profile" element={<ComingSoon name="Perfil" />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
