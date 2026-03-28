import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [DatabaseModule, DocumentsModule, ReviewModule],
})
export class AppModule {}
