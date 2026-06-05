import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface AppLayoutProps {
  companyName?: string
  userName?: string
}

export function AppLayout({ companyName, userName }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-secondary-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar companyName={companyName} userName={userName} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
