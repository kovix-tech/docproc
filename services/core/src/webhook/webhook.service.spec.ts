import axios from 'axios';
import { WebhookService } from './webhook.service';
import type { WebhookPayload } from '@docproc/api-contracts';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const payload: WebhookPayload = {
  event: 'document.confirmed',
  documentId: 'doc-1',
  tenantId: 'tenant-1',
  documentTypeId: 'dt-1',
  status: 'confirmed',
  timestamp: new Date().toISOString(),
};

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new WebhookService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches POST to the webhook URL with correct payload', async () => {
    mockedAxios.post = jest.fn().mockResolvedValue({ status: 200 });
    await service.dispatch('https://example.com/hook', payload);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://example.com/hook',
      payload,
      expect.objectContaining({ timeout: 5000 }),
    );
  });

  it('retries up to 3 times on failure and logs error', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('timeout'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const dispatchPromise = service.dispatch('https://example.com/hook', payload);
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);
    await dispatchPromise;

    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Webhook failed'),
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  it('succeeds on second attempt without logging error', async () => {
    mockedAxios.post = jest
      .fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValueOnce({ status: 200 });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const dispatchPromise = service.dispatch('https://example.com/hook', payload);
    await jest.advanceTimersByTimeAsync(1000);
    await dispatchPromise;

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('does not throw even after all retries fail', async () => {
    mockedAxios.post = jest.fn().mockRejectedValue(new Error('dead'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const dispatchPromise = service.dispatch('https://example.com/hook', payload);
    await jest.advanceTimersByTimeAsync(3000);
    await expect(dispatchPromise).resolves.toBeUndefined();
    consoleSpy.mockRestore();
  });
});
