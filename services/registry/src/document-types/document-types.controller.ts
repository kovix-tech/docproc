import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentTypesService } from './document-types.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { CreateFieldSchemaDto } from './dto/create-field-schema.dto';
import { ReorderFieldsDto } from './dto/reorder-fields.dto';

@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly service: DocumentTypesService) {}

  @Post()
  create(@Body() dto: CreateDocumentTypeDto) {
    return this.service.create(dto);
  }

  @Get()
  findByTenant(@Query('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post(':id/fields')
  addField(@Param('id') id: string, @Body() dto: CreateFieldSchemaDto) {
    return this.service.addField(id, dto);
  }

  @Patch(':id/fields/reorder')
  reorderFields(@Param('id') id: string, @Body() dto: ReorderFieldsDto) {
    return this.service.reorderFields(id, dto);
  }

  @Patch('fields/:fieldId')
  updateField(@Param('fieldId') fieldId: string, @Body() dto: Partial<CreateFieldSchemaDto>) {
    return this.service.updateField(fieldId, dto);
  }

  @Delete('fields/:fieldId')
  deleteField(@Param('fieldId') fieldId: string) {
    return this.service.deleteField(fieldId);
  }

  @Get(':id/prompt-preview')
  promptPreview(@Param('id') id: string) {
    return this.service.getPromptPreview(id);
  }

  @Patch(':id/prompt-override')
  @HttpCode(204)
  async updatePromptOverride(
    @Param('id') id: string,
    @Body() body: { promptOverride: string | null },
  ) {
    await this.service.updatePromptOverride(id, body.promptOverride ?? null);
  }
}
