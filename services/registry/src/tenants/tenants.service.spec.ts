import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { TenantsService } from './tenants.service';
import { Tenant } from '../database/models/tenant.model';

const mockTenant = {
  id: 'tenant-uuid',
  name: 'Vesprini',
  apiKeyHash: 'hash123',
  webhookUrl: null,
  save: jest.fn(),
};

const mockTenantModel = {
  create: jest.fn().mockResolvedValue(mockTenant),
  findAll: jest.fn().mockResolvedValue([mockTenant]),
  findByPk: jest.fn().mockResolvedValue(mockTenant),
};

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getModelToken(Tenant), useValue: mockTenantModel },
      ],
    }).compile();
    service = module.get(TenantsService);
  });

  it('creates tenant and returns plaintext API key', async () => {
    const result = await service.create({ name: 'Vesprini' });
    expect(result.name).toBe('Vesprini');
    expect(result.apiKey).toMatch(/^dp_/); // El prefijo de nuestra API key
    expect(mockTenantModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Vesprini' }),
    );
  });

  it('findAll returns list of tenants', async () => {
    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Vesprini');
  });
});
