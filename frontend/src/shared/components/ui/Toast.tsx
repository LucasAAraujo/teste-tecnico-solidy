import { useEffect } from 'react'
import { useToastStore, type ToastItem, type ToastType } from '@/shared/store/toast.store'

// ─── Icons ────────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-danger-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  info: <InfoIcon />,
}

const BG: Record<ToastType, string> = {
  success: 'border-success-200 bg-success-50',
  error: 'border-danger-200 bg-danger-50',
  info: 'border-primary-200 bg-primary-50',
}

const TEXT: Record<ToastType, string> = {
  success: 'text-success-800',
  error: 'text-danger-800',
  info: 'text-primary-800',
}

// ─── Single Toast ─────────────────────────────────────────────────────────────

function Toast({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    return () => {}
  }, [])

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg w-80 ${BG[toast.type]}`}
      role="alert"
    >
      {ICONS[toast.type]}
      <p className={`flex-1 text-sm font-medium ${TEXT[toast.type]}`}>{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  )
}
