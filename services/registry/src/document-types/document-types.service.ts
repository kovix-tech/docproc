import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DocumentType } from '../database/models/document-type.model';
import { FieldSchema } from '../database/models/field-schema.model';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { CreateFieldSchemaDto } from './dto/create-field-schema.dto';
import { ReorderFieldsDto } from './dto/reorder-fields.dto';
import { PromptBuilderService } from '../prompt/prompt-builder.service';

@Injectable()
export class DocumentTypesService {
  constructor(
    @InjectModel(DocumentType) private readonly dtModel: typeof DocumentType,
    @InjectModel(FieldSchema) private readonly fieldModel: typeof FieldSchema,
    private readonly promptBuilder: PromptBuilderService,
  ) {}

  async create(dto: CreateDocumentTypeDto): Promise<DocumentType> {
    return this.dtModel.create({ ...dto, active: true });
  }

  async findByTenant(tenantId: string): Promise<DocumentType[]> {
    return this.dtModel.findAll({
      where: { tenantId },
      include: [FieldSchema],
      order: [[FieldSchema, 'order', 'ASC']],
    });
  }

  async findById(id: string): Promise<DocumentType> {
    const dt = await this.dtModel.findByPk(id, {
      include: [FieldSchema],
      order: [[FieldSchema, 'order', 'ASC']],
    });
    if (!dt) throw new NotFoundException(`DocumentType ${id} not found`);
    return dt;
  }

  async addField(documentTypeId: string, dto: CreateFieldSchemaDto): Promise<FieldSchema> {
    return this.fieldModel.create({ ...dto, documentTypeId });
  }

  async updateField(fieldId: string, dto: Partial<CreateFieldSchemaDto>): Promise<FieldSchema> {
    const field = await this.fieldModel.findByPk(fieldId);
    if (!field) throw new NotFoundException(`FieldSchema ${fieldId} not found`);
    return field.update(dto);
  }

  async deleteField(fieldId: string): Promise<void> {
    const field = await this.fieldModel.findByPk(fieldId);
    if (!field) throw new NotFoundException(`FieldSchema ${fieldId} not found`);
    await field.destroy();
  }

  async reorderFields(documentTypeId: string, dto: ReorderFieldsDto): Promise<void> {
    await Promise.all(
      dto.fieldIds.map((id, index) =>
        this.fieldModel.update({ order: index }, { where: { id, documentTypeId } }),
      ),
    );
  }

  async getPromptPreview(id: string): Promise<{ prompt: string; hasOverride: boolean }> {
    const docType = await this.dtModel.findByPk(id, {
      include: [FieldSchema],
      order: [[FieldSchema, 'order', 'ASC']],
    });
    if (!docType) throw new NotFoundException(`DocumentType ${id} not found`);
    const hasOverride = !!docType.promptOverride;
    const prompt = this.promptBuilder.buildOrOverride(docType.fields ?? [], docType.promptOverride);
    return { prompt, hasOverride };
  }

  async updatePromptOverride(id: string, promptOverride: string | null): Promise<void> {
    const docType = await this.dtModel.findByPk(id);
    if (!docType) throw new NotFoundException(`DocumentType ${id} not found`);
    await docType.update({ promptOverride });
  }
}
