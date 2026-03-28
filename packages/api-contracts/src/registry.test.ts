import { FieldSchemaZ, ResolvedSchemaZ } from './registry';

describe('api-contracts / registry', () => {
  it('validates a valid FieldSchema', () => {
    const result = FieldSchemaZ.safeParse({
      id: 'f1',
      key: 'numero_remito',
      label: 'N° Remito',
      type: 'text',
      description: 'Número en la parte superior',
      required: true,
      order: 0,
    });
    expect(result.success).toBe(true);
  });

  it('validates enum field with options', () => {
    const result = FieldSchemaZ.safeParse({
      id: 'f2',
      key: 'tipo_carga',
      label: 'Tipo de Carga',
      type: 'enum',
      description: 'Tipo de carga',
      required: true,
      enumOptions: ['congelado', 'refrigerado', 'seco'],
      order: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects enum field without options', () => {
    const result = FieldSchemaZ.safeParse({
      id: 'f3',
      key: 'tipo_carga',
      label: 'Tipo de Carga',
      type: 'enum',
      description: 'Tipo de carga',
      required: true,
      order: 2,
    });
    expect(result.success).toBe(false);
  });

  it('validates a ResolvedSchema', () => {
    const result = ResolvedSchemaZ.safeParse({
      documentTypeId: 'dt1',
      documentTypeName: 'Remito',
      model: 'claude-sonnet-4-20250514',
      prompt: 'Extrae los campos del documento...',
      fields: [],
    });
    expect(result.success).toBe(true);
  });
});
