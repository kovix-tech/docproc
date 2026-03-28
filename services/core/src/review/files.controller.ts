import { Controller, Get, NotFoundException, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import * as path from 'path';
import { Document } from '../database/models/document.model';
import { ReviewTokenGuard } from './review-token.guard';

@Controller('files')
export class FilesController {
  @UseGuards(ReviewTokenGuard)
  @Get(':id')
  serveFile(@Req() req: Request, @Res() res: Response) {
    const doc = (req as any).reviewDocument as Document;
    if (!doc.filePath) throw new NotFoundException('File not found');

    const uploadsDir = path.resolve('uploads');
    const fullPath = path.resolve(doc.filePath);

    // Guard against path traversal: resolved path must be inside uploads/
    if (!fullPath.startsWith(uploadsDir + path.sep) && fullPath !== uploadsDir) {
      throw new NotFoundException('File not found');
    }

    res.sendFile(fullPath);
  }
}
