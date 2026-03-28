import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import type { WebhookPayload } from '@docproc/api-contracts';
import { Document } from '../database/models/document.model';
import { ExtractionField } from '../database/models/extraction-field.model';
import { ExtractorService } from '../extractor/extractor.service';
import { RegistryClient } from '../registry/registry.client';
import { StorageService } from '../storage/storage.service';
import { WebhookService } from '../webhook/webhook.service';
import { PatchFieldsDto } from './dto/patch-fields.dto';

const WEBHOOK_EVENTS: Record<string, WebhookPayload['event']> = {
  processed: 'document.processed',
  confirmed: 'document.confirmed',
  rejected: 'document.rejected',
};

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document) private readonly docModel: typeof Document,
    @InjectModel(ExtractionField) private readonly fieldModel: typeof ExtractionField,
    private readonly extractor: ExtractorService,
    private readonly registry: RegistryClient,
    private readonly storage: StorageService,
    private readonly webhook: WebhookService,
  ) {}

  async create(tenantId: string, documentTypeId: string, fileBuffer: Buffer, mimeType: string): Promise<Document> {
    const doc = await this.docModel.create({
      tenantId,
      documentTypeId,
      status: 'processing',
    });

    const filePath = await this.storage.save(doc.id, fileBuffer, mimeType);
    const fileUrl = this.storage.getUrl(filePath);
    await doc.update({ filePath, fileUrl });

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

      const newStatus = result.parseError ? 'error' : 'processed';
      await doc.update({
        status: newStatus,
        aiModelUsed: result.modelUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        errorMessage: result.parseError ?? null,
      });

      if (newStatus === 'processed') {
        this.fireWebhook(doc).catch((e) => console.error(`Webhook error for ${docId}:`, e));
      }
    } catch (e) {
      await doc.update({ status: 'error', errorMessage: (e as Error).message });
    }
  }

  private async fireWebhook(doc: Document): Promise<void> {
    const event = WEBHOOK_EVENTS[doc.status];
    if (!event) return;
    const tenant = await this.registry.resolveTenantById(doc.tenantId);
    if (!tenant?.webhookUrl) return;
    await this.webhook.dispatch(tenant.webhookUrl, {
      event,
      documentId: doc.id,
      tenantId: doc.tenantId,
      documentTypeId: doc.documentTypeId,
      status: doc.status,
      timestamp: new Date().toISOString(),
    });
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
    await this.findById(id, tenantId);
    await Promise.all(
      Object.entries(dto.fields).map(([key, value]) =>
        this.fieldModel.update({ value, corrected: true }, { where: { documentId: id, key } }),
      ),
    );
    return this.findById(id, tenantId);
  }

  async confirm(id: string, tenantId: string): Promise<Document> {
    const doc = await this.findById(id, tenantId);
    const updated = await doc.update({ status: 'confirmed' });
    this.fireWebhook(updated).catch((e) => console.error(`Webhook error for ${id}:`, e));
    return updated;
  }

  async reject(id: string, tenantId: string): Promise<Document> {
    const doc = await this.findById(id, tenantId);
    const updated = await doc.update({ status: 'rejected', errorMessage: null });
    this.fireWebhook(updated).catch((e) => console.error(`Webhook error for ${id}:`, e));
    return updated;
  }
}
