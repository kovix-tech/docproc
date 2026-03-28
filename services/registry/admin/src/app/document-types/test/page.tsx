'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api, DocumentType } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const CORE_URL = process.env.NEXT_PUBLIC_CORE_URL ?? 'http://localhost:3002'
const TEST_API_KEY = process.env.NEXT_PUBLIC_TEST_API_KEY ?? ''

interface ExtractionField { key: string; value: string | null }
interface ExtractionResult { id: string; status: string; fields: ExtractionField[] }

function TestPageContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const [docType, setDocType] = useState<DocumentType | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    api.documentTypes.get(id).then(setDocType).catch(console.error)
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentTypeId', docType.id)

      const uploadRes = await fetch(`${CORE_URL}/v1/documents`, {
        method: 'POST',
        headers: { 'X-Api-Key': TEST_API_KEY },
        body: formData,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)
      const doc = await uploadRes.json() as { id: string }

      // Poll until processed (max 40s, 2s intervals)
      let attempts = 0
      const poll = async (): Promise<void> => {
        const updated = await fetch(`${CORE_URL}/v1/documents/${doc.id}`, {
          headers: { 'X-Api-Key': TEST_API_KEY },
        }).then((r) => r.json()) as ExtractionResult

        if (updated.status !== 'pending' || attempts++ >= 20) {
          setResult(updated)
          setLoading(false)
        } else {
          await new Promise((r) => setTimeout(r, 2000))
          return poll()
        }
      }
      await poll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }

  if (!docType) return <p className="text-muted-foreground">Cargando...</p>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/document-types/detail/?id=${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {docType.name}
        </Link>
        <h1 className="text-2xl font-bold mt-1">Probar extracción</h1>
      </div>

      {!TEST_API_KEY && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800">
          Configura <code>NEXT_PUBLIC_TEST_API_KEY</code> en{' '}
          <code>services/registry/admin/.env.local</code> para usar esta página.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="file">Documento (imagen o PDF)</Label>
          <Input
            id="file"
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </div>
        <Button type="submit" disabled={loading || !TEST_API_KEY}>
          {loading ? 'Procesando...' : 'Extraer'}
        </Button>
      </form>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Resultado</h2>
            <Badge variant={result.status === 'processed' ? 'default' : 'destructive'}>
              {result.status}
            </Badge>
          </div>
          <div className="border rounded divide-y">
            {result.fields?.map((f) => (
              <div key={f.key} className="flex items-start gap-4 p-3">
                <code className="text-sm font-medium w-40 shrink-0 text-muted-foreground">
                  {f.key}
                </code>
                <span className="text-sm flex-1">
                  {f.value ?? <span className="text-muted-foreground italic">null</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando...</p>}>
      <TestPageContent />
    </Suspense>
  )
}
