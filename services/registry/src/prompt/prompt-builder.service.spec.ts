import { PromptBuilderService } from './prompt-builder.service';

const fields = [
  { key: 'numero_remito', label: 'N° Remito', type: 'text', description: 'Número en la parte superior', required: true, order: 0, enumOptions: null },
  { key: 'tipo_carga', label: 'Tipo de Carga', type: 'enum', description: 'Tipo de carga', required: true, order: 1, enumOptions: ['congelado', 'refrigerado', 'seco'] },
  { key: 'destinatario', label: 'Destinatario', type: 'text', description: 'Nombre completo', required: false, order: 2, enumOptions: null },
];

describe('PromptBuilderService', () => {
  const svc = new PromptBuilderService();

  it('builds a prompt from field schemas', () => {
    const prompt = svc.build(fields as any);
    expect(prompt).toContain('numero_remito');
    expect(prompt).toContain('[requerido]');
    expect(prompt).toContain('congelado, refrigerado, seco');
    expect(prompt).toContain('[opcional]');
    expect(prompt).toContain('JSON');
  });

  it('returns override if provided', () => {
    const override = 'Mi prompt personalizado';
    const prompt = svc.buildOrOverride(fields as any, override);
    expect(prompt).toBe(override);
  });
});
