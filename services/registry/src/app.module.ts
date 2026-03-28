import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { TenantsModule } from './tenants/tenants.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [DatabaseModule, TenantsModule, DocumentTypesModule, InternalModule],
})
export class AppModule {}
