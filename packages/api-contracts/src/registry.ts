import { z } from 'zod';

export const FieldTypeZ = z.enum(['text', 'number', 'date', 'enum', 'boolean']);
export type FieldType = z.infer<typeof FieldTypeZ>;

export const FieldSchemaZ = z
  .object({
    id: z.string(),
    key: z.string().regex(/^[a-z][a-z0-9_]*$/, 'key debe ser snake_case'),
    label: z.string().min(1),
    type: FieldTypeZ,
    description: z.string(),
    required: z.boolean(),
    enumOptions: z.array(z.string()).optional(),
    order: z.number().int().min(0),
  })
  .refine(
    (f) => f.type !== 'enum' || (f.enumOptions && f.enumOptions.length > 0),
    { message: 'enum fields must have enumOptions', path: ['enumOptions'] },
  );
export type FieldSchema = z.infer<typeof FieldSchemaZ>;

export const AIModelZ = z.enum([
  'claude-sonnet-4-20250514',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-20250514',
]);
export type AIModel = z.infer<typeof AIModelZ>;

// Lo que el core recibe del registry cuando hace lookup
export const ResolvedSchemaZ = z.object({
  documentTypeId: z.string(),
  documentTypeName: z.string(),
  model: AIModelZ,
  prompt: z.string(), // Ya procesado: override o auto-generado
  fields: z.array(FieldSchemaZ),
});
export type ResolvedSchema = z.infer<typeof ResolvedSchemaZ>;

// Lo que el core envía al webhook del tenant
export const WebhookPayloadZ = z.object({
  event: z.enum(['document.processed', 'document.confirmed', 'document.rejected']),
  documentId: z.string(),
  tenantId: z.string(),
  documentTypeId: z.string(),
  status: z.string(),
  data: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime(),
});
export type WebhookPayload = z.infer<typeof WebhookPayloadZ>;
