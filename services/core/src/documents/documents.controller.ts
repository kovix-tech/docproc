import {
  Body, Controller, Get, Param, Patch, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentTenant } from '../auth/tenant.decorator';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { PatchFieldsDto } from './dto/patch-fields.dto';

@Controller('documents')
@UseGuards(ApiKeyGuard)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.create(tenant.id, dto.documentTypeId, file.buffer, file.mimetype);
  }

  @Get()
  findAll(@CurrentTenant() tenant: { id: string }) {
    return this.service.findByTenant(tenant.id);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.service.findById(id, tenant.id);
  }

  @Patch(':id/fields')
  patchFields(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
    @Body() dto: PatchFieldsDto,
  ) {
    return this.service.patchFields(id, tenant.id, dto);
  }

  @Post(':id/confirm')
  confirm(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.service.confirm(id, tenant.id);
  }

  @Post(':id/reject')
  reject(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.service.reject(id, tenant.id);
  }
}
