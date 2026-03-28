import { ExtractorService } from './extractor.service';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('ExtractorService', () => {
  let service: ExtractorService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    mockCreate = jest.fn().mockResolvedValue({
      model: 'claude-sonnet-4-20250514',
      content: [{ type: 'text', text: '{"numero_remito": "12345", "tipo_carga": "congelado"}' }],
      usage: { input_tokens: 100, output_tokens: 50 },
    });
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: { create: mockCreate },
    } as any));
    service = new ExtractorService();
  });

  it('calls Claude with the prompt and image, returns parsed fields', async () => {
    const result = await service.extract({
      imageBase64: 'base64data',
      mimeType: 'image/jpeg',
      prompt: 'Extrae los campos...',
      model: 'claude-sonnet-4-20250514',
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-sonnet-4-20250514',
    }));
    expect(result.fields).toMatchObject({ numero_remito: '12345', tipo_carga: 'congelado' });
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
    expect(result.modelUsed).toBe('claude-sonnet-4-20250514');
  });

  it('handles malformed JSON gracefully', async () => {
    mockCreate.mockResolvedValueOnce({
      model: 'claude-sonnet-4-20250514',
      content: [{ type: 'text', text: 'No pude extraer los datos' }],
      usage: { input_tokens: 50, output_tokens: 10 },
    });
    const result = await service.extract({
      imageBase64: 'base64data',
      mimeType: 'image/jpeg',
      prompt: 'Extrae...',
      model: 'claude-sonnet-4-20250514',
    });
    expect(result.fields).toEqual({});
    expect(result.parseError).toBeTruthy();
  });
});
