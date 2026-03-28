import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { ResolvedSchema } from '@docproc/api-contracts';

@Injectable()
export class RegistryClient {
  private readonly baseUrl = process.env.REGISTRY_URL ?? 'http://localhost:3001';
  private readonly secret: string;

  constructor() {
    const secret = process.env.INTERNAL_SECRET;
    if (!secret) throw new Error('INTERNAL_SECRET env var is required');
    this.secret = secret;
  }

  private get headers() {
    return { 'x-internal-secret': this.secret };
  }

  async resolveTenant(rawApiKey: string): Promise<{ id: string; name: string; webhookUrl: string | null } | null> {
    const res = await axios.get(`${this.baseUrl}/internal/tenant/by-api-key/${encodeURIComponent(rawApiKey)}`, { headers: this.headers });
    return res.data ?? null;
  }

  async resolveTenantById(tenantId: string): Promise<{ id: string; name: string; webhookUrl: string | null } | null> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/internal/tenant/${encodeURIComponent(tenantId)}`,
        { headers: this.headers },
      );
      return res.data ?? null;
    } catch {
      return null;
    }
  }

  async resolveSchema(documentTypeId: string): Promise<ResolvedSchema> {
    const res = await axios.get(`${this.baseUrl}/internal/schema/${documentTypeId}`, { headers: this.headers });
    return res.data;
  }
}
