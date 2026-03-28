import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

@Injectable()
export class StorageService {
  private readonly uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async save(documentId: string, buffer: Buffer, mimeType: string): Promise<string> {
    const ext = MIME_TO_EXT[mimeType] ?? '.bin';
    const filename = `${documentId}${ext}`;
    const fullPath = path.join(this.uploadsDir, filename);
    await fs.promises.writeFile(fullPath, buffer);
    return `uploads/${filename}`;
  }

  getUrl(filePath: string): string {
    const ext = path.extname(filePath);
    const documentId = path.basename(filePath, ext);
    return `/v1/files/${documentId}`;
  }
}
