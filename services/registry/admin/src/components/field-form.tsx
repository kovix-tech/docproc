'use client'

import { useState } from 'react'
import { FieldSchema, CreateFieldDto } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const FIELD_TYPES = ['text', 'number', 'date', 'enum', 'boolean'] as const

interface FormState {
  key: string
  label: string
  type: FieldSchema['type']
  description: string
  required: boolean
  enumOptionsRaw: string
}

export function FieldForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<FieldSchema>
  onSave: (dto: CreateFieldDto) => void
  onCancel: () => void
  loading?: boolean
}) {
  const [form, setForm] = useState<FormState>({
    key: initial?.key ?? '',
    label: initial?.label ?? '',
    type: initial?.type ?? 'text',
    description: initial?.description ?? '',
    required: initial?.required ?? false,
    enumOptionsRaw: initial?.enumOptions?.join(', ') ?? '',
  })

  const isEditing = !!initial?.id

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const enumOptions =
      form.type === 'enum'
        ? form.enumOptionsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : null
    onSave({
      key: form.key,
      label: form.label,
      type: form.type,
      description: form.description,
      required: form.required,
      enumOptions,
    })
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="key">Key *</Label>
          <Input
            id="key"
            value={form.key}
            onChange={(e) => set('key', e.target.value)}
            placeholder="numero_remito"
            required
            disabled={isEditing}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">Label *</Label>
          <Input
            id="label"
            value={form.label}
            onChange={(e) => set('label', e.target.value)}
            placeholder="Número de Remito"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={(v) => set('type', v as FieldSchema['type'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3 pt-7">
          <Switch
            id="required"
            checked={form.required}
            onCheckedChange={(v) => set('required', v)}
          />
          <Label htmlFor="required">Requerido</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción para el AI</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          placeholder="Describe qué es este campo para ayudar al modelo a extraerlo..."
        />
      </div>

      {form.type === 'enum' && (
        <div className="space-y-2">
          <Label htmlFor="enumOptions">Opciones (separadas por coma)</Label>
          <Input
            id="enumOptions"
            value={form.enumOptionsRaw}
            onChange={(e) => set('enumOptionsRaw', e.target.value)}
            placeholder="congelado, refrigerado, seco"
          />
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
