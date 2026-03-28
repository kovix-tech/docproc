'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api, DocumentType, FieldSchema, CreateFieldDto } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { SortableFieldList } from '@/components/sortable-field-list'
import { FieldForm } from '@/components/field-form'

type EditingField = FieldSchema | 'new' | null

function DocTypeDetailContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? ''

  const [docType, setDocType] = useState<DocumentType | null>(null)
  const [fields, setFields] = useState<FieldSchema[]>([])
  const [promptPreview, setPromptPreview] = useState('')
  const [useOverride, setUseOverride] = useState(false)
  const [overrideText, setOverrideText] = useState('')
  const [hasOverride, setHasOverride] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingOverride, setSavingOverride] = useState(false)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [fieldLoading, setFieldLoading] = useState(false)

  async function refreshPrompt() {
    const preview = await api.documentTypes.promptPreview(id)
    setPromptPreview(preview.prompt)
    setHasOverride(preview.hasOverride)
  }

  useEffect(() => {
    if (!id) return
    Promise.all([api.documentTypes.get(id), api.documentTypes.promptPreview(id)])
      .then(([dt, preview]) => {
        setDocType(dt)
        setFields(dt.fields ?? [])
        setPromptPreview(preview.prompt)
        setHasOverride(preview.hasOverride)
        setUseOverride(preview.hasOverride)
        if (dt.promptOverride) setOverrideText(dt.promptOverride)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  async function handleReorder(newFields: FieldSchema[]) {
    setFields(newFields)
    await api.documentTypes.reorderFields(id, newFields.map((f) => f.id))
    await refreshPrompt()
  }

  async function handleDeleteField(fieldId: string) {
    if (!confirm('¿Eliminar este campo?')) return
    await api.documentTypes.deleteField(fieldId)
    setFields((prev) => prev.filter((f) => f.id !== fieldId))
    await refreshPrompt()
  }

  async function handleSaveField(dto: CreateFieldDto) {
    setFieldLoading(true)
    try {
      if (editingField === 'new') {
        const newField = await api.documentTypes.addField(id, dto)
        setFields((prev) => [...prev, newField])
      } else if (editingField) {
        const updated = await api.documentTypes.updateField(editingField.id, dto)
        setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)))
      }
      setEditingField(null)
      await refreshPrompt()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setFieldLoading(false)
    }
  }

  async function handleSaveOverride() {
    setSavingOverride(true)
    try {
      const newOverride = useOverride ? overrideText : null
      await api.documentTypes.updatePromptOverride(id, newOverride)
      await refreshPrompt()
      if (!useOverride) setOverrideText('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
    } finally {
      setSavingOverride(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando...</p>
  if (!docType) return null

  const tenantId = docType.tenantId

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/tenants/detail/?id=${tenantId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Tenant
          </Link>
          <h1 className="text-2xl font-bold mt-1">{docType.name}</h1>
          {docType.description && (
            <p className="text-muted-foreground mt-1">{docType.description}</p>
          )}
        </div>
        <Button variant="outline" asChild>
          <Link href={`/document-types/test/?id=${id}`}>Probar extracción →</Link>
        </Button>
      </div>

      {/* Fields section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Campos ({fields.length})</h2>
          <Button size="sm" onClick={() => setEditingField('new')}>+ Agregar campo</Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center border rounded">
            Sin campos. Agrega el primero.
          </p>
        ) : (
          <SortableFieldList
            fields={fields}
            onReorder={handleReorder}
            onEdit={setEditingField}
            onDelete={handleDeleteField}
          />
        )}
      </div>

      <Separator />

      {/* Prompt section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Prompt</h2>
        <div className="flex items-center gap-3">
          <Switch id="override" checked={useOverride} onCheckedChange={setUseOverride} />
          <Label htmlFor="override">Usar prompt manual (override)</Label>
        </div>

        {useOverride ? (
          <div className="space-y-3">
            <Textarea
              value={overrideText}
              onChange={(e) => setOverrideText(e.target.value)}
              rows={8}
              placeholder="Escribí el prompt personalizado acá..."
            />
            <Button onClick={handleSaveOverride} disabled={savingOverride}>
              {savingOverride ? 'Guardando...' : 'Guardar override'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Prompt generado automáticamente desde los campos:</p>
            <pre className="text-sm bg-muted rounded p-4 whitespace-pre-wrap font-mono">
              {promptPreview || '(sin campos definidos)'}
            </pre>
            {hasOverride && (
              <Button variant="outline" size="sm" onClick={handleSaveOverride} disabled={savingOverride}>
                Limpiar override
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Field editing dialog */}
      <Dialog open={editingField !== null} onOpenChange={(open) => !open && setEditingField(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingField === 'new' ? 'Nuevo campo' : 'Editar campo'}
            </DialogTitle>
          </DialogHeader>
          <FieldForm
            initial={editingField !== 'new' && editingField !== null ? editingField : undefined}
            onSave={handleSaveField}
            onCancel={() => setEditingField(null)}
            loading={fieldLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando...</p>}>
      <DocTypeDetailContent />
    </Suspense>
  )
}
