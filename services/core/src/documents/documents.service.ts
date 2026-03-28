import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Document } from '../database/models/document.model';
import { ExtractionField } from '../database/models/extraction-field.model';
import { ExtractorService } from '../extractor/extractor.service';
import { RegistryClient } from '../registry/registry.client';
import { PatchFieldsDto } from './dto/patch-fields.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document) private readonly docModel: typeof Document,
    @InjectModel(ExtractionField) private readonly fieldModel: typeof ExtractionField,
    private readonly extractor: ExtractorService,
    private readonly registry: RegistryClient,
  ) {}

  async create(tenantId: string, documentTypeId: string, fileBuffer: Buffer, mimeType: string): Promise<Document> {
    const doc = await this.docModel.create({
      tenantId,
      documentTypeId,
      status: 'processing',
    });

    // Process in background — respond quickly with the document ID
    this.processDocument(doc.id, documentTypeId, fileBuffer, mimeType as any).catch((e) => {
      console.error(`Error processing document ${doc.id}:`, e);
    });

    return doc;
  }

  private async processDocument(
    docId: string,
    documentTypeId: string,
    fileBuffer: Buffer,
    mimeType: any,
  ): Promise<void> {
    const doc = await this.docModel.findByPk(docId);
    if (!doc) return;

    try {
      const schema = await this.registry.resolveSchema(documentTypeId);
      const imageBase64 = fileBuffer.toString('base64');
      const result = await this.extractor.extract({
        imageBase64,
        mimeType,
        prompt: schema.prompt,
        model: schema.model,
      });

      const fieldEntries = schema.fields.map((f) => ({
        documentId: docId,
        key: f.key,
        value: result.fields[f.key] != null ? String(result.fields[f.key]) : null,
        confidence: null,
        corrected: false,
      }));
      await this.fieldModel.bulkCreate(fieldEntries);

      await doc.update({
        status: result.parseError ? 'error' : 'processed',
        aiModelUsed: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        errorMessage: result.parseError ?? null,
      });
    } catch (e) {
      await doc.update({ status: 'error', errorMessage: (e as Error).message });
    }
  }

  async findById(id: string, tenantId: string): Promise<Document> {
    const doc = await this.docModel.findOne({
      where: { id, tenantId },
      include: [ExtractionField],
    });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async findByTenant(tenantId: string): Promise<Document[]> {
    return this.docModel.findAll({
      where: { tenantId },
      include: [ExtractionField],
      order: [['createdAt', 'DESC']],
    });
  }

  async patchFields(id: string, tenantId: string, dto: PatchFieldsDto): Promise<Document> {
    await this.findById(id, tenantId); // Verify exists + belongs to tenant
    await Promise.all(
      Object.entries(dto.fields).map(([key, value]) =>
        this.fieldModel.update({ value, corrected: true }, { where: { documentId: id, key } }),
      ),
    );
    return this.findById(id, tenantId);
  }

  async confirm(id: string, tenantId: string): Promise<Document> {
    const doc = await this.findById(id, tenantId);
    return doc.update({ status: 'confirmed' });
  }

  async reject(id: string, tenantId: string): Promise<Document> {
    const doc = await this.findById(id, tenantId);
    return doc.update({ status: 'rejected', errorMessage: null });
  }
}
