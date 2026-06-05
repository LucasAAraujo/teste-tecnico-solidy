import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/shared/lib/api'
import { Badge, Button, Modal, Spinner } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/format'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Photo {
  id: string
  url: string
  filename: string
}

interface Vistoria {
  id: string
  type: 'INITIAL' | 'FINAL'
  description: string
  createdAt: string
  photos: Photo[]
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ photos, index, onClose, onChange }: {
  photos: Photo[]
  index: number
  onClose: () => void
  onChange: (i: number) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onChange(Math.min(index + 1, photos.length - 1))
      if (e.key === 'ArrowLeft')  onChange(Math.max(index - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onClose, onChange])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Prev */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index - 1) }}
          className="absolute left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          ‹
        </button>
      )}

      {/* Image */}
      <img
        src={photos[index].url}
        alt={photos[index].filename}
        className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next */}
      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(index + 1) }}
          className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          ›
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {index + 1} / {photos.length}
      </div>
    </div>
  )
}

// ─── Photo Gallery ─────────────────────────────────────────────────────────────

function PhotoGallery({ obraId, vistoriaId, photos, onRefresh }: {
  obraId: string
  vistoriaId: string
  photos: Photo[]
  onRefresh: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const newPreviews = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    setPreviews(newPreviews)
  }

  function clearPreviews() {
    previews.forEach((p) => URL.revokeObjectURL(p.url))
    setPreviews([])
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpload() {
    if (!previews.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      previews.forEach((p) => formData.append('photos', p.file))
      await api.post(`/obras/${obraId}/vistorias/${vistoriaId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearPreviews()
      onRefresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    try {
      await api.delete(`/obras/${obraId}/vistorias/${vistoriaId}/photos/${photoId}`)
      onRefresh()
    } finally {
      setDeletingId(null) }
  }

  return (
    <div className="mt-3 space-y-3">
      {/* Existing photos */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-secondary-200 bg-secondary-50">
              <img
                src={p.url}
                alt={p.filename}
                className="h-full w-full cursor-pointer object-cover transition-opacity group-hover:opacity-80"
                onClick={() => setLightboxIndex(i)}
              />
              <button
                onClick={() => handleDelete(p.id)}
                disabled={deletingId === p.id}
                className="absolute top-1 right-1 hidden h-5 w-5 items-center justify-center rounded-full bg-danger-500 text-white group-hover:flex"
                title="Remover"
              >
                {deletingId === p.id
                  ? <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  : <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Previews before upload */}
      {previews.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-secondary-500">Pré-visualização ({previews.length} foto{previews.length !== 1 ? 's' : ''})</p>
          <div className="flex flex-wrap gap-2">
            {previews.map((p, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-dashed border-primary-300 bg-primary-50">
                <img src={p.url} alt={`preview-${i}`} className="h-full w-full object-cover opacity-80" />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={handleUpload} loading={uploading}>
              {uploading ? 'Enviando…' : `Enviar ${previews.length} foto${previews.length !== 1 ? 's' : ''}`}
            </Button>
            <Button size="sm" variant="secondary" onClick={clearPreviews}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Upload trigger */}
      {previews.length === 0 && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-secondary-300 px-3 py-1.5 text-xs font-medium text-secondary-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            Adicionar fotos
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </div>
  )
}

// ─── Vistoria Card ─────────────────────────────────────────────────────────────

function VistoriaCard({ v, obraId, onRefresh }: { v: Vistoria; obraId: string; onRefresh: () => void }) {
  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant={v.type === 'INITIAL' ? 'warning' : 'success'}>
          {v.type === 'INITIAL' ? 'Vistoria Inicial' : 'Vistoria Final'}
        </Badge>
        <span className="text-xs text-secondary-400">{formatDate(v.createdAt)}</span>
        <span className="text-xs text-secondary-400">· {v.photos.length} foto{v.photos.length !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-sm text-secondary-700 leading-relaxed">{v.description}</p>
      <PhotoGallery
        obraId={obraId}
        vistoriaId={v.id}
        photos={v.photos}
        onRefresh={onRefresh}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VistoriaForm({ obraId }: { obraId: string }) {
  const [vistorias, setVistorias] = useState<Vistoria[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ type: 'INITIAL' as 'INITIAL' | 'FINAL', description: '' })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Vistoria[]>(`/obras/${obraId}/vistorias`)
      setVistorias(res.data)
    } finally {
      setLoading(false)
    }
  }, [obraId])

  useEffect(() => { fetch() }, [fetch])

  async function handleCreate() {
    if (form.description.trim().length < 5) {
      setCreateError('Descrição deve ter pelo menos 5 caracteres.')
      return
    }
    setCreateLoading(true)
    setCreateError('')
    try {
      await api.post(`/obras/${obraId}/vistorias`, { type: form.type, description: form.description.trim() })
      setCreateOpen(false)
      fetch()
    } catch (err: unknown) {
      setCreateError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao criar vistoria.')
      setCreateLoading(false)
    }
  }

  const initial = vistorias.find((v) => v.type === 'INITIAL')
  const final   = vistorias.find((v) => v.type === 'FINAL')
  const hasComparativo = !!initial && !!final

  if (loading) {
    return <div className="flex h-40 items-center justify-center"><Spinner /></div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-500">
          {vistorias.length === 0
            ? 'Nenhuma vistoria registrada.'
            : `${vistorias.length} vistoria${vistorias.length !== 1 ? 's' : ''} · ${vistorias.reduce((n, v) => n + v.photos.length, 0)} foto${vistorias.reduce((n, v) => n + v.photos.length, 0) !== 1 ? 's' : ''}`}
        </p>
        <Button size="sm" onClick={() => { setForm({ type: 'INITIAL', description: '' }); setCreateError(''); setCreateOpen(true) }}>
          + Nova vistoria
        </Button>
      </div>

      {/* Empty state */}
      {vistorias.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-secondary-200 py-14 text-center">
          <svg className="mx-auto h-10 w-10 text-secondary-200" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
          </svg>
          <p className="mt-3 text-sm text-secondary-400">Registre a vistoria inicial para documentar o estado da obra</p>
          <button onClick={() => { setForm({ type: 'INITIAL', description: '' }); setCreateError(''); setCreateOpen(true) }}
            className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700">
            Registrar vistoria inicial →
          </button>
        </div>
      )}

      {/* Comparativo: ambas existem */}
      {hasComparativo && (
        <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
          <p className="text-xs font-semibold text-primary-700 mb-3">Comparativo inicial × final</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[initial!, final!].map((v) => (
              <div key={v.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={v.type === 'INITIAL' ? 'warning' : 'success'}>
                    {v.type === 'INITIAL' ? 'Inicial' : 'Final'}
                  </Badge>
                  <span className="text-xs text-secondary-400">{formatDate(v.createdAt)}</span>
                </div>
                {v.photos.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {v.photos.slice(0, 4).map((p) => (
                      <img key={p.id} src={p.url} alt={p.filename}
                        className="h-16 w-16 rounded-lg object-cover border border-secondary-200 cursor-pointer hover:opacity-90"
                      />
                    ))}
                    {v.photos.length > 4 && (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-secondary-200 bg-secondary-100 text-xs font-semibold text-secondary-600">
                        +{v.photos.length - 4}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-secondary-400">Sem fotos</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full vistoria cards */}
      <div className="space-y-4">
        {vistorias.map((v) => (
          <VistoriaCard key={v.id} v={v} obraId={obraId} onRefresh={fetch} />
        ))}
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova vistoria"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={createLoading}>Registrar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['INITIAL', 'FINAL'] as const).map((t) => (
                <label key={t}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 transition-colors ${
                    form.type === t
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <input type="radio" name="type" value={t} checked={form.type === t}
                    onChange={() => setForm((f) => ({ ...f, type: t }))} className="hidden" />
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${t === 'INITIAL' ? 'bg-warning-400' : 'bg-success-400'}`} />
                  <span className="text-sm font-medium text-secondary-800">
                    {t === 'INITIAL' ? 'Inicial' : 'Final'}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1.5">
              Descrição <span className="text-danger-500">*</span>
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setCreateError('') }}
              className="w-full rounded-lg border border-secondary-200 px-3 py-2 text-sm placeholder-secondary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="Descreva o estado atual: estrutura, acabamentos, pendências…"
            />
          </div>
          <p className="text-xs text-secondary-400">
            Após registrar, você poderá adicionar fotos diretamente no card da vistoria.
          </p>
          {createError && (
            <p className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-600">
              {createError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
