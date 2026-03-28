import * as fs from 'fs';
import { StorageService } from './storage.service';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    service = new StorageService();
  });

  it('saves buffer and returns relative filePath', async () => {
    const buffer = Buffer.from('test-content');
    const filePath = await service.save('doc-abc', buffer, 'image/jpeg');
    expect(filePath).toBe('uploads/doc-abc.jpg');
    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('doc-abc.jpg'),
      buffer,
    );
  });

  it('uses .pdf extension for PDF mime type', async () => {
    const buffer = Buffer.from('pdf-content');
    const filePath = await service.save('doc-pdf', buffer, 'application/pdf');
    expect(filePath).toBe('uploads/doc-pdf.pdf');
  });

  it('falls back to .bin for unknown mime type', async () => {
    const buffer = Buffer.from('data');
    const filePath = await service.save('doc-unk', buffer, 'application/octet-stream');
    expect(filePath).toBe('uploads/doc-unk.bin');
  });

  it('getUrl extracts documentId and returns /v1/files/:id', () => {
    expect(service.getUrl('uploads/doc-abc.jpg')).toBe('/v1/files/doc-abc');
    expect(service.getUrl('uploads/doc-pdf.pdf')).toBe('/v1/files/doc-pdf');
  });

  it('creates uploads dir if it does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    new StorageService();
    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('uploads'),
      { recursive: true },
    );
  });
});
