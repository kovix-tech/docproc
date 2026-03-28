import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { DocumentTypesModule } from '../document-types/document-types.module';
import { TenantsModule } from '../tenants/tenants.module';
import { PromptBuilderService } from '../prompt/prompt-builder.service';

@Module({
  imports: [DocumentTypesModule, TenantsModule],
  controllers: [InternalController],
  providers: [PromptBuilderService],
})
export class InternalModule {}
