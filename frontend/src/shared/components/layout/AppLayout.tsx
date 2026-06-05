import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useAuthStore } from '@/modules/auth/store/auth.store'

export function AppLayout() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="flex h-screen overflow-hidden bg-secondary-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar companyName={user?.company?.name} userName={user?.name} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
