import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { DocumentTypesModule } from '../document-types/document-types.module';
import { TenantsModule } from '../tenants/tenants.module';
import { PromptModule } from '../prompt/prompt.module';

@Module({
  imports: [DocumentTypesModule, TenantsModule, PromptModule],
  controllers: [InternalController],
  providers: [],
})
export class InternalModule {}
