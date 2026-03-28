import { Injectable } from '@nestjs/common';
import { FieldSchema } from '../database/models/field-schema.model';

@Injectable()
export class PromptBuilderService {
  build(fields: FieldSchema[]): string {
    const sorted = [...fields].sort((a, b) => a.order - b.order);
    const lines = sorted.map((f) => {
      const req = f.required ? '[requerido]' : '[opcional]';
      const opts = f.enumOptions?.length ? ` Opciones: ${f.enumOptions.join(', ')}.` : '';
      return `- ${f.key} (${f.label}): ${f.description}${opts} ${req}`;
    });
    return [
      'Extrae los siguientes campos del documento y devolvé un JSON con exactamente estas claves:',
      '',
      ...lines,
      '',
      'Si un campo no está presente en el documento, usa null.',
      'Responde ÚNICAMENTE con el JSON, sin texto adicional.',
    ].join('\n');
  }

  buildOrOverride(fields: FieldSchema[], promptOverride?: string | null): string {
    return promptOverride?.trim() || this.build(fields);
  }
}
