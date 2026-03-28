'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function NewTenantPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await api.tenants.create({
        name,
        webhookUrl: webhookUrl || undefined,
      })
      setApiKey(result.apiKey)
      setCreatedId(result.id)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!apiKey) return
    void navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="max-w-md space-y-6">
        <h1 className="text-2xl font-bold">Nuevo Tenant</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook URL</Label>
            <Input
              id="webhook"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Tenant'}
          </Button>
        </form>
      </div>

      <Dialog open={!!apiKey}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Tenant creado — API Key</DialogTitle>
            <DialogDescription>
              Esta es la única vez que verás esta clave. Cópiala ahora.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <code className="block bg-muted rounded p-3 text-sm break-all select-all">
              {apiKey}
            </code>
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1">
                {copied ? '¡Copiado!' : 'Copiar'}
              </Button>
              <Button
                onClick={() => router.push(`/tenants/detail/?id=${createdId}`)}
                className="flex-1"
              >
                Listo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
