import { Routes, Route, Navigate } from 'react-router-dom'

// Placeholder — páginas serão criadas nas etapas seguintes
function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen text-secondary-500">
      <p className="text-lg">{name} — em construção</p>
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<ComingSoon name="Login" />} />
      <Route path="/register" element={<ComingSoon name="Registro" />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ComingSoon name="Dashboard" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
