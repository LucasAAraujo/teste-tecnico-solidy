import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface TopBarProps {
  companyName?: string
  userName?: string
}

export function TopBar({ companyName = 'Solidy', userName = 'Usuário' }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="flex h-16 items-center justify-between border-b border-secondary-200 bg-white px-6">
      {/* Nome da empresa */}
      <span className="text-sm font-medium text-secondary-500">{companyName}</span>

      {/* Menu do usuário */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary-100 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-semibold">
            {initials}
          </div>
          <span className="text-sm font-medium text-secondary-700">{userName}</span>
          <svg className="h-4 w-4 text-secondary-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white border border-secondary-200 shadow-lg py-1 z-20">
            <button
              onClick={() => { navigate('/profile'); setMenuOpen(false) }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Meu perfil
            </button>
            <div className="my-1 border-t border-secondary-100" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
