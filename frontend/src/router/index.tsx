import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/shared/components/layout/AppLayout'

// Guarda de rota — será conectada ao auth.store na Etapa 23
function PrivateRoute() {
  const token = localStorage.getItem('token')
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

// Placeholders — serão substituídos pelas páginas reais nas etapas seguintes
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
      <Route path="/login" element={<ComingSoon name="Login" />} />
      <Route path="/register" element={<ComingSoon name="Registro" />} />

      {/* Protegidas */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<ComingSoon name="Dashboard" />} />
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
