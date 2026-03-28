import {
  Body, Controller, Get, NotFoundException, Param,
  Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { CurrentTenant } from '../auth/tenant.decorator';
import { Document } from '../database/models/document.model';
import { ExtractionField } from '../database/models/extraction-field.model';
import { PatchFieldsDto } from '../documents/dto/patch-fields.dto';
import { StorageService } from '../storage/storage.service';
import { JwtReviewService } from './jwt-review.service';
import { ReviewTokenGuard } from './review-token.guard';

@Controller('documents')
export class ReviewController {
  constructor(
    @InjectModel(Document) private readonly docModel: typeof Document,
    @InjectModel(ExtractionField) private readonly fieldModel: typeof ExtractionField,
    private readonly jwtReviewService: JwtReviewService,
    private readonly storage: StorageService,
  ) {}

  @UseGuards(ApiKeyGuard)
  @Post(':id/review-token')
  async generateReviewToken(
    @CurrentTenant() tenant: { id: string },
    @Param('id') id: string,
  ) {
    const doc = await this.docModel.findOne({ where: { id, tenantId: tenant.id } });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    const { token, jti, expiresAt } = this.jwtReviewService.sign(id, tenant.id);
    await doc.update({ reviewTokenJti: jti });
    return { token, expiresAt };
  }

  @UseGuards(ReviewTokenGuard)
  @Get(':id/review-data')
  async getReviewData(@Req() req: Request) {
    const doc = (req as any).reviewDocument as Document;
    await doc.reload({ include: [ExtractionField] });
    return {
      status: doc.status,
      fileUrl: doc.filePath ? this.storage.getUrl(doc.filePath) : null,
      fileType: doc.filePath?.endsWith('.pdf') ? 'pdf' : 'image',
      fields: (doc.fields ?? []).map((f) => ({
        key: f.key,
        value: f.value,
        corrected: f.corrected,
      })),
    };
  }

  @UseGuards(ReviewTokenGuard)
  @Patch(':id/review-fields')
  async patchReviewFields(
    @Param('id') id: string,
    @Body() dto: PatchFieldsDto,
  ) {
    await Promise.all(
      Object.entries(dto.fields).map(([key, value]) =>
        this.fieldModel.update({ value, corrected: true }, { where: { documentId: id, key } }),
      ),
    );
    return { success: true };
  }

  @UseGuards(ReviewTokenGuard)
  @Post(':id/review-confirm')
  async reviewConfirm(@Req() req: Request) {
    const doc = (req as any).reviewDocument as Document;
    await doc.update({ status: 'confirmed', reviewTokenJti: null });
    return { status: 'confirmed' };
  }

  @UseGuards(ReviewTokenGuard)
  @Post(':id/review-reject')
  async reviewReject(@Req() req: Request) {
    const doc = (req as any).reviewDocument as Document;
    await doc.update({ status: 'rejected', reviewTokenJti: null });
    return { status: 'rejected' };
  }
}
