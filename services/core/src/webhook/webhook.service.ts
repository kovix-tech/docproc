import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { WebhookPayload } from '@docproc/api-contracts';

const MAX_ATTEMPTS = 3;

@Injectable()
export class WebhookService {
  async dispatch(url: string, payload: WebhookPayload): Promise<void> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });
        return;
      } catch (e) {
        if (attempt === MAX_ATTEMPTS - 1) {
          console.error(`Webhook failed after ${MAX_ATTEMPTS} attempts to ${url}:`, e);
          return;
        }
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }
  }
}
