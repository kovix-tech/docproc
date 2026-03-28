import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DocumentType } from '../database/models/document-type.model';
import { FieldSchema } from '../database/models/field-schema.model';
import { DocumentTypesController } from './document-types.controller';
import { DocumentTypesService } from './document-types.service';
import { PromptModule } from '../prompt/prompt.module';

@Module({
  imports: [SequelizeModule.forFeature([DocumentType, FieldSchema]), PromptModule],
  controllers: [DocumentTypesController],
  providers: [DocumentTypesService],
  exports: [DocumentTypesService],
})
export class DocumentTypesModule {}
