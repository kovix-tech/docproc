const BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  webhookUrl: string | null
  createdAt: string
}

export interface DocumentType {
  id: string
  tenantId: string
  name: string
  description: string | null
  model: string
  promptOverride: string | null
  active: boolean
  fields?: FieldSchema[]
  createdAt: string
}

export interface FieldSchema {
  id: string
  documentTypeId: string
  key: string
  label: string
  type: 'text' | 'number' | 'date' | 'enum' | 'boolean'
  description: string
  required: boolean
  enumOptions: string[] | null
  order: number
}

export interface CreateTenantDto {
  name: string
  webhookUrl?: string
}

export interface CreateDocumentTypeDto {
  tenantId: string
  name: string
  description?: string
  model?: string
}

export interface CreateFieldDto {
  key: string
  label: string
  type: FieldSchema['type']
  description?: string
  required?: boolean
  enumOptions?: string[] | null
}

// ── API client ─────────────────────────────────────────────────────────────

export const api = {
  tenants: {
    list: () =>
      req<Tenant[]>('GET', '/tenants'),
    get: (id: string) =>
      req<Tenant>('GET', `/tenants/${id}`),
    create: (dto: CreateTenantDto) =>
      req<{ id: string; name: string; apiKey: string; webhookUrl: string | null }>('POST', '/tenants', dto),
  },
  documentTypes: {
    list: (tenantId: string) =>
      req<DocumentType[]>('GET', `/document-types?tenantId=${tenantId}`),
    get: (id: string) =>
      req<DocumentType>('GET', `/document-types/${id}`),
    create: (dto: CreateDocumentTypeDto) =>
      req<DocumentType>('POST', '/document-types', dto),
    addField: (docTypeId: string, dto: CreateFieldDto) =>
      req<FieldSchema>('POST', `/document-types/${docTypeId}/fields`, dto),
    updateField: (fieldId: string, dto: Partial<CreateFieldDto>) =>
      req<FieldSchema>('PATCH', `/document-types/fields/${fieldId}`, dto),
    deleteField: (fieldId: string) =>
      req<void>('DELETE', `/document-types/fields/${fieldId}`),
    reorderFields: (docTypeId: string, fieldIds: string[]) =>
      req<void>('PATCH', `/document-types/${docTypeId}/fields/reorder`, { fieldIds }),
    promptPreview: (docTypeId: string) =>
      req<{ prompt: string; hasOverride: boolean }>('GET', `/document-types/${docTypeId}/prompt-preview`),
    updatePromptOverride: (docTypeId: string, promptOverride: string | null) =>
      req<void>('PATCH', `/document-types/${docTypeId}/prompt-override`, { promptOverride }),
  },
}
