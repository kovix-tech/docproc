import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalAuthGuard } from './internal-auth.guard';
import { DocumentTypesService } from '../document-types/document-types.service';
import { TenantsService } from '../tenants/tenants.service';
import { PromptBuilderService } from '../prompt/prompt-builder.service';
import type { ResolvedSchema } from '@docproc/api-contracts';

@Controller('internal')
@UseGuards(InternalAuthGuard)
export class InternalController {
  constructor(
    private readonly dtService: DocumentTypesService,
    private readonly tenantsService: TenantsService,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  // El core llama esto para obtener el schema completo de un tipo de documento
  @Get('schema/:documentTypeId')
  async resolveSchema(
    @Param('documentTypeId') documentTypeId: string,
  ): Promise<ResolvedSchema> {
    const dt = await this.dtService.findById(documentTypeId);
    const prompt = this.promptBuilder.buildOrOverride(dt.fields, dt.promptOverride);
    return {
      documentTypeId: dt.id,
      documentTypeName: dt.name,
      model: dt.model,
      prompt,
      fields: dt.fields.map((f) => ({
        id: f.id,
        key: f.key,
        label: f.label,
        type: f.type,
        description: f.description,
        required: f.required,
        enumOptions: f.enumOptions ?? undefined,
        order: f.order,
      })),
    };
  }

  // El core verifica la API key del tenant
  @Get('tenant/by-api-key/:rawKey')
  async resolveByApiKey(@Param('rawKey') rawKey: string) {
    const tenant = await this.tenantsService.resolveByApiKey(rawKey);
    if (!tenant) return null;
    return { id: tenant.id, name: tenant.name, webhookUrl: tenant.webhookUrl };
  }

  @Get('tenant/:id')
  async resolveById(@Param('id') id: string) {
    const tenant = await this.tenantsService.findById(id);
    return { id: tenant.id, name: tenant.name, webhookUrl: tenant.webhookUrl };
  }
}
