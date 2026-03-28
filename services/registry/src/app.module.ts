import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [DatabaseModule, TenantsModule],
})
export class AppModule {}
