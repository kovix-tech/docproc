import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { ResolvedSchema } from '@docproc/api-contracts';

@Injectable()
export class RegistryClient {
  private readonly baseUrl = process.env.REGISTRY_URL ?? 'http://localhost:3001';
  private readonly secret = process.env.INTERNAL_SECRET ?? '';

  private get headers() {
    return { 'x-internal-secret': this.secret };
  }

  async resolveTenant(rawApiKey: string): Promise<{ id: string; name: string; webhookUrl: string | null } | null> {
    const res = await axios.get(`${this.baseUrl}/internal/tenant/by-api-key/${rawApiKey}`, { headers: this.headers });
    return res.data ?? null;
  }

  async resolveSchema(documentTypeId: string): Promise<ResolvedSchema> {
    const res = await axios.get(`${this.baseUrl}/internal/schema/${documentTypeId}`, { headers: this.headers });
    return res.data;
  }
}
