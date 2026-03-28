import { RegistryClient } from './registry.client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RegistryClient', () => {
  let client: RegistryClient;

  beforeEach(() => {
    process.env.REGISTRY_URL = 'http://registry:3001';
    process.env.INTERNAL_SECRET = 'secret';
    client = new RegistryClient();
  });

  it('resolves tenant by API key', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({
      data: { id: 'tenant1', name: 'Vesprini', webhookUrl: null },
    });
    const tenant = await client.resolveTenant('dp_abc123');
    expect(tenant).toEqual({ id: 'tenant1', name: 'Vesprini', webhookUrl: null });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://registry:3001/internal/tenant/by-api-key/dp_abc123',
      expect.objectContaining({ headers: { 'x-internal-secret': 'secret' } }),
    );
  });

  it('returns null for unknown key', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({ data: null });
    const tenant = await client.resolveTenant('bad_key');
    expect(tenant).toBeNull();
  });

  it('resolves tenant by ID', async () => {
    mockedAxios.get = jest.fn().mockResolvedValue({
      data: { id: 'tenant1', name: 'Vesprini', webhookUrl: 'https://example.com/webhook' },
    });
    const tenant = await client.resolveTenantById('tenant1');
    expect(tenant).toEqual({ id: 'tenant1', name: 'Vesprini', webhookUrl: 'https://example.com/webhook' });
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://registry:3001/internal/tenant/tenant1',
      expect.objectContaining({ headers: { 'x-internal-secret': 'secret' } }),
    );
  });

  it('returns null if resolveTenantById fails', async () => {
    mockedAxios.get = jest.fn().mockRejectedValue(new Error('404'));
    const tenant = await client.resolveTenantById('nonexistent');
    expect(tenant).toBeNull();
  });
});
