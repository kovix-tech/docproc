import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

interface ExtractionInput {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';
  prompt: string;
  model: string;
}

interface ExtractionOutput {
  fields: Record<string, unknown>;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  parseError?: string;
}

@Injectable()
export class ExtractorService {
  private readonly client = new Anthropic();

  async extract(input: ExtractionInput): Promise<ExtractionOutput> {
    const response = await this.client.messages.create({
      model: input.model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: input.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: input.imageBase64,
              },
            },
            { type: 'text', text: input.prompt },
          ],
        },
      ],
    });

    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    let fields: Record<string, unknown> = {};
    let parseError: string | undefined;

    try {
      // Extraer JSON aunque haya texto extra
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        fields = JSON.parse(jsonMatch[0]);
      } else {
        parseError = 'No JSON found in response';
      }
    } catch (e) {
      parseError = (e as Error).message;
    }

    return {
      fields,
      modelUsed: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      parseError,
    };
  }
}
