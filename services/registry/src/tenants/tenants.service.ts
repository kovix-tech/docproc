import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash, randomBytes } from 'crypto';
import { Tenant } from '../database/models/tenant.model';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(@InjectModel(Tenant) private readonly tenantModel: typeof Tenant) {}

  async create(dto: CreateTenantDto): Promise<{ name: string; id: string; apiKey: string; webhookUrl: string | null }> {
    const rawKey = `dp_${randomBytes(24).toString('hex')}`;
    const hash = createHash('sha256').update(rawKey).digest('hex');
    const tenant = await this.tenantModel.create({
      name: dto.name,
      apiKeyHash: hash,
      webhookUrl: dto.webhookUrl ?? null,
    });
    return { id: tenant.id, name: tenant.name, apiKey: rawKey, webhookUrl: tenant.webhookUrl };
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantModel.findAll();
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findByPk(id);
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async resolveByApiKey(rawKey: string): Promise<Tenant | null> {
    const hash = createHash('sha256').update(rawKey).digest('hex');
    return this.tenantModel.findOne({ where: { apiKeyHash: hash } });
  }
}
