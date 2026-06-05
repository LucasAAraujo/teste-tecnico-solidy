import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppLayout } from '@/shared/components/layout/AppLayout'
import { useAuthStore } from '@/modules/auth/store/auth.store'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { RegisterPage } from '@/modules/auth/pages/RegisterPage'
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage'
import { ContractsListPage } from '@/modules/contracts/pages/ContractsListPage'
import { NewContractPage } from '@/modules/contracts/pages/NewContractPage'
import { ContractDetailPage } from '@/modules/contracts/pages/ContractDetailPage'
import { ContractManagerPage } from '@/modules/contracts/pages/ContractManagerPage'
import { TemplatesListPage } from '@/modules/templates/pages/TemplatesListPage'
import { SignaturesQueuePage } from '@/modules/signatures/pages/SignaturesQueuePage'

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
          <Route path="/contracts" element={<ContractsListPage />} />
          <Route path="/contracts/new" element={<NewContractPage />} />
          <Route path="/contracts/manager" element={<ContractManagerPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
          <Route path="/templates" element={<TemplatesListPage />} />
          <Route path="/signatures/queue" element={<SignaturesQueuePage />} />
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
