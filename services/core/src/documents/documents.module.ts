import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Document } from '../database/models/document.model';
import { ExtractionField } from '../database/models/extraction-field.model';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ExtractorService } from '../extractor/extractor.service';
import { RegistryClient } from '../registry/registry.client';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { StorageModule } from '../storage/storage.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [SequelizeModule.forFeature([Document, ExtractionField]), StorageModule, WebhookModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, ExtractorService, RegistryClient, ApiKeyGuard],
})
export class DocumentsModule {}
