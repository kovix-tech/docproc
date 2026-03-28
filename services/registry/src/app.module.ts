import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { TenantsModule } from './tenants/tenants.module';
import { DocumentTypesModule } from './document-types/document-types.module';

@Module({
  imports: [DatabaseModule, TenantsModule, DocumentTypesModule],
})
export class AppModule {}
