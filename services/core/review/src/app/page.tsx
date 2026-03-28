'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  ReviewData,
  ReviewField,
  confirmDocument,
  fetchReviewData,
  getDocumentIdFromToken,
  getFileUrl,
  patchFields,
  rejectDocument,
} from '@/lib/api'

type PageState = 'loading' | 'error' | 'invalid-token' | 'already-processed' | 'active'

export default function ReviewPage() {
  const [state, setState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [data, setData] = useState<ReviewData | null>(null)
  const [fields, setFields] = useState<ReviewField[]>([])
  const [submitting, setSubmitting] = useState(false)

  const tokenRef = useRef<string>('')
  const docIdRef = useRef<string>('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token') ?? ''
    tokenRef.current = token

    if (!token) {
      setState('invalid-token')
      return
    }

    const docId = getDocumentIdFromToken(token)
    if (!docId) {
      setState('invalid-token')
      return
    }
    docIdRef.current = docId

    fetchReviewData(docId, token)
      .then((d) => {
        setData(d)
        setFields(d.fields)
        if (d.status === 'confirmed' || d.status === 'rejected') {
          setState('already-processed')
        } else {
          setState('active')
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        if (
          msg.includes('401') ||
          msg.includes('revoked') ||
          msg.includes('expired')
        ) {
          setState('invalid-token')
        } else {
          setErrorMsg(msg)
          setState('error')
        }
      })
  }, [])

  function handleFieldChange(key: string, value: string) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)))
  }

  async function handleConfirm() {
    setSubmitting(true)
    try {
      const editedFields = fields.reduce<Record<string, string>>((acc, f) => {
        acc[f.key] = f.value ?? ''
        return acc
      }, {})
      await patchFields(docIdRef.current, tokenRef.current, editedFields)
      await confirmDocument(docIdRef.current, tokenRef.current)
      setState('already-processed')
      setData((d) => (d ? { ...d, status: 'confirmed' } : d))
      toast.success('Documento confirmado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al confirmar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReject() {
    if (!confirm('¿Rechazar este documento?')) return
    setSubmitting(true)
    try {
      await rejectDocument(docIdRef.current, tokenRef.current)
      setState('already-processed')
      setData((d) => (d ? { ...d, status: 'rejected' } : d))
      toast.success('Documento rechazado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al rechazar')
    } finally {
      setSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
          <p>Cargando documento...</p>
        </div>
      </div>
    )
  }

  if (state === 'invalid-token') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-4xl">⛔</div>
          <h1 className="text-xl font-semibold">Enlace inválido o expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este enlace ya fue utilizado, expiró, o no es válido. Solicitá un nuevo enlace de
            revisión.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold">Error de conexión</h1>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (state === 'already-processed') {
    const isConfirmed = data?.status === 'confirmed'
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-4xl">{isConfirmed ? '✅' : '❌'}</div>
          <h1 className="text-xl font-semibold">
            {isConfirmed ? 'Documento confirmado' : 'Documento rechazado'}
          </h1>
          <p className="text-sm text-muted-foreground">Este documento ya fue procesado.</p>
        </div>
      </div>
    )
  }

  // state === 'active'
  const fileUrl = data?.fileUrl ? getFileUrl(data.fileUrl, tokenRef.current) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3">
        <h1 className="text-base font-semibold">Revisión de Documento</h1>
      </header>

      <div className="flex flex-col md:flex-row md:h-[calc(100vh-53px)]">
        {/* Document preview */}
        <div className="md:flex-1 bg-muted/30 border-b md:border-b-0 md:border-r flex items-center justify-center p-4 min-h-[40vh] md:min-h-0">
          {fileUrl ? (
            data?.fileType === 'pdf' ? (
              <iframe
                src={fileUrl}
                className="w-full h-full min-h-[35vh] rounded border"
                title="Documento PDF"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileUrl}
                alt="Documento"
                className="max-w-full max-h-full object-contain rounded"
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">Sin imagen</p>
          )}
        </div>

        {/* Fields + actions */}
        <div className="md:w-80 lg:w-96 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Campos extraídos
            </h2>
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-sm font-medium capitalize">
                  {f.key.replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  value={f.value ?? ''}
                  onChange={(e) => handleFieldChange(f.key, e.target.value)}
                  className="w-full border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="border-t p-4 flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : '✓ Confirmar'}
            </button>
            <button
              onClick={handleReject}
              disabled={submitting}
              className="flex-1 bg-destructive text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
            >
              ✗ Rechazar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
