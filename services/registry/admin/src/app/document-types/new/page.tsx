'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const AI_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4 (recomendado)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (rápido)' },
  { value: 'claude-opus-4-6', label: 'Opus 4.6 (más potente)' },
]

function NewDocTypeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenantId') ?? ''
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [model, setModel] = useState(AI_MODELS[0].value)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const dt = await api.documentTypes.create({
        tenantId,
        name,
        description: description || undefined,
        model,
      })
      router.push(`/document-types/detail/?id=${dt.id}`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold">Nuevo Tipo de Documento</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label>Modelo AI</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creando...' : 'Crear'}
        </Button>
      </form>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando...</p>}>
      <NewDocTypeForm />
    </Suspense>
  )
}
